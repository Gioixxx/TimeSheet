---
triggers: design token | dark mode | theming | spacing scale
---
# Style System — Design Tokens e Theming

> **Revisione doc:** 2026-10 — aggiorna la data quando modifichi versione runtime o regole principali.

Regole trasversali per gli stili, valide per Angular, Next.js e React Native. Gli esempi completi (token in TypeScript, scala degli spazi, tipografia, radius e ombre, dark mode e icone per stack) stanno nel reference: leggilo con Read prima di creare o cambiare token, tema o icone.

## Regole

- Token a due livelli: **primitivi** (valori grezzi, `blue-500`, `14px`) e **semantici** (l'uso: `color-primary`, `color-text`, `font-size-body`). I componenti usano solo i semantici; i primitivi non escono da `design-tokens.ts`, la fonte unica condivisa tra web e native.
- Mai colori o spazi scritti nel componente: sempre i token.
- Spazi: solo multipli di 4 (griglia di 4 px), mai valori come `13px`, `22px`, `7`.
- Tipografia: al massimo 5 dimensioni nel progetto.
- Dark mode: un contesto globale alla radice (Next.js `next-themes` con Tailwind `class`; Angular custom properties e classe sul `body`; React Native `useColorScheme()` con un context). Nessun componente decide da solo se è chiaro o scuro.
- Il nome di un token semantico risponde a «a cosa serve?», non a «che colore è?».
- Icone: dimensione e colore dai token; `aria-hidden="true"` se decorative, label esplicita se funzionali. Librerie: `lucide-react` (Next.js, React), Material Symbols (Angular), `@expo/vector-icons` (React Native).

## Reference → `.claude/consoleclaude/stacks/style-system-reference.md`
