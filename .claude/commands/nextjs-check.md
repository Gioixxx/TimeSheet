# /nextjs-check — Verifica Convenzioni Next.js

Verifica che il file Next.js corrente rispetti le convenzioni App Router, TypeScript strict e Tailwind.

## Istruzioni

1. Carica `@.claude/libs/stacks/nextjs.md` per le convenzioni
2. Carica `@.claude/libs/snippets/nextjs-patterns.md` per i pattern di riferimento
3. Carica `@.claude/memory/conventions.md` per eventuali convenzioni locali
4. Identifica il tipo di file e applica la checklist corrispondente

**Context7 (se disponibile):** per API Next.js o librerie specifiche usate nel file:

```text
use context7 to get documentation for [next / next-themes / swr / zod]
```

## Checklist per tipo

**Server Component (`app/**/page.tsx`, layout, server component):**

- [ ] Nessuna direttiva `"use client"` — se presente, è davvero necessaria?
- [ ] Fetch dati direttamente nel componente — niente `useEffect` + `useState`
- [ ] `revalidatePath` o `revalidateTag` chiamato dopo mutation correlate
- [ ] `Suspense` attorno a componenti con fetch asincrono
- [ ] `error.tsx` presente nella stessa route per gestire errori fetch
- [ ] `params` e `searchParams` usati con `await` (Next.js 15+)

**Client Component (`"use client"`):**

- [ ] `"use client"` necessario — ha `useState`, `useEffect`, event handler o browser API
- [ ] Props tipizzate con TypeScript — niente `any`
- [ ] Accetta `className` come prop e usa `cn()` per merging classi
- [ ] Niente fetch diretto — usa SWR, React Query o Server Action

**Server Action (`actions.ts`):**

- [ ] File marcato `'use server'`
- [ ] Input validato con Zod prima di qualsiasi operazione
- [ ] `revalidatePath` chiamato dopo ogni mutation che cambia dati listati
- [ ] Ritorna `ActionState` usabile con `useActionState`
- [ ] Gestione errori esplicita — niente eccezioni silenziose

**Route Handler (`route.ts`):**

- [ ] Input validato con Zod — niente accesso diretto a `req.json()` senza validazione
- [ ] `NextResponse.json()` con status code esplicito per errori (422, 404, 401)
- [ ] Niente logica business inline — delegata a service/repository separato

**Middleware (`middleware.ts`):**

- [ ] Solo auth/redirect — niente logica business
- [ ] `matcher` definito per escludere file statici `_next/static`, `favicon.ico`
- [ ] `NextResponse.next()` come fallthrough esplicito

**Stile:**

- [ ] `cn()` da `@/lib/utils` per classi condizionali — niente template literals manuali
- [ ] Classi Tailwind in ordine: layout → spacing → tipografia → colori → stato
- [ ] Niente `style={{ ... }}` inline con valori hardcoded

## Output atteso

Per ogni elemento: ✅ conforme, ⚠️ da migliorare, ❌ non conforme.

Per ogni problema: codice attuale → codice corretto.

Concludi con `X/Y criteri rispettati`.
