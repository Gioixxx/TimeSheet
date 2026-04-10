'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { themes, type Theme } from '@/lib/themes';
import { useTheme } from './ThemeProvider';
import styles from './ThemeSelector.module.css';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const darkThemes = themes.filter((t) => t.colorScheme === 'dark');
  const lightThemes = themes.filter((t) => t.colorScheme === 'light');

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Seleziona tema"
        title="Seleziona tema"
      >
        <Palette size={16} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Tema Scuro</span>
            <div className={styles.grid}>
              {darkThemes.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.swatch} ${theme.id === t.id ? styles.active : ''}`}
                  style={{ '--theme-primary': t.primary, '--theme-bg': t.vars['--bg-base'] } as React.CSSProperties}
                  onClick={() => {
                    setTheme(t);
                    setIsOpen(false);
                  }}
                  title={t.name}
                  aria-label={t.name}
                >
                  <div className={styles.swatchColors}>
                    <div className={styles.swatchBg} />
                    <div className={styles.swatchPrimary} />
                  </div>
                  {theme.id === t.id && <Check size={12} className={styles.checkIcon} />}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.divider} />
          
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Tema Chiaro</span>
            <div className={styles.grid}>
              {lightThemes.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.swatch} ${styles.swatchLight} ${theme.id === t.id ? styles.active : ''}`}
                  style={{ '--theme-primary': t.primary, '--theme-bg': t.vars['--bg-base'] } as React.CSSProperties}
                  onClick={() => {
                    setTheme(t);
                    setIsOpen(false);
                  }}
                  title={t.name}
                  aria-label={t.name}
                >
                  <div className={styles.swatchColors}>
                    <div className={styles.swatchBg} />
                    <div className={styles.swatchPrimary} />
                  </div>
                  {theme.id === t.id && <Check size={12} className={styles.checkIcon} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
