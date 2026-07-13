import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';

import type { ProductRepositories } from '../application/product';
import { ApplicationShell } from '../components/layout/ApplicationShell';
import { ThemeProvider } from '../components/layout/ThemeProvider';
import { I18N_STORAGE_KEY, type Language } from '../i18n';
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

function renderApp(
  storedLanguage: Language | null = 'en-US',
  repositories?: ProductRepositories,
) {
  if (storedLanguage === null) window.localStorage.removeItem(I18N_STORAGE_KEY);
  else {
    window.localStorage.setItem(
      I18N_STORAGE_KEY,
      JSON.stringify({ language: storedLanguage }),
    );
  }
  const router = trackRouter(createAppRouter());
  return render(
    <App
      router={router}
      {...(repositories === undefined ? {} : { repositories })}
    />,
  );
}

function foundationRouteRepositories(): ProductRepositories {
  return {
    attempts: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue([]),
      listActive: vi.fn().mockResolvedValue([]),
      getVersion: vi.fn().mockResolvedValue(undefined),
      seed: vi.fn(),
    },
    content: {
      getActiveCatalog: vi.fn().mockResolvedValue(undefined),
      getActivePack: vi.fn().mockResolvedValue(undefined),
      getInstalledPack: vi.fn().mockResolvedValue(undefined),
      listInstalledPacks: vi.fn().mockResolvedValue([]),
      countHistoricalCaseVersions: vi.fn().mockResolvedValue(0),
      listActiveDomains: vi.fn().mockResolvedValue([]),
      listActiveSkills: vi.fn().mockResolvedValue([]),
      findDomainDefinition: vi.fn().mockResolvedValue(undefined),
      findSkillDefinition: vi.fn().mockResolvedValue(undefined),
    },
    contentManagement: {} as ProductRepositories['contentManagement'],
    mistakes: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    progress: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      commitCompletion: vi.fn(),
      clear: vi.fn(),
      exportUserData: vi.fn(),
      replaceUserData: vi.fn(),
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
    },
    skills: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      saveMany: vi.fn(),
    },
  };
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
    document.documentElement.removeAttribute('lang');
    document.documentElement.style.removeProperty('color-scheme');
    window.localStorage.clear();
    window.matchMedia = defaultMatchMedia;
    vi.restoreAllMocks();
  });

  it('opens in Simplified Chinese and switches the whole shell to English', async () => {
    const user = userEvent.setup();
    setRoute('/');
    renderApp(null);

    expect(screen.getByRole('heading', { name: '首页' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '语言' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(I18N_STORAGE_KEY)).toBe(
      JSON.stringify({ language: 'en-US' }),
    );
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

  it('places Foundation in the accessible mobile More drawer and focuses its page', async () => {
    const user = userEvent.setup();
    setRoute('/');
    renderApp('en-US', foundationRouteRepositories());

    await user.click(screen.getByRole('button', { name: 'More' }));
    const drawer = screen.getByRole('dialog', { name: 'More destinations' });
    const foundation = within(drawer).getByRole('link', {
      name: 'Foundation',
    });
    expect(foundation).toHaveAttribute('href', '#/foundation');

    await user.click(foundation);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Foundation Knowledge' }),
      ).toHaveFocus();
    });
  });

  it('routes Foundation detail inside the shell with desktop active state', async () => {
    installResponsiveMatchMedia(true);
    setRoute('/foundation/api-basic');
    renderApp('en-US', foundationRouteRepositories());

    expect(
      await screen.findByRole(
        'heading',
        { name: 'API：系统之间可验证的协作契约' },
        { timeout: 3000 },
      ),
    ).toBeVisible();
    const desktopNavigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    });
    expect(
      within(desktopNavigation).getByRole('link', { name: 'Foundation' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(window.location.hash).toBe('#/foundation/api-basic');
    expect(screen.getByTestId('context-bar')).toBeInTheDocument();
    expect(
      within(desktopNavigation).getByRole('link', { name: 'Foundation' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('focuses the stable detail heading when navigating from the Foundation library', async () => {
    const user = userEvent.setup();
    setRoute('/foundation');
    renderApp('en-US', foundationRouteRepositories());

    const detail = await screen.findByRole('link', {
      name: 'API：系统之间可验证的协作契约',
    });
    await user.click(detail);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'API：系统之间可验证的协作契约',
        }),
      ).toHaveFocus();
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
