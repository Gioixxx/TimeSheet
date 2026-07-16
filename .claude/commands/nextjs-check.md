# /nextjs-check — Verifica convenzioni Next.js App Router

## Input
File corrente. `@.claude/libs/stacks/nextjs.md`, `snippets/nextjs-patterns.md`, `style-patterns-nextjs.md`, `@.claude/memory/conventions.md`. Context7 per next/npm.

## Regole
- Checklist: Server Component (no "use client", fetch diretto, Suspense), Client Component (props typed, cn()), Server Action ("use server", Zod), Route Handler (Zod, status code), Middleware (solo auth)
- Stile: cn(), Tailwind ordine, no inline style
- ✅/⚠️/❌ per criterio

## Output
Checklist per tipo, punteggio X/Y
