import {
  BookOpenText,
  ChartPolar,
  FolderOpen,
  Gear,
  House,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

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

const desktopDestinations = [
  { to: '/', labelKey: 'nav.dashboard', Icon: House, end: true },
  {
    to: '/foundation',
    labelKey: 'nav.foundation',
    Icon: BookOpenText,
    end: false,
  },
  { to: '/cases', labelKey: 'nav.cases', Icon: FolderOpen, end: false },
  { to: '/skills', labelKey: 'nav.skills', Icon: ChartPolar, end: false },
  {
    to: '/mistakes',
    labelKey: 'nav.mistakes',
    Icon: WarningCircle,
    end: false,
  },
  { to: '/profile', labelKey: 'nav.profile', Icon: UserCircle, end: false },
  { to: '/settings', labelKey: 'nav.settings', Icon: Gear, end: false },
] as const;

export function ApplicationShell() {
  const { t } = useI18n();
  const desktop = useMediaQuery('(min-width: 64rem)');
  const mobileDrawerOpenRef = useRef(false);
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    mobileDrawerOpenRef.current = open;
  }, []);

  useEffect(() => {
    if (!desktop || !mobileDrawerOpenRef.current) return;

    mobileDrawerOpenRef.current = false;
    document.getElementById('page-title')?.focus();
  }, [desktop]);

  return (
    <div className="application-shell">
      <SkipLink />
      {desktop ? (
        <aside
          className="desktop-sidebar"
          aria-label={t('shell.applicationSidebar')}
        >
          <NavLink
            className="brand-lockup"
            to="/"
            aria-label={t('shell.homeLabel')}
          >
            <span className="brand-lockup__mark" aria-hidden="true">
              {t('shell.brandMark')}
            </span>
            <span>
              <strong>{t('shell.brandProduct')}</strong>
              <small>{t('shell.tagline')}</small>
            </span>
          </NavLink>
          <nav
            className="desktop-navigation"
            aria-label={t('shell.primaryNavigation')}
          >
            {desktopDestinations.map(({ to, labelKey, Icon, end }) => (
              <NavLink className="nav-link" end={end} key={to} to={to}>
                <Icon aria-hidden="true" size={20} />
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-status" role="status">
            <span className="status-dot" aria-hidden="true" />
            {t('shell.localReady')}
          </div>
        </aside>
      ) : null}

      <div className="workspace-column">
        <header className="context-bar" data-testid="context-bar">
          <div className="context-bar__identity">
            <span className="context-bar__brand">{t('shell.brandName')}</span>
            <span className="context-bar__channel">
              {t('shell.contentReady')}
            </span>
          </div>
          <div className="context-bar__identity context-bar__controls">
            <LanguageSwitcher compact />
            <ThemeSelector compact />
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
