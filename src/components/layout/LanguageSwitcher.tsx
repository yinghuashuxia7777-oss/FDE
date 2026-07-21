import { useI18n, type Language } from '../../i18n';

const languageOptions: readonly {
  headerLabelKey: string;
  language: Language;
  labelKey: string;
  shortLabelKey: string;
}[] = [
  {
    headerLabelKey: 'language.zhCNHeader',
    language: 'zh-CN',
    labelKey: 'language.zhCN',
    shortLabelKey: 'language.zhCNShort',
  },
  {
    headerLabelKey: 'language.enUSHeader',
    language: 'en-US',
    labelKey: 'language.enUS',
    shortLabelKey: 'language.enUSShort',
  },
];

interface LanguageSwitcherProps {
  compact?: boolean;
  variant?: 'default' | 'compact' | 'header';
}

export function LanguageSwitcher({
  compact = false,
  variant,
}: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();
  const display = variant ?? (compact ? 'compact' : 'default');

  return (
    <div
      className={`language-switcher language-switcher--${display}`}
      role="group"
      aria-label={t('language.switcherLabel')}
    >
      {languageOptions.map((option) => (
        <button
          key={option.language}
          className="language-switcher__option"
          type="button"
          aria-label={t(option.labelKey)}
          aria-pressed={language === option.language}
          lang={
            language === 'zh-CN' && option.language === 'en-US'
              ? 'en-US'
              : undefined
          }
          onClick={() => setLanguage(option.language)}
        >
          {t(
            display === 'header'
              ? option.headerLabelKey
              : display === 'compact'
                ? option.shortLabelKey
                : option.labelKey,
          )}
        </button>
      ))}
    </div>
  );
}
