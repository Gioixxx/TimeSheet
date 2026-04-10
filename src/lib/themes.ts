export type Theme = {
  id: string;
  name: string;
  primary: string;
  colorScheme: 'dark' | 'light';
  vars: Record<string, string>;
};

const darkBase: Record<string, string> = {
  '--bg-base': '#080b14',
  '--bg-surface': 'rgba(255, 255, 255, 0.03)',
  '--bg-surface-hover': 'rgba(255, 255, 255, 0.06)',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--text': '#f8fafc',
  '--text-muted': '#94a3b8',
  '--text-placeholder': '#475569',
  '--shadow-glass': '0 4px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  '--shadow-card': '0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
  '--scrollbar-color': 'rgba(255, 255, 255, 0.1)',
  '--scrollbar-hover': 'rgba(255, 255, 255, 0.2)',
};

const lightBase: Record<string, string> = {
  '--bg-base': '#fafafa',
  '--bg-surface': 'rgba(0, 0, 0, 0.03)',
  '--bg-surface-hover': 'rgba(0, 0, 0, 0.06)',
  '--border': 'rgba(0, 0, 0, 0.08)',
  '--text': '#0f172a',
  '--text-muted': '#64748b',
  '--text-placeholder': '#cbd5e1',
  '--shadow-glass': '0 4px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  '--shadow-card': '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
  '--scrollbar-color': 'rgba(0, 0, 0, 0.15)',
  '--scrollbar-hover': 'rgba(0, 0, 0, 0.25)',
};

