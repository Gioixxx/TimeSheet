'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { themes, DEFAULT_THEME_ID, type Theme } from '@/lib/themes';

const STORAGE_KEY = 'timesheet-theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Scrive le CSS variables del tema sul documento. Non dipende dallo stato di React. */
function applyTheme(t: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(t.vars)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = t.colorScheme;
}

// Il tema scelto vive in localStorage, non nello stato di React: è uno store esterno, e
// `useSyncExternalStore` è il modo previsto per leggerlo senza disallineare l'idratazione
// (il server non ha localStorage e parte dal tema di default, come fa l'HTML renderizzato).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 'storage' arriva quando il tema viene cambiato in un'altra scheda
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getStoredThemeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Sul server non c'è un tema salvato: si parte dal default, come ThemeScript. */
function getServerThemeId(): string | null {
  return null;
}

function notifyThemeChanged() {
  for (const onChange of listeners) onChange();
}

const defaultTheme = themes.find((t) => t.id === DEFAULT_THEME_ID)!;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedId = useSyncExternalStore(subscribe, getStoredThemeId, getServerThemeId);
  const theme = themes.find((t) => t.id === storedId) ?? defaultTheme;

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t.id);
    } catch {
      // Storage non disponibile: il tema resta applicato per questa sessione
    }
    notifyThemeChanged();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
