# /style-check — Verifica Convenzioni Stile

Verifica che il file corrente rispetti le convenzioni di styling per lo stack rilevato (Angular/Next.js/React Native).

## Istruzioni

1. Identifica lo stack dal file corrente (estensione, import, struttura)
2. Carica `@.claude/libs/stacks/style-system.md` — convenzioni trasversali
3. In base allo stack, carica il modulo specifico:
   - Angular → `@.claude/libs/snippets/style-patterns-angular.md`
   - Next.js → `@.claude/libs/snippets/style-patterns-nextjs.md`
   - React Native → `@.claude/libs/snippets/style-patterns-react-native.md`
4. Carica `@.claude/memory/conventions.md` per convenzioni locali

## Checklist trasversale (tutti gli stack)

- [ ] Nessun colore hardcoded (`#3B82F6`, `rgb(...)`) — usa token/variabili
- [ ] Spacing da scala 4px — niente valori come `13px`, `22px`, `7`
- [ ] Dark mode gestita a livello root — nessun componente decide il tema da solo
- [ ] Nomi classi/variabili semantici (`color-primary`) — non descrittivi (`color-blue`)

## Checklist Angular (file .scss / .component.ts)

- [ ] CSS custom properties (`var(--color-*)`) — niente hex diretti nel componente
- [ ] BEM naming: `.block__element--modifier` — niente classi generiche
- [ ] Niente `::ng-deep` — usare override Material via custom properties
- [ ] `ViewEncapsulation.None` solo con prefisso selettore
- [ ] Mixin da `styles/_mixins.scss` per media query — niente breakpoint inline ripetuti

## Checklist Next.js (file .tsx / .css)

- [ ] `cn()` per classi condizionali — niente template literals
- [ ] Tailwind classes — niente `style={{ ... }}` inline
- [ ] Dark mode con classi Tailwind `dark:` — non con JavaScript
- [ ] CSS Modules solo per animazioni/keyframes
- [ ] Responsive mobile-first: base → `sm:` → `md:` → `lg:`

## Checklist React Native (file .tsx)

- [ ] `StyleSheet.create()` — niente oggetti stile inline ripetuti
- [ ] `useThemeColors()` per tutti i colori — niente `Colors.light` diretto
- [ ] `Layout.space[N]` per spacing — niente numeri magic
- [ ] Shadow con entrambe le proprietà iOS e `elevation` Android
- [ ] Stili statici fuori dal componente, stili con tema dentro

## Output atteso

Per ogni elemento: ✅ conforme, ⚠️ da migliorare, ❌ non conforme.

Per ogni problema: mostra il codice attuale e la versione corretta.

Concludi con `X/Y criteri rispettati` e un'indicazione se il componente è "pronto per dark mode".
