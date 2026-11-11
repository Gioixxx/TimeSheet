# Component Libraries — Integrazione e Convenzioni

> **Revisione doc:** 2026-04 — aggiorna la data quando modifichi versione runtime o regole principali.


Linee guida per integrare le principali librerie UI nei progetti. Per ogni stack: quando usare il componente di libreria, quando costruirne uno custom, e come estendere il tema con i token del progetto.

---

## shadcn/ui (Next.js / React)

shadcn/ui non è un pacchetto npm — è una raccolta di componenti che vengono copiati nel progetto. Ogni componente è tuo codice, modificabile liberamente.

### Setup

```bash
npx shadcn@latest init
# Sceglie: TypeScript, Tailwind, path aliases
# Crea: components/ui/, lib/utils.ts (cn())
```

### Struttura cartelle consigliata

```
src/
├── components/
│   ├── ui/          # Componenti shadcn — NON modificare direttamente
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── [feature]/   # Componenti propri che wrappano o estendono shadcn
│       └── UserCard.tsx
```

### Estendere il tema con i token del progetto

> **Tailwind 4:** non c'è più `tailwind.config.ts`; i token si dichiarano nel CSS con `@theme` (per riferire le variabili di shadcn si usa `@theme inline`). Il blocco sotto vale per Tailwind 3: verifica il template generato da `npx shadcn@latest init` per la versione in uso.

```typescript
// tailwind.config.ts (Tailwind 3) — mappa i token CSS vars usati da shadcn
const config: Config = {
  theme: {
    extend: {
      colors: {
        // shadcn usa queste CSS vars — mapparle ai tuoi token
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};
```

```css
/* globals.css — valori HSL per shadcn, derivati dai token del progetto */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --primary: 221 83% 53%;       /* blue-500 */
    --primary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --destructive: 0 84% 60%;     /* red-500 */
    --radius: 0.5rem;
  }
  .dark {
    --background: 222 47% 11%;    /* gray-900 */
    --foreground: 0 0% 100%;
    --primary: 221 83% 53%;
    --muted: 217 32% 17%;
    --muted-foreground: 215 20% 65%;
  }
}
```

### Regola: libreria vs custom

| Situazione | Scelta |
|-----------|--------|
| Componente generico (Button, Input, Dialog, Select) | shadcn/ui |
| Componente di dominio (UserCard, OrderRow, StatusBadge) | custom che usa shadcn internamente |
| Layout di pagina | custom |
| Form complessi | React Hook Form + shadcn/ui `<FormField>` |

### Aggiungere componenti

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form      # include react-hook-form integration
```

---

## Angular Material (M3)

### Setup con theming M3

```bash
ng add @angular/material
# Sceglie: Custom theme, Typography, Animations
```

### Tema personalizzato con token del progetto

```scss
// styles/_material-theme.scss
@use '@angular/material' as mat;

// Definisce la palette dal token primario del progetto
$primary-palette: mat.m3-define-theme((
  color: (
    theme-type: light,
    primary: mat.$azure-palette,     // sostituire con palette custom se serve
    tertiary: mat.$blue-palette,
  ),
  typography: (
    brand-family: 'Inter, sans-serif',
    plain-family: 'Inter, sans-serif',
  ),
  density: (
    scale: 0,
  ),
));

$dark-palette: mat.m3-define-theme((
  color: (
    theme-type: dark,
    primary: mat.$azure-palette,
  ),
));

// Applica il tema al root
html {
  @include mat.all-component-themes($primary-palette);
}

html.dark-theme {
  @include mat.all-component-colors($dark-palette);
}
```

```scss
// Palette colore custom (se il brand non corrisponde alle palette Material)
@use '@angular/material' as mat;

$custom-primary: mat.m3-define-hue-palette(#3B82F6);  // blue-500
```

### Struttura consigliata

```
src/
└── styles/
    ├── _tokens.scss           # Token del progetto (CSS vars)
    ├── _material-theme.scss   # Tema Angular Material
    ├── _typography.scss       # Override tipografia Material
    └── styles.scss            # Entry point
```

### Regola: Material vs custom

| Situazione | Scelta |
|-----------|--------|
| Form controls (input, select, datepicker) | Angular Material |
| Dialog, Snackbar, Tooltip | Angular Material |
| Tabelle dati con sort/paginator | Angular Material Table |
| Card di dominio, layout | custom con CSS del progetto |
| Navigazione specifica del prodotto | custom |

### Override componente senza toccare il tema globale

```scss
// Nel SCSS del componente specifico
:host ::ng-deep .mat-mdc-raised-button {
  border-radius: var(--radius-lg);
  font-weight: 600;
}
```

---

## React Native Paper (React Native + Expo)

### Setup

```bash
npx expo install react-native-paper react-native-safe-area-context
```

### Tema con token del progetto

```typescript
// theme/paper-theme.ts
import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { tokens } from './design-tokens';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: tokens.light.colorPrimary,
    background: tokens.light.colorBackground,
    surface: tokens.light.colorSurface,
    error: tokens.light.colorError,
    onPrimary: '#FFFFFF',
    onBackground: tokens.light.colorText,
    onSurface: tokens.light.colorText,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: tokens.dark.colorPrimary,
    background: tokens.dark.colorBackground,
    surface: tokens.dark.colorSurface,
    error: tokens.dark.colorError,
    onPrimary: '#FFFFFF',
    onBackground: tokens.dark.colorText,
    onSurface: tokens.dark.colorText,
  },
};
```

```typescript
// App.tsx
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from './theme/paper-theme';

export default function App() {
  const scheme = useColorScheme();
  return (
    <PaperProvider theme={scheme === 'dark' ? darkTheme : lightTheme}>
      {/* app */}
    </PaperProvider>
  );
}
```

### Regola: Paper vs custom

| Situazione | Scelta |
|-----------|--------|
| TextInput, Button, Chip, FAB | React Native Paper |
| Modal, Snackbar, BottomSheet | React Native Paper |
| Liste lunghe con FlatList | custom (Paper List può essere lento) |
| Navigazione (tab bar, stack) | Expo Router / React Navigation |
| Card di dominio | custom che usa `Surface` di Paper |

---

## Regole trasversali

- **Non wrappare mai un componente di libreria solo per rinominarlo** — usarlo direttamente
- **Il tema della libreria deve derivare dai token del progetto** — non definire colori separati
- **Non sovrascrivere stili con `!important`** — usare l'API di theming della libreria
- **Un componente di dominio può usare componenti di libreria internamente**, ma non espone mai API interne della libreria ai suoi consumer
- **Aggiornare la libreria regolarmente** — annotare la versione usata in `decisions.md` se si blocca una versione per un motivo specifico
