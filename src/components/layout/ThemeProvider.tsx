import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { ThemeContext, type ThemePreference, useTheme } from './theme-context';

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemePreference;
}

export function ThemeProvider({
  children,
  initialTheme = 'system',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    const previousColorScheme = root.style.colorScheme;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.dataset.theme = theme;
      root.style.colorScheme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };

    applyTheme();
    media.addEventListener('change', applyTheme);

    return () => {
      media.removeEventListener('change', applyTheme);
      if (previousTheme === undefined) delete root.dataset.theme;
      else root.dataset.theme = previousTheme;
      root.style.colorScheme = previousColorScheme;
    };
  }, [theme]);

  const value = useMemo(() => ({ setTheme, theme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

interface ThemeSelectorProps {
  compact?: boolean;
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  return (
    <label
      className={
        compact ? 'theme-selector theme-selector--compact' : 'theme-selector'
      }
    >
      <span>Theme</span>
      <select
        value={theme}
        onChange={(event) => {
          setTheme(event.target.value as ThemePreference);
        }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