export const themes: Theme[] = [
  // ── Dark Themes ─────────────────────────────────────────────────────────
  {
    id: 'dark-midnight',
    name: 'Mezzanotte (Indigo)',
    primary: '#6366f1',
    colorScheme: 'dark',
    vars: {
      ...darkBase,
      '--bg-base': '#060813',
      '--primary': '#6366f1',
      '--primary-hover': '#818cf8',
      '--primary-glow': 'rgba(99, 102, 241, 0.25)',
      '--border-focus': 'rgba(99, 102, 241, 0.7)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(99, 102, 241, 0.2)',
      '--bg-gradient-1': 'rgba(99, 102, 241, 0.12)',
      '--bg-gradient-2': 'rgba(139, 92, 246, 0.08)',
    },
  },
  {
    id: 'dark-nebula',
    name: 'Nebula (Viola)',
    primary: '#a855f7',
    colorScheme: 'dark',
    vars: {
      ...darkBase,
      '--bg-base': '#0b0415',
      '--primary': '#a855f7',
      '--primary-hover': '#c084fc',
      '--primary-glow': 'rgba(168, 85, 247, 0.25)',
      '--border-focus': 'rgba(168, 85, 247, 0.7)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(168, 85, 247, 0.2)',
      '--bg-gradient-1': 'rgba(168, 85, 247, 0.15)',
      '--bg-gradient-2': 'rgba(236, 72, 153, 0.08)',
    },
  },
  {
    id: 'dark-ocean',
    name: 'Oceano (Ceruleo)',
    primary: '#0ea5e9',
    colorScheme: 'dark',
    vars: {
      ...darkBase,
      '--bg-base': '#020b14',
      '--primary': '#0ea5e9',
      '--primary-hover': '#38bdf8',
      '--primary-glow': 'rgba(14, 165, 233, 0.25)',
      '--border-focus': 'rgba(14, 165, 233, 0.7)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(14, 165, 233, 0.2)',
      '--bg-gradient-1': 'rgba(14, 165, 233, 0.15)',
      '--bg-gradient-2': 'rgba(59, 130, 246, 0.08)',
    },
  },
  {
    id: 'dark-forest',
    name: 'Foresta (Smeraldo)',
    primary: '#10b981',
    colorScheme: 'dark',
    vars: {
      ...darkBase,
      '--bg-base': '#03100b',
      '--primary': '#10b981',
      '--primary-hover': '#34d399',
      '--primary-glow': 'rgba(16, 185, 129, 0.25)',
      '--border-focus': 'rgba(16, 185, 129, 0.7)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(16, 185, 129, 0.2)',
      '--bg-gradient-1': 'rgba(16, 185, 129, 0.15)',
      '--bg-gradient-2': 'rgba(5, 150, 105, 0.08)',
    },
  },
  {
    id: 'dark-crimson',
    name: 'Cremisi (Rosa)',
    primary: '#e11d48',
    colorScheme: 'dark',
    vars: {
      ...darkBase,
      '--bg-base': '#120509',
      '--primary': '#e11d48',
      '--primary-hover': '#f43f5e',
      '--primary-glow': 'rgba(225, 29, 72, 0.25)',
      '--border-focus': 'rgba(225, 29, 72, 0.7)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(225, 29, 72, 0.2)',
      '--bg-gradient-1': 'rgba(225, 29, 72, 0.15)',
      '--bg-gradient-2': 'rgba(244, 63, 94, 0.08)',
    },
  },
  {
    id: 'dark-sunset',
    name: 'Tramonto (Ambra)',
    primary: '#f59e0b',
    colorScheme: 'dark',
    vars: {
      ...darkBase,
      '--bg-base': '#130c04',
      '--primary': '#f59e0b',
      '--primary-hover': '#fbbf24',
      '--primary-glow': 'rgba(245, 158, 11, 0.25)',
      '--border-focus': 'rgba(245, 158, 11, 0.7)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(245, 158, 11, 0.2)',
      '--bg-gradient-1': 'rgba(245, 158, 11, 0.15)',
      '--bg-gradient-2': 'rgba(234, 88, 12, 0.08)',
    },
  },

  // ── Light Themes ────────────────────────────────────────────────────────
  {
    id: 'light-cotton',
    name: 'Cotone (Indigo)',
    primary: '#4f46e5',
    colorScheme: 'light',
    vars: {
      ...lightBase,
      '--bg-base': '#f8fafc',
      '--primary': '#4f46e5',
      '--primary-hover': '#6366f1',
      '--primary-glow': 'rgba(79, 70, 229, 0.2)',
      '--border-focus': 'rgba(79, 70, 229, 0.5)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(79, 70, 229, 0.2)',
      '--bg-gradient-1': 'rgba(79, 70, 229, 0.08)',
      '--bg-gradient-2': 'rgba(124, 58, 237, 0.04)',
    },
  },
  {
    id: 'light-sky',
    name: 'Cielo (Azzurro)',
    primary: '#0284c7',
    colorScheme: 'light',
    vars: {
      ...lightBase,
      '--bg-base': '#f0f9ff',
      '--primary': '#0284c7',
      '--primary-hover': '#0ea5e9',
      '--primary-glow': 'rgba(2, 132, 199, 0.2)',
      '--border-focus': 'rgba(2, 132, 199, 0.5)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(2, 132, 199, 0.2)',
      '--bg-gradient-1': 'rgba(2, 132, 199, 0.08)',
      '--bg-gradient-2': 'rgba(37, 99, 235, 0.04)',
    },
  },
  {
    id: 'light-rose',
    name: 'Petalo (Rosa)',
    primary: '#e11d48',
    colorScheme: 'light',
    vars: {
      ...lightBase,
      '--bg-base': '#fff1f2',
      '--primary': '#e11d48',
      '--primary-hover': '#f43f5e',
      '--primary-glow': 'rgba(225, 29, 72, 0.2)',
      '--border-focus': 'rgba(225, 29, 72, 0.5)',
      '--shadow-lift': '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(225, 29, 72, 0.2)',
      '--bg-gradient-1': 'rgba(225, 29, 72, 0.08)',
      '--bg-gradient-2': 'rgba(219, 39, 119, 0.04)',
    },
  },
];

export const DEFAULT_THEME_ID = 'dark-midnight';
