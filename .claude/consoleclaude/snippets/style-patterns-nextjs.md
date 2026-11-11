# Template Stili Next.js 16 / Tailwind 4

> **Compressione:** esempi → signature; le catene con → sono pseudo-codice da espandere. Non ha un reference con l'esempio completo: `.claude/consoleclaude/stacks/style-system.md` dà solo token e convenzioni.

## Tailwind 4 — Token nel CSS (`@theme`)

```css
/* app/globals.css — Tailwind 4 è CSS-first: niente tailwind.config.ts */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));   /* next-themes: class="dark" su <html> */

@theme {
  --color-primary: #3B82F6;  --color-primary-hover: #1D4ED8;
  --color-surface: #F9FAFB;  --color-border: #F3F4F6;  --color-text-muted: #6B7280;  --color-error: #EF4444;
  --radius: 8px;  --radius-sm: 4px;  --radius-lg: 12px;  --radius-xl: 16px;
}
@theme inline {                                    /* inline: i valori rimandano a un'altra variabile */
  --font-sans: var(--font-inter), sans-serif;      /* variabili di next/font */
  --font-mono: var(--font-geist-mono), monospace;
}
```

Quando: estendere Tailwind con token progetto. I token diventano utility (`bg-primary`, `rounded-lg`, `font-sans`) e variabili CSS.
- Non ridefinire spacing (già coperto da scala 4px)
- Config JS legacy: `@config "../../tailwind.config.ts"`; pacchetti `@tailwindcss/postcss` (o `@tailwindcss/vite`); migrazione guidata con `npx @tailwindcss/upgrade`
- Browser minimi: Safari 16.4+, Chrome 111+, Firefox 128+

## Utility cn()

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) → twMerge(clsx(inputs))

// Uso:
<Button className={cn(
  'inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors',
  variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
  variant === 'ghost'   && 'text-gray-700 hover:bg-surface',
  disabled && 'opacity-50 cursor-not-allowed',
  className,  // sempre ultimo
)} />
```

Quando: classi condizionali senza conflitti.
- `className` sempre come ultimo argomento

## CSS Modules

Usare solo per:
- Animazioni/keyframes complessi
- Componenti di libreria senza dipendenza Tailwind

```css
/* Spinner.module.css */
.spinner { width: 20px | height: 20px | border: 2px solid var(--color-border) | border-top-color: var(--color-primary) | border-radius: 50% | animation: spin 0.6s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }
```

```typescript
export function Spinner({ className }) → <div className={cn(styles.spinner, className)} />
```

## Dark Mode — next-themes

```typescript
// app/layout.tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
// suppressHydrationWarning su <html>

// ThemeToggle: 'use client' → const { theme, setTheme } = useTheme()
// → onClick: setTheme(theme === 'dark' ? 'light' : 'dark')

// Uso classi: "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
```

## Font Optimization

```typescript
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })

// <html className={`${inter.variable} ${geistMono.variable}`}>
// <body className="font-sans">
```

## Responsive (mobile-first)

```
✅ Corretto: "px-4 md:px-6 lg:px-8"  (base → sm → md → lg)
❌ Sbagliato: "lg:px-8 md:px-6 px-4"  (ordine invertito)
```

Quando: stili responsive.
- Sempre mobile-first: base per mobile, override con breakpoint

## Regole generali

- `cn()` su ogni componente con prop `className`
- Dark mode a classe (`@custom-variant dark (&:where(.dark, .dark *))`) — non `prefers-color-scheme`
- `suppressHydrationWarning` su `<html>` con next-themes
- CSS Modules solo per animazioni e componenti libreria
- `var(--font-*)` di next/font mappata in `@theme inline` (`--font-sans`)
- Mai `style={{}}` inline — classi Tailwind o token CSS
- Rinominate in v4: `shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, `outline-none`→`outline-hidden`, `flex-shrink-*`→`shrink-*`, `bg-opacity-*`→`bg-black/50`; il `!` importante va in fondo (`flex!`)
- Responsive sempre mobile-first
