import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';

import { ApplicationShell } from '../components/layout/ApplicationShell';
import { ThemeProvider } from '../components/layout/ThemeProvider';
import { App } from './App';
import { RouteFrame } from './route-pages';
import { createAppRouter } from './router';

const defaultMatchMedia = window.matchMedia;
const activeRouters = new Set<{ dispose: () => void }>();

function setRoute(path: string) {
  window.history.replaceState(null, '', `/#${path}`);
}

function trackRouter<T extends { dispose: () => void }>(router: T) {
  activeRouters.add(router);
  return router;
}

function renderApp() {
  const router = trackRouter(createAppRouter());
  return render(<App router={router} />);
}

function installResponsiveMatchMedia(initialDesktop: boolean) {
  let desktop = initialDesktop;
  const listeners = new Map<
    string,
    Set<(event: MediaQueryListEvent) => void>
  >();

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query === '(min-width: 64rem)' ? desktop : false;
    },
    media: query,
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      const queryListeners = listeners.get(query) ?? new Set();
      queryListeners.add(listener);
      listeners.set(query, queryListeners);
    },
    removeEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      listeners.get(query)?.delete(listener);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  return {
    listenerCount(query: string) {
      return listeners.get(query)?.size ?? 0;
    },
    setDesktop(nextDesktop: boolean) {
      desktop = nextDesktop;
      for (const listener of listeners.get('(min-width: 64rem)') ?? []) {
        listener({ matches: nextDesktop } as MediaQueryListEvent);
      }
    },
  };
}

