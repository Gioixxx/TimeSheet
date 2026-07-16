# /style-check — Verifica convenzioni stile

## Input
File corrente. `@.claude/libs/stacks/style-system.md` + snippet stile per stack (Angular/Next.js/RN). `@.claude/memory/conventions.md`.

## Regole
- Checklist trasversale: colori token, spacing 4px, dark mode root, nomi semantici
- Angular: CSS vars, BEM, no ::ng-deep
- Next.js: cn(), Tailwind, dark: classes
- React Native: StyleSheet.create(), useThemeColors(), Layout.space

## Output
✅/⚠️/❌ per criterio, fix suggeriti, X/Y rispettati, stato dark mode
