# Next.js — Regole

> **Revisione doc:** 2026-10

## Obbligatorie
- Server Component di default — `"use client"` solo se servono useState/useEffect/event handlers/browser API
- `"use client"` spostato al componente figlio più piccolo possibile
- `page.tsx` sempre `async` se necessita di dati
- `generateMetadata()` per SEO su ogni pagina
- Tipi in `types/` — niente interfacce inline nei componenti
- Logica di business in `lib/` o hook — mai nei componenti
- Preferisci `loading.tsx` e `error.tsx` ai try/catch nei componenti
- `NEXT_PUBLIC_*` solo per dati pubblici — mai segreti; `serverRuntimeConfig`/`publicRuntimeConfig` non esistono più (variabili d'ambiente)
- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` solo con `await`: l'accesso sincrono è stato rimosso in 16
- Intercettazione richieste in `proxy.ts` (ex `middleware.ts`, runtime Node): solo auth e redirect

## Dipendenze core
Next.js 16 (React 19.2, Turbopack di default, Node ≥ 20.9, TypeScript ≥ 5.1) · TypeScript strict · Tailwind CSS 4 · clsx + tailwind-merge

## Struttura
```
src/
  app/              → Route e layout (App Router)
    (auth)/         → Route group (non appare nell'URL)
    dashboard/      → Route con layout annidato
  components/
    ui/             → Componenti base
    features/       → Componenti per feature
  hooks/            → Custom hooks client-side
  lib/              → Fetch helpers, auth, utils (cn())
  types/            → TypeScript types
  constants/        → Costanti e configurazioni
```

## Pattern chiave
- **Fetching server**: con `cacheComponents: true` il caching è opt-in: direttiva `'use cache'` + `cacheLife()`/`cacheTag()`; senza, `fetch()` con `{ next: { revalidate: N } }` o `{ cache: 'no-store' }`
- **Server Actions**: `'use server'` → `updateTag(tag)` (l'utente vede subito la modifica) o `revalidateTag(tag, 'max')` (la forma a un argomento è deprecata) o `revalidatePath()`, poi `redirect()`
- **Tooling**: `next lint` non esiste più (ESLint flat config o Biome); React Compiler con `reactCompiler: true` (opt-in); ogni slot di route parallele richiede `default.js`
- **Utility cn()**: `twMerge(clsx(inputs))` per Tailwind condizionale
- **File speciali**: `loading.tsx`, `error.tsx` (`'use client'`), `not-found.tsx`

## Snippets → `.claude/consoleclaude/snippets/nextjs-patterns.md`
## Reference → `.claude/consoleclaude/stacks/nextjs-reference.md`
