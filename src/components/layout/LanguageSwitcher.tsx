import { useI18n, type Language } from '../../i18n';

const languageOptions: readonly {
  language: Language;
  labelKey: string;
  shortLabelKey: string;
}[] = [
  {
    language: 'zh-CN',
    labelKey: 'language.zhCN',
    shortLabelKey: 'language.zhCNShort',
  },
  {
    language: 'en-US',
    labelKey: 'language.enUS',
    shortLabelKey: 'language.enUSShort',
  },
];

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`language-switcher${compact ? ' language-switcher--compact' : ''}`}
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
          {t(compact ? option.shortLabelKey : option.labelKey)}
        </button>
      ))}
    </div>
  );
}
