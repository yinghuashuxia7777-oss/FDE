import {
  ChartPolar,
  FolderOpen,
  Gear,
  House,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import type { MouseEvent } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { MobileNavigation } from './MobileNavigation';
import { ThemeSelector } from './ThemeProvider';
import { useMediaQuery } from './useMediaQuery';

export function SkipLink() {
  const focusMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  };

  return (
    <a className="skip-link" href="#main-content" onClick={focusMain}>
      Skip to main content
    </a>
  );
}

const desktopDestinations = [
  { to: '/', label: 'Dashboard', Icon: House, end: true },
  { to: '/cases', label: 'Cases', Icon: FolderOpen, end: false },
  { to: '/skills', label: 'Skills', Icon: ChartPolar, end: false },
  { to: '/mistakes', label: 'Mistakes', Icon: WarningCircle, end: false },
  { to: '/profile', label: 'Profile', Icon: UserCircle, end: false },
  { to: '/settings', label: 'Settings', Icon: Gear, end: false },
] as const;

export function ApplicationShell() {
  const desktop = useMediaQuery('(min-width: 64rem)');

  return (
    <div className="application-shell">
      <SkipLink />
      {desktop ? (
        <aside className="desktop-sidebar" aria-label="Application sidebar">
          <NavLink className="brand-lockup" to="/" aria-label="FDE Arena home">
            <span className="brand-lockup__mark" aria-hidden="true">
              FDE
            </span>
            <span>
              <strong>Arena</strong>
              <small>Field decision lab</small>
            </span>
          </NavLink>
          <nav className="desktop-navigation" aria-label="Primary navigation">
            {desktopDestinations.map(({ to, label, Icon, end }) => (
              <NavLink className="nav-link" end={end} key={to} to={to}>
                <Icon aria-hidden="true" size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-status" role="status">
            <span className="status-dot" aria-hidden="true" />
            Local workspace ready
          </div>
        </aside>
      ) : null}

      <div className="workspace-column">
        <header className="context-bar" data-testid="context-bar">
          <div className="context-bar__identity">
            <span className="context-bar__brand">FDE Arena</span>
            <span className="context-bar__channel">Local / content ready</span>
          </div>
          <ThemeSelector compact />
        </header>
        <main
          id="main-content"
          className="workspace-main"
          aria-labelledby="page-title"
          tabIndex={-1}
        >
          <Outlet />
        </main>
        {desktop ? null : <MobileNavigation />}
      </div>
    </div>
  );
}
