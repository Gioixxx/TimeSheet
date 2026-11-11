---
name: write-nextjs
description: Writes production Next.js App Router code matching the project conventions. Use when creating or editing pages, layouts, Server Components, Server Actions, Route Handlers, proxy (ex middleware), or TypeScript/TSX in a Next.js project.
---
# Write Next.js code

Wrapper procedurale. Non copiare le regole qui: leggi i moduli.

## Prima di scrivere

1. Segui `precise-code`.
2. Read `.claude/consoleclaude/stacks/nextjs.md` — sezione **Obbligatorie**.
3. Read `.claude/consoleclaude/snippets/nextjs-patterns.md` — signature del pattern (Server Action, Route Handler, fetch, proxy).
4. Leggi 1–2 file `.tsx`/`.ts` nella stessa cartella.
5. Serve il codice per esteso di una sezione che il reference copre → Read `.claude/consoleclaude/stacks/nextjs-reference.md` (solo allora).

## Checklist (puntatori, non duplicati)

Applica le **Obbligatorie** del modulo stack: Server Component di default, `"use client"` al figlio più piccolo, tipi in `types/`, logica in `lib/` o hook, `generateMetadata`, `await` su `params`/`searchParams`/`cookies()`, niente segreti in `NEXT_PUBLIC_*`.
