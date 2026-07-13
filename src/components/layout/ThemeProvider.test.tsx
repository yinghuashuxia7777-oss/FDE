import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider, ThemeSelector } from './ThemeProvider';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  let listener: ChangeListener | undefined;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() {
        return matches;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_type: string, next: ChangeListener) => {
        listener = next;
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  return {
    change(nextMatches: boolean) {
      matches = nextMatches;
      listener?.({ matches: nextMatches } as MediaQueryListEvent);
    },
  };
}

describe('ThemeProvider', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
    vi.restoreAllMocks();
  });

  it('offers labeled light, dark, and system choices', async () => {
    installMatchMedia(false);
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
  });

  it('reacts to operating-system changes while system theme is selected', () => {
    const media = installMatchMedia(false);
    render(
      <ThemeProvider initialTheme="system">
        <ThemeSelector />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'system');
    expect(document.documentElement.style.colorScheme).toBe('light');

    media.change(true);

    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
