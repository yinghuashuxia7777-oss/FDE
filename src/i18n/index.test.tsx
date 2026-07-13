import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  DEFAULT_LANGUAGE,
  I18N_STORAGE_KEY,
  I18nProvider,
  localizeUiError,
  readStoredLanguage,
  useI18n,
} from './index';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

function LanguageProbe() {
  const { language, setLanguage, t } = useI18n();

  return (
    <>
      <output aria-label="language">{language}</output>
      <output aria-label="dashboard-label">{t('nav.dashboard')}</output>
      <button type="button" onClick={() => setLanguage('en-US')}>
        English
      </button>
    </>
  );
}

describe('i18n runtime', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Simplified Chinese without consulting the browser language', () => {
    const navigatorLanguage = vi.spyOn(window.navigator, 'language', 'get');
    navigatorLanguage.mockReturnValue('en-US');

    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    expect(DEFAULT_LANGUAGE).toBe('zh-CN');
    expect(screen.getByLabelText('language')).toHaveTextContent('zh-CN');
    expect(screen.getByLabelText('dashboard-label')).toHaveTextContent('首页');
    expect(navigatorLanguage).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute('lang', 'zh-CN');
    expect(window.localStorage.getItem(I18N_STORAGE_KEY)).toBe(
      JSON.stringify({ language: 'zh-CN' }),
    );
  });

  it('persists one shared selection and restores it on the next mount', async () => {
    const user = userEvent.setup();
    const first = render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByLabelText('language')).toHaveTextContent('en-US');
    expect(screen.getByLabelText('dashboard-label')).toHaveTextContent(
      'Dashboard',
    );
    expect(window.localStorage.getItem(I18N_STORAGE_KEY)).toBe(
      JSON.stringify({ language: 'en-US' }),
    );

    first.unmount();
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    expect(screen.getByLabelText('language')).toHaveTextContent('en-US');
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
  });

  it('falls back safely when persisted data is malformed or unsupported', () => {
    window.localStorage.setItem(I18N_STORAGE_KEY, '{invalid');
    expect(readStoredLanguage()).toBe('zh-CN');

    window.localStorage.setItem(
      I18N_STORAGE_KEY,
      JSON.stringify({ language: 'fr-FR' }),
    );
    expect(readStoredLanguage()).toBe('zh-CN');
  });

  it('keeps switching when browser storage is unavailable', async () => {
    const unavailable = () => {
      throw new DOMException('Storage access denied', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(unavailable);
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    expect(screen.getByLabelText('language')).toHaveTextContent('zh-CN');
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByLabelText('language')).toHaveTextContent('en-US');
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
  });

  it('keeps every language control synchronized through one preference', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLanguage="zh-CN">
        <LanguageSwitcher />
        <LanguageSwitcher />
      </I18nProvider>,
    );

    const englishButtons = screen.getAllByRole('button', { name: 'English' });
    await user.click(englishButtons[0]!);

    expect(
      screen.getAllByRole('button', { name: 'English', pressed: true }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole('button', {
        name: 'Simplified Chinese',
        pressed: false,
      }),
    ).toHaveLength(2);
  });

  it('keeps English diagnostics out of Chinese error chrome', () => {
    expect(
      localizeUiError(
        'zh-CN',
        new Error('IndexedDB request failed'),
        '本地数据加载失败，请重试。',
      ),
    ).toBe('本地数据加载失败，请重试。');
    expect(
      localizeUiError('zh-CN', new Error('题库文件无效。'), '操作失败。'),
    ).toBe('题库文件无效。');
    expect(
      localizeUiError(
        'en-US',
        new Error('IndexedDB request failed'),
        'Local data unavailable.',
      ),
    ).toBe('IndexedDB request failed');
    expect(
      localizeUiError(
        'en-US',
        new Error('题库文件无效。'),
        'Operation failed.',
      ),
    ).toBe('Operation failed.');
  });
});
