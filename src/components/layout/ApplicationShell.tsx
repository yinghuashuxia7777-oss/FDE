import {
  BookOpenText,
  ChartPolar,
  ClipboardText,
  FolderOpen,
  Gear,
  House,
  MagnifyingGlass,
  Sparkle,
  UserCircle,
  WarningCircle,
  ChatCircleText,
} from '@phosphor-icons/react';
import type { FormEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useI18n } from '../../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNavigation } from './MobileNavigation';
import { ThemeSelector } from './ThemeProvider';
import { useMediaQuery } from './useMediaQuery';

export function SkipLink() {
  const { t } = useI18n();
  const focusMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  };

  return (
    <a className="skip-link" href="#main-content" onClick={focusMain}>
      {t('shell.skipToMain')}
    </a>
  );
}

const growthDestinations = [
  { to: '/', labelKey: 'nav.dashboard', Icon: House, end: true },
  {
    to: '/skills',
    labelKey: 'nav.skillGraph',
    Icon: ChartPolar,
    end: false,
  },
  { to: '/projects', labelKey: 'nav.projects', Icon: FolderOpen, end: false },
  { labelKey: 'nav.mentor', Icon: Sparkle, disabled: true },
  {
    to: '/profile',
    labelKey: 'nav.evidence',
    Icon: ClipboardText,
    end: false,
  },
] as const;

const workspaceDestinations = [
  { to: '/foundation', labelKey: 'nav.knowledge', Icon: BookOpenText },
  { to: '/practices', labelKey: 'nav.practices', Icon: ClipboardText },
  { to: '/projects', labelKey: 'nav.projects', Icon: FolderOpen },
  { to: '/cases', labelKey: 'nav.cases', Icon: FolderOpen },
  { to: '/mistakes', labelKey: 'nav.mistakes', Icon: WarningCircle },
  { to: '/profile', labelKey: 'nav.profile', Icon: UserCircle },
  { to: '/settings', labelKey: 'nav.settings', Icon: Gear },
  { to: '/feedback', labelKey: 'nav.feedback', Icon: ChatCircleText },
] as const;

export function ApplicationShell() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 80rem)');
  const mobileDrawerOpenRef = useRef(false);
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    mobileDrawerOpenRef.current = open;
  }, []);

  useEffect(() => {
    if (!desktop || !mobileDrawerOpenRef.current) return;

    mobileDrawerOpenRef.current = false;
    document.getElementById('page-title')?.focus();
  }, [desktop]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('workspace-search');
    const query = typeof value === 'string' ? value.trim() : '';
    void navigate(
      query === '' ? '/cases' : `/cases?q=${encodeURIComponent(query)}`,
    );
  };

  const searchValue =
    location.pathname === '/cases'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : '';

  return (
    <div className="application-shell application-shell--growth-os">
      <SkipLink />
      <div className="workspace-column">
        <header className="growth-os-header" data-testid="context-bar">
          <NavLink
            className="brand-lockup growth-os-brand"
            to="/"
            aria-label={t('shell.homeLabel')}
          >
            <span className="growth-os-brand__mark" aria-hidden="true">
              <span />
            </span>
            <span>
              <strong>{t('shell.growthBrand')}</strong>
              <small>{t('shell.growthBrandSubtitle')}</small>
            </span>
          </NavLink>

          {desktop ? (
            <nav
              className="growth-os-navigation"
              aria-label={t('shell.primaryNavigation')}
            >
              {growthDestinations.map((destination) => {
                const { Icon, labelKey } = destination;
                if ('disabled' in destination) {
                  return (
                    <span
                      aria-disabled="true"
                      aria-label={t(labelKey)}
                      className="growth-os-nav-link"
                      key={labelKey}
                      role="link"
                      title={t('shell.comingSoon')}
                    >
                      <Icon aria-hidden="true" size={19} />
                      <span>{t(labelKey)}</span>
                      <small>{t('shell.comingSoon')}</small>
                    </span>
                  );
                }
                return (
                  <NavLink
                    className="growth-os-nav-link"
                    end={destination.end}
                    key={destination.to}
                    to={destination.to}
                  >
                    <Icon aria-hidden="true" size={19} />
                    <span>{t(labelKey)}</span>
                  </NavLink>
                );
              })}
            </nav>
          ) : null}

          <div className="growth-os-header__controls">
            <LanguageSwitcher variant="header" />
            <ThemeSelector compact />
            <details className="growth-workspace-menu">
              <summary aria-label={t('shell.workspaceMenu.open')} role="button">
                <UserCircle aria-hidden="true" size={24} weight="duotone" />
                <span aria-hidden="true">FDE</span>
              </summary>
              <div className="growth-workspace-menu__panel">
                <div className="growth-workspace-menu__heading">
                  <strong>{t('shell.workspaceMenu.title')}</strong>
                  <span>
                    <span className="status-dot" aria-hidden="true" />
                    {t('shell.localReady')}
                  </span>
                </div>
                <form
                  className="workspace-search"
                  aria-label={t('shell.searchLabel')}
                  onSubmit={submitSearch}
                  role="search"
                >
                  <MagnifyingGlass aria-hidden="true" size={18} />
                  <label className="sr-only" htmlFor="workspace-search">
                    {t('shell.searchLabel')}
                  </label>
                  <input
                    defaultValue={searchValue}
                    id="workspace-search"
                    key={`${location.pathname}:${location.search}`}
                    name="workspace-search"
                    placeholder={t('shell.searchPlaceholder')}
                    type="search"
                  />
                  <span aria-hidden="true">↵</span>
                </form>
                <nav
                  className="growth-workspace-navigation"
                  aria-label={t('shell.workspaceNavigation')}
                >
                  {workspaceDestinations.map(({ to, labelKey, Icon }) => (
                    <NavLink className="nav-link" key={to} to={to}>
                      <Icon aria-hidden="true" size={19} />
                      <span>{t(labelKey)}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            </details>
          </div>
        </header>

        <main
          id="main-content"
          className="workspace-main"
          aria-labelledby="page-title"
          tabIndex={-1}
        >
          <Outlet />
        </main>
        {desktop ? null : (
          <MobileNavigation onOpenChange={handleDrawerOpenChange} />
        )}
      </div>
    </div>
  );
}
