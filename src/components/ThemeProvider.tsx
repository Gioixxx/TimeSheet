'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { themes, DEFAULT_THEME_ID, type Theme } from '@/lib/themes';

const STORAGE_KEY = 'timesheet-theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => themes.find((t) => t.id === DEFAULT_THEME_ID)!
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const found = themes.find((t) => t.id === saved);
    const initial = found ?? themes.find((t) => t.id === DEFAULT_THEME_ID)!;
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(t.vars)) {
      root.style.setProperty(key, value);
    }
    root.style.colorScheme = t.colorScheme;
  }

  function setTheme(t: Theme) {
    applyTheme(t);
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t.id);
  }

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
