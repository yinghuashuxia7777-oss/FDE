import { createContext, useContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  setTheme: (theme: ThemePreference) => void;
  theme: ThemePreference;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
