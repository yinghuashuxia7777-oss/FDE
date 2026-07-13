import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { enUS } from './en-US';
import { zhCN } from './zh-CN';

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'zh-CN';
export const I18N_STORAGE_KEY = 'fde-arena:i18n';

type TranslationParameters = Record<string, number | string>;
type TranslationDictionary = Record<string, string>;
type Translate = (key: string, parameters?: TranslationParameters) => string;

const dictionaries: Record<Language, TranslationDictionary> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

function isLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function readStoredLanguage(
  storage?: Pick<Storage, 'getItem'>,
): Language {
  try {
    const source = storage ?? globalThis.localStorage;
    const raw = source.getItem(I18N_STORAGE_KEY);
    if (raw === null) return DEFAULT_LANGUAGE;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'language' in value &&
      isLanguage(value.language)
    ) {
      return value.language;
    }
  } catch {
    // A blocked or malformed preference must never prevent the app from loading.
  }
  return DEFAULT_LANGUAGE;
}

function writeStoredLanguage(language: Language): void {
  try {
    globalThis.localStorage.setItem(
      I18N_STORAGE_KEY,
      JSON.stringify({ language }),
    );
  } catch {
    // Language switching remains usable when storage is unavailable.
  }
}

export function createTranslator(language: Language): Translate {
  return (key, parameters = {}) => {
    const template =
      dictionaries[language][key] ?? dictionaries['en-US'][key] ?? key;
    return template.replace(/\{([^}]+)\}/g, (match, name: string) => {
      const value = parameters[name];
      return value === undefined ? match : String(value);
    });
  };
}

export function localizeUiError(
  language: Language,
  error: unknown,
  fallback: string,
): string {
  const message =
    typeof error === 'string'
      ? error.trim()
      : error instanceof Error
        ? error.message.trim()
        : '';
  if (message === '') return fallback;
  const containsChinese = /[\u3400-\u9fff]/u.test(message);
  return (language === 'zh-CN') === containsChinese ? message : fallback;
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
}

const developerFallback: I18nContextValue = {
  language: 'en-US',
  setLanguage: () => undefined,
  t: createTranslator('en-US'),
};

const I18nContext = createContext<I18nContextValue>(developerFallback);

interface I18nProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, updateLanguage] = useState<Language>(
    () => initialLanguage ?? readStoredLanguage(),
  );
  const setLanguage = useCallback((nextLanguage: Language) => {
    updateLanguage(nextLanguage);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    writeStoredLanguage(language);
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: createTranslator(language) }),
    [language, setLanguage],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