describe('application shell', () => {
  afterEach(() => {
    for (const router of activeRouters) router.dispose();
    activeRouters.clear();
    setRoute('/');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
    window.matchMedia = defaultMatchMedia;
    vi.restoreAllMocks();
  });

  it('exposes only mobile navigation below the desktop boundary', () => {
    setRoute('/cases');
    renderApp();

    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Mobile navigation',
    });

    expect(mobileNavigation).toHaveClass('mobile-bottom-nav');
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument();
    expect(
      within(mobileNavigation).getByRole('link', { name: 'Cases' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('exposes only desktop navigation at the desktop boundary', () => {
    installResponsiveMatchMedia(true);
    setRoute('/cases');
    renderApp();

    const desktopNavigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    });
    expect(desktopNavigation).toHaveClass('desktop-navigation');
    expect(
      within(desktopNavigation).getByRole('link', { name: 'Cases' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('navigation', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the hash route while the skip link focuses main content', async () => {
    const user = userEvent.setup();
    setRoute('/cases?level=advanced');
    renderApp();
    const routeHash = window.location.hash;

    await user.click(
      screen.getByRole('link', { name: 'Skip to main content' }),
    );

    expect(window.location.hash).toBe(routeHash);
    expect(screen.getByRole('main', { name: 'Cases' })).toHaveFocus();
  });

  it('focuses the page heading after client-side route changes, not on load', async () => {
    const user = userEvent.setup();
    setRoute('/');
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).not.toHaveFocus();
    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await user.click(
      within(mobileNavigation).getByRole('link', { name: 'Cases' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cases' })).toHaveFocus();
    });
    expect(window.location.hash).toBe('#/cases');
  });

  it('does not steal focus when only search parameters change', async () => {
    const user = userEvent.setup();
    const router = trackRouter(
      createMemoryRouter(
        [
          {
            path: '/',
            element: <RouteFrame />,
            children: [
              {
                element: <ApplicationShell />,
                children: [
                  {
                    path: 'cases',
                    element: (
                      <>
                        <h1 id="page-title" tabIndex={-1}>
                          Cases
                        </h1>
                        <Link to="?level=advanced">Advanced cases</Link>
                      </>
                    ),
                  },
                ],
              },
            ],
          },
        ],
        { initialEntries: ['/cases'] },
      ),
    );
    render(
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>,
    );
    const queryLink = screen.getByRole('link', { name: 'Advanced cases' });
    await user.click(queryLink);

    expect(queryLink).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Cases' })).not.toHaveFocus();
  });

  it('opens an accessible More drawer and traps focus until Escape restores it', async () => {
    const user = userEvent.setup();
    setRoute('/');
    renderApp();
    const trigger = screen.getByRole('button', { name: 'More' });
    expect(trigger).toHaveAttribute(
      'aria-controls',
      'more-destinations-drawer',
    );

    await user.click(trigger);

    const drawer = screen.getByRole('dialog', { name: 'More destinations' });
    expect(drawer).toHaveAttribute('id', 'more-destinations-drawer');
    expect(document.getElementById('main-content')).toHaveAttribute('inert');
    expect(document.getElementById('main-content')?.inert).toBe(true);
    expect(screen.getByTestId('context-bar')).toHaveAttribute('inert');
    expect(screen.getByTestId('context-bar').inert).toBe(true);
    expect(document.querySelector('.mobile-bottom-nav')).toHaveAttribute(
      'inert',
    );
    expect(
      document.querySelector<HTMLElement>('.mobile-bottom-nav')?.inert,
    ).toBe(true);
    const close = within(drawer).getByRole('button', {
      name: 'Close more destinations',
    });
    const settings = within(drawer).getByRole('link', { name: 'Settings' });
    expect(close).toHaveFocus();

    settings.focus();
    await user.tab();
    expect(close).toHaveFocus();

    close.focus();
    await user.tab({ shift: true });
    expect(settings).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.getElementById('main-content')).not.toHaveAttribute(
      'inert',
    );
    expect(document.getElementById('main-content')?.inert).not.toBe(true);
    expect(screen.getByTestId('context-bar')).not.toHaveAttribute('inert');
    expect(document.querySelector('.mobile-bottom-nav')).not.toHaveAttribute(
      'inert',
    );
  });

  it('closes the drawer on navigation without restoring focus over the new heading', async () => {
    const user = userEvent.setup();
    setRoute('/');
    renderApp();

    await user.click(screen.getByRole('button', { name: 'More' }));
    const drawer = screen.getByRole('dialog', { name: 'More destinations' });
    await user.click(within(drawer).getByRole('link', { name: 'Settings' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toHaveFocus();
    });
  });

  it('closes an open mobile drawer when the desktop boundary is crossed', async () => {
    const media = installResponsiveMatchMedia(false);
    const user = userEvent.setup();
    setRoute('/');
    const view = renderApp();
    expect(media.listenerCount('(min-width: 64rem)')).toBe(1);
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      media.setDesktop(true);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toHaveFocus();
    expect(document.getElementById('main-content')).not.toHaveAttribute(
      'inert',
    );
    expect(screen.getByTestId('context-bar')).not.toHaveAttribute('inert');

    view.unmount();
    expect(media.listenerCount('(min-width: 64rem)')).toBe(0);
  });

  it('uses an immersive training shell with a clear exit', () => {
    setRoute('/training');
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Training' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exit training' })).toHaveAttribute(
      'href',
      '#/cases',
    );
    expect(
      screen.queryByRole('navigation', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-bar')).not.toBeInTheDocument();
  });

  it('focuses the training heading when entering immersive mode', async () => {
    const user = userEvent.setup();
    setRoute('/');
    renderApp();
    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Mobile navigation',
    });

    await user.click(
      within(mobileNavigation).getByRole('link', { name: 'Training' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Training' })).toHaveFocus();
    });
  });

  it('shows a useful not-found route', () => {
    setRoute('/missing-route');
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Return to dashboard' }),
    ).toBeInTheDocument();
  });

  it('uses one caller-owned history listener under StrictMode and disposes it', () => {
    setRoute('/');
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const router = trackRouter(createAppRouter());

    const view = render(
      <StrictMode>
        <App router={router} />
      </StrictMode>,
    );

    expect(
      addListener.mock.calls.filter(([type]) => type === 'popstate'),
    ).toHaveLength(1);

    view.unmount();
    router.dispose();
    activeRouters.delete(router);

    expect(
      removeListener.mock.calls.filter(([type]) => type === 'popstate'),
    ).toHaveLength(1);
  });
});
