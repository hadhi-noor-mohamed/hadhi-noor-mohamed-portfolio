/* eslint-disable react-refresh/only-export-components -- context modules intentionally export a provider and its hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  /** The concrete mode currently in effect ('light' | 'dark'). */
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const STORAGE_KEY = 'hpf-theme-mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system';
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children, defaultMode }: { children: ReactNode; defaultMode?: ThemeMode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode() ?? defaultMode ?? 'system');
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const resolvedMode: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedMode === 'dark');
    root.dataset.themeMode = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage may be unavailable in private mode */
    }
  }, [mode, resolvedMode]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const cycleMode = useCallback(
    () => setModeState((current) => (current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light')),
    [],
  );

  const value = useMemo(() => ({ mode, resolvedMode, setMode, cycleMode }), [mode, resolvedMode, setMode, cycleMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
