# /ai-integrate — Integra AI nel progetto

Guida all'integrazione di un modello LLM (Claude, GPT-4o) in un progetto esistente.
Analizza il codebase, propone l'architettura, genera il codice di integrazione.

## Istruzioni

### Step 1 — Raccolta contesto

1. Carica `@.claude/memory/MEMORY.md` se esiste
2. Identifica lo stack del progetto (da MEMORY.md o dall'utente)
3. Carica il modulo stack appropriato:
   - .NET → `@.claude/libs/stacks/dotnet.md` + `@.claude/libs/snippets/ai-patterns-dotnet.md`
   - Spring → `@.claude/libs/stacks/spring.md` + `@.claude/libs/snippets/ai-patterns-spring.md`
   - Next.js → `@.claude/libs/stacks/nextjs.md` + `@.claude/libs/snippets/ai-patterns-nextjs.md`
   - FastAPI → `@.claude/libs/stacks/fastapi.md` + `@.claude/libs/snippets/ai-patterns-fastapi.md`
4. Carica `@.claude/libs/stacks/ai-integration.md` per i principi trasversali

### Step 2 — Chiarimento use case

Se l'utente non ha specificato il use case AI, chiedi:

```
Che tipo di funzionalità AI vuoi aggiungere?

A. Chatbot / assistente conversazionale
B. Completamento / generazione testo
C. Estrazione strutturata dati (classificazione, parsing)
D. Ricerca semantica / embedding
E. Agente autonomo con tool use
F. Elaborazione immagini / multimodale
G. Altro: [specifica]

Provider preferito?
A. Anthropic Claude (consigliato)
B. OpenAI GPT-4o
C. Azure OpenAI
D. Non ho preferenze
```

### Step 3 — Analisi codebase

Usa Context7 se disponibile per recuperare documentazione aggiornata:

```
use context7 to get documentation for @ai-sdk/anthropic
use context7 to get documentation for spring-ai ChatClient
```

Poi analizza il progetto:
- Dove si trova attualmente la logica di business?
- Esiste già un layer service?
- Come sono strutturate le dipendenze (DI container, inject)?

### Step 4 — Proposta architetturale

Prima di scrivere codice, proponi la struttura:

```
Aggiungerò:
ai/
├── client.{ext}              — istanza singleton del client LLM
├── prompts/
│   └── {feature}.{ext}       — system prompt separato dal codice
└── services/
    └── {feature}-ai.{ext}    — service AI per il use case richiesto

Modificherò:
- {ServiceEsistente}          — aggiungo dipendenza dall'AI service
- {Controller/Endpoint}       — aggiungo endpoint per trigger AI
- {Config/DI}                 — registro il client LLM
```

Chiedi conferma prima di procedere.

### Step 5 — Implementazione

Genera il codice seguendo i pattern del progetto e gli snippet AI del modulo caricato.

**Ordine di implementazione:**

1. **Configurazione** — client LLM, variabili d'ambiente, DI registration
2. **Service AI** — classe/funzione che wrappa le chiamate al provider
3. **Use case specifico** — service/handler che usa l'AI service
4. **Endpoint/Controller** — espone il use case via API (se richiesto)
5. **Streaming UI** — componente frontend se il progetto ha UI (se richiesto)

### Step 6 — Verifica e sicurezza

Dopo aver generato il codice, verifica:

**Sicurezza:**
- [ ] API key mai nel codice — solo variabili d'ambiente
- [ ] Input utente sanitizzato prima di mandarlo all'LLM
- [ ] Output LLM mai trattato come trusted — sempre validato
- [ ] Niente dati personali nei log

**Performance:**
- [ ] Streaming abilitato per output lunghi
- [ ] Caching del system prompt se statico e lungo
- [ ] Modello appropriato al task (haiku per task semplici, sonnet per complessi)
- [ ] Max tokens esplicitamente settato

**Architettura:**
- [ ] LLM isolato in un layer dedicato (non inline nel controller)
- [ ] System prompt in costante separata
- [ ] Retry configurato per rate limit (429)

## Template quick start per provider

### Anthropic Claude

```bash
# .NET
dotnet add package Anthropic.SDK
dotnet add package Microsoft.Extensions.AI.Anthropic

# Spring Boot (pom.xml)
# spring-ai-anthropic-spring-boot-starter

# Next.js
npm install ai @ai-sdk/anthropic

# FastAPI
pip install anthropic
```

**Variabile d'ambiente:** `ANTHROPIC_API_KEY`

**Modelli disponibili:**

| Modello | Uso |
| --- | --- |
| `claude-haiku-4-5-20251001` | Task semplici, alta frequenza, basso costo |
| `claude-sonnet-4-6` | Default — bilanciato per la maggior parte dei task |
| `claude-opus-4-6` | Task complessi, ragionamento profondo |

### OpenAI GPT-4o (alternativa)

```bash
# .NET
dotnet add package Microsoft.Extensions.AI.OpenAI

# Spring Boot
# spring-ai-openai-spring-boot-starter

# Next.js
npm install ai @ai-sdk/openai

# FastAPI
pip install openai
```

**Variabile d'ambiente:** `OPENAI_API_KEY`

## Note per use case specifici

**Chatbot:** usa storico messaggi con window limite (ultimi N messaggi) — mai mandare tutto lo storico

**Estrazione dati:** temperatura 0, usa structured output / JSON mode + validazione schema

**Ricerca semantica:** non usare completions — usa embedding + vector DB (pgvector, Qdrant, Pinecone)

**Agente con tool use:** limita i tool disponibili al minimo necessario, valida sempre i parametri prima di eseguire

**Documenti lunghi:** chunking + map-reduce o context caching (Anthropic) — mai mandare tutto in un prompt
