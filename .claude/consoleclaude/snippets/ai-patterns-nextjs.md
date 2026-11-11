# AI Patterns — Next.js / React

> **Compressione:** esempi → signature; le catene con → sono pseudo-codice da espandere. Non ha un reference con l'esempio completo: `.claude/consoleclaude/stacks/ai-integration.md` (se presente) ha principi e tabelle (provider, API Claude, use case), ma nessun esempio SDK.
> Versione di riferimento: Vercel AI SDK 6 (`ai`). Prima di aggiornare dalla 4.x o 5.x usa `npx @ai-sdk/codemod v6` e la migration guide.

## Setup

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/react zod  # o @ai-sdk/openai
# .env.local: ANTHROPIC_API_KEY=sk-ant-... (mai NEXT_PUBLIC_)
```

## Client AI

```typescript
// lib/ai.ts
export const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
export const DEFAULT_MODEL = 'claude-sonnet-5-5'
export const FAST_MODEL = 'claude-haiku-4-5'
```

Niente `temperature`: sui modelli Claude 5.x un valore non di default dà 400. Le opzioni specifiche di Anthropic (thinking, effort, cache) passano da `providerOptions.anthropic`.

## Route Handler API (streaming)

```typescript
// app/api/chat/route.ts
POST(req) → result.toUIMessageStreamResponse()
  → { messages }: { messages: UIMessage[] } = await req.json()
  → result = streamText({ model: anthropic(DEFAULT_MODEL), system, messages: await convertToModelMessages(messages), maxOutputTokens })
```

Quando: API chat per client esterni / hook `useChat`. È la strada per lo streaming.
- v5/v6: `maxOutputTokens` (non `maxTokens`), `convertToModelMessages` (async), `toUIMessageStreamResponse` (non `toDataStreamResponse`)
- `streamText` per output lunghi — mai `generateText` con l'utente in attesa

## Hook useChat

```typescript
'use client'
const [input, setInput] = useState('')
const { messages, sendMessage, status, error } = useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })
→ submit: sendMessage({ text: input }); setInput('')
→ UI: messages.map(m → m.parts.map(p → p.type === 'text' ? p.text : …))
→ Mostrare status e error nell'UI
```

Quando: chatbot conversazionale nel browser.
- `input` non è più gestito dall'hook; `append`→`sendMessage`, `reload`→`regenerate`
- I messaggi hanno `parts` (testo, tool, reasoning), non `content`

## Server Action (risposta singola)

```typescript
'use server'
summarize(text: string) → string
  → { text: out } = await generateText({ model: anthropic(DEFAULT_MODEL), system, prompt, maxOutputTokens })
  → return out
```

Quando: completamenti da form server-side senza streaming. Per lo streaming usa il Route Handler: `createStreamableValue` vive ora in `@ai-sdk/rsc`.
- `'use server'` obbligatorio in cima

## Structured Output

```typescript
const ExtractedDataSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()),
})

POST(req) → Response.json(output)
  → { output } = await generateText({ model, output: Output.object({ schema: ExtractedDataSchema }), system, prompt })
```

Quando: estrazione JSON validato da testo.
- v6: `generateObject`/`streamObject` sono deprecati → `generateText`/`streamText` con `output: Output.object(...)`; il risultato è `output` (in streaming `partialOutputStream`)
- Si compone con i tool nella stessa chiamata; schema Zod stretto al posto di `temperature: 0`

## Tool Use

```typescript
const searchUsersTool = tool({
  description: 'Cerca utenti',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => fetch(`/api/users?search=${query}`).then(r => r.json()),
})

POST(req) → streamText({ ..., tools: { searchUsers }, stopWhen: <limite di passi, es. 5> }).toUIMessageStreamResponse()
```

Quando: agente con accesso API interne.
- `inputSchema` (non `parameters`); `maxSteps` è sostituito da `stopWhen` con l'helper di conteggio passi (il nome è cambiato tra v5 e v6: vedi migration guide)
- Per un agente riusabile: `ToolLoopAgent` (v6; default 20 passi)
- Azioni con effetti: richiedi approvazione umana prima di eseguire il tool

## Hook useCompletion

```typescript
'use client'
const { completion, complete, isLoading } = useCompletion({ api: '/api/summarize' })
→ onClick: complete(text) | Mostra completion
```

Quando: completamenti one-shot (riassunti, traduzioni).

## Regole generali

- API key SOLO server-side — mai `NEXT_PUBLIC_`
- LLM sempre in Server Components / Server Actions / Route Handlers
- Gestire sempre `status` e `error` nell'UI; controllare il finish reason (`refusal`, `length`)
- Validare input prima di mandarlo all'LLM
