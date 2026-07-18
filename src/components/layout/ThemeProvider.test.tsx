import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  ThemeSelector,
} from './ThemeProvider';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();
  const addEventListener = vi.fn((_type: string, next: ChangeListener) => {
    listeners.add(next);
  });
  const removeEventListener = vi.fn(
    (_type: string, listener: ChangeListener) => {
      listeners.delete(listener);
    },
  );
  const matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  });

  return {
    addEventListener,
    change(nextMatches: boolean) {
      matches = nextMatches;
      for (const listener of listeners) {
        listener({ matches: nextMatches } as MediaQueryListEvent);
      }
    },
    listenerCount: () => listeners.size,
    matchMedia,
    removeEventListener,
  };
}

describe('ThemeProvider', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it('follows the operating-system theme by default', () => {
    const media = installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue(
      'system',
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'system');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(media.matchMedia).toHaveBeenCalledOnce();
  });

  it('offers labeled light, dark, and system choices', async () => {
    const media = installMatchMedia(false);
    const user = userEvent.setup();
    render(
      <ThemeProvider initialTheme="light">
        <ThemeSelector />
      </ThemeProvider>,
    );

    const selector = screen.getByRole('combobox', { name: 'Theme' });
    expect(selector).toHaveValue('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    await user.selectOptions(selector, 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(media.matchMedia).not.toHaveBeenCalled();
    expect(media.addEventListener).not.toHaveBeenCalled();
  });

  it('reacts to operating-system changes while system theme is selected', () => {
    const media = installMatchMedia(false);
    const view = render(
      <ThemeProvider initialTheme="system">
        <ThemeSelector />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'system');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(media.listenerCount()).toBe(1);

    media.change(true);

    expect(document.documentElement.style.colorScheme).toBe('dark');

    view.unmount();
    expect(media.listenerCount()).toBe(0);
    expect(media.removeEventListener).toHaveBeenCalledOnce();
  });

  it('restores a saved theme preference on the next mount', async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    const first = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Theme' }),
      'dark',
    );
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(
      JSON.stringify({ theme: 'dark' }),
    );
    first.unmount();

    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark');
  });
});
