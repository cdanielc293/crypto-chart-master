import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeId = 'dark' | 'midnight' | 'ocean' | 'forest' | 'warm' | 'light';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  preview: string; // hex color for the swatch
}

export const THEMES: ThemeOption[] = [
  { id: 'dark', label: 'Dark (Default)', preview: '#131722' },
  { id: 'midnight', label: 'Midnight Blue', preview: '#0a0e1a' },
  { id: 'ocean', label: 'Deep Ocean', preview: '#0b1628' },
  { id: 'forest', label: 'Dark Forest', preview: '#0d1a0f' },
  { id: 'warm', label: 'Warm Dark', preview: '#1a1410' },
  { id: 'light', label: 'Light', preview: '#f0f3fa' },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem('chart-theme') as ThemeId) || 'dark';
  });

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem('chart-theme', t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
