import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../i18n';
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
    const restoreRoot = () => {
      if (previousTheme === undefined) delete root.dataset.theme;
      else root.dataset.theme = previousTheme;
      root.style.colorScheme = previousColorScheme;
    };

    root.dataset.theme = theme;
    if (theme !== 'system') {
      root.style.colorScheme = theme;
      return restoreRoot;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      root.style.colorScheme = media.matches ? 'dark' : 'light';
    };

    applySystemTheme();
    media.addEventListener('change', applySystemTheme);

    return () => {
      media.removeEventListener('change', applySystemTheme);
      restoreRoot();
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
  const { t } = useI18n();

  return (
    <label
      className={
        compact ? 'theme-selector theme-selector--compact' : 'theme-selector'
      }
    >
      <span>{t('theme.label')}</span>
      <select
        value={theme}
        onChange={(event) => {
          setTheme(event.target.value as ThemePreference);
        }}
      >
        <option value="light">{t('theme.light')}</option>
        <option value="dark">{t('theme.dark')}</option>
        <option value="system">{t('theme.system')}</option>
      </select>
    </label>
  );
}
