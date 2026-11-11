# Style System — Design Tokens e Theming (Reference)
> **Revisione doc:** 2026-10

> Gli esempi completi delle regole di `.claude/consoleclaude/stacks/style-system.md`: token TypeScript a due livelli, scala degli spazi, tipografia, radius e ombre, dark mode per stack, icone per Next.js, Angular e React Native. Si legge con Read prima di creare o cambiare token, tema o icone.

## Design Tokens — Struttura a due livelli

I token si dividono in **primitivi** (valori grezzi) e **semantici** (significato d'uso). Non usare mai i primitivi direttamente nei componenti.

```text
Primitivi:          Semantici:
blue-500            color-primary
gray-100            color-background
gray-900            color-text
red-600             color-error
14px                font-size-body
24px                font-size-heading
4px                 radius-sm
8px                 radius-md
```

```typescript
// design-tokens.ts — fonte di verità unica, condivisa tra web e native
export const primitives = {
  blue500: '#3B82F6',
  blue700: '#1D4ED8',
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray500: '#6B7280',
  gray900: '#111827',
  red500:  '#EF4444',
  white:   '#FFFFFF',
  black:   '#000000',
} as const;

export const tokens = {
  light: {
    colorPrimary:    primitives.blue500,
    colorPrimaryHover: primitives.blue700,
    colorBackground: primitives.white,
    colorSurface:    primitives.gray50,
    colorBorder:     primitives.gray100,
    colorText:       primitives.gray900,
    colorTextMuted:  primitives.gray500,
    colorError:      primitives.red500,
  },
  dark: {
    colorPrimary:    primitives.blue500,
    colorPrimaryHover: primitives.blue700,
    colorBackground: primitives.gray900,
    colorSurface:    '#1F2937',
    colorBorder:     '#374151',
    colorText:       primitives.white,
    colorTextMuted:  primitives.gray500,
    colorError:      primitives.red500,
  },
} as const;

export type ThemeTokens = typeof tokens.light;
```

## Spacing Scale (4px grid)

Usare sempre multipli di 4. Non usare valori arbitrari come `13px`, `22px`.

```typescript
export const spacing = {
  0:  0,
  1:  4,    // 4px  — micro gap (icone, badge)
  2:  8,    // 8px  — gap interno componente
  3:  12,   // 12px
  4:  16,   // 16px — padding standard
  5:  20,   // 20px
  6:  24,   // 24px — gap tra sezioni
  8:  32,   // 32px
  10: 40,   // 40px
  12: 48,   // 48px — padding pagina mobile
  16: 64,   // 64px — sezioni layout
  20: 80,   // 80px
} as const;
```

## Tipografia

```typescript
export const typography = {
  fontSizeXs:   12,
  fontSizeSm:   14,
  fontSizeMd:   16,  // body default
  fontSizeLg:   18,
  fontSizeXl:   20,
  fontSize2xl:  24,
  fontSize3xl:  30,
  fontSize4xl:  36,

  fontWeightRegular:  '400',
  fontWeightMedium:   '500',
  fontWeightSemibold: '600',
  fontWeightBold:     '700',

  lineHeightTight:  1.25,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
} as const;
```

## Border Radius e Shadow

```typescript
export const radius = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 9999,
} as const;

export const shadows = {
  sm:  '0 1px 2px rgba(0,0,0,0.05)',
  md:  '0 4px 6px rgba(0,0,0,0.07)',
  lg:  '0 10px 15px rgba(0,0,0,0.1)',
  xl:  '0 20px 25px rgba(0,0,0,0.15)',
} as const;
```

## Strategia Dark Mode

| Stack | Approccio | Come attivare |
| --- | --- | --- |
| Next.js | `next-themes` + Tailwind `class` (v4: `@custom-variant dark`) | `<html class="dark">` |
| Angular | CSS custom properties + body class | `document.body.classList` |
| React Native | `useColorScheme()` + context | System preference OS |

Regola comune: il tema è un **contesto globale**, non un prop locale. Nessun componente decide da solo se è dark o light.

## Icon System

### Librerie consigliate per stack

| Stack | Libreria | Install |
|-------|----------|---------|
| Next.js / React | `lucide-react` | `npm i lucide-react` |
| Angular | `@angular/material` icons (Material Symbols) | già incluso con Angular Material |
| React Native | `@expo/vector-icons` | già incluso con Expo |

### Convenzioni trasversali

```typescript
// Dimensione icone — sempre da token, mai valori arbitrari
const iconSize = {
  sm: 16,   // icone inline nel testo
  md: 20,   // icone nei bottoni e label
  lg: 24,   // icone standalone
  xl: 32,   // icone hero / illustrative
};

// Colore icone — sempre da token semantici, mai hardcoded
// ✅ color={tokens.colorText}
// ❌ color="#111827"
```

### Next.js — Lucide React

```typescript
// Importare solo le icone usate — tree-shaking automatico
import { Save, X, ChevronRight, AlertCircle } from 'lucide-react';

// Uso standard
<Save size={20} className="text-muted-foreground" aria-hidden="true" />

// Icona con label accessibile (senza testo visibile)
<button aria-label="Salva documento">
  <Save size={20} aria-hidden="true" />
</button>

// Icona + testo — l'icona è decorativa
<button>
  <Save size={16} aria-hidden="true" />
  <span>Salva</span>
</button>
```

### Angular — Material Symbols

```typescript
// In standalone component
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [MatIconModule],
  template: `
    <!-- Icona decorativa -->
    <mat-icon aria-hidden="true">save</mat-icon>

    <!-- Icona con significato -->
    <mat-icon aria-label="Salva documento">save</mat-icon>

    <!-- Icona in bottone -->
    <button mat-icon-button aria-label="Chiudi">
      <mat-icon>close</mat-icon>
    </button>
  `,
})
```

### React Native — Expo Icons

```typescript
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';

export function Icon({ name, size = 20 }: Props) {
  const colors = useThemeColors();
  return (
    <Ionicons
      name={name}
      size={size}
      color={colors.text}
      accessibilityElementsHidden={true}  // decorativa
    />
  );
}
```

---

## Regole generali

- Mai valori di colore o spacing direttamente nel componente — usare sempre i token
- I token primitivi (`blue-500`) non escono mai dal file `design-tokens.ts`
- Spacing: solo multipli di 4 — mai valori come `13px`, `22px`, `7`
- Dark mode: gestito a livello di root, non componente per componente
- Tipografia: definire al massimo 5 varianti di dimensione nel progetto — resistere alla proliferazione
- Ogni nuovo token semantico deve avere un nome che risponde a "a cosa serve?" non "che colore è?"
- Icone: sempre `aria-hidden="true"` se decorative, sempre label esplicita se funzionali
