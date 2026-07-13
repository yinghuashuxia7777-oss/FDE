import {
  BookOpenText,
  ChartPolar,
  Crosshair,
  DotsThree,
  FolderOpen,
  Gear,
  House,
  UserCircle,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useI18n } from '../../i18n';

const drawerDestinations = [
  { to: '/foundation', labelKey: 'nav.foundation', Icon: BookOpenText },
  { to: '/mistakes', labelKey: 'nav.mistakes', Icon: WarningCircle },
  { to: '/profile', labelKey: 'nav.profile', Icon: UserCircle },
  { to: '/settings', labelKey: 'nav.settings', Icon: Gear },
] as const;

const drawerId = 'more-destinations-drawer';

interface MobileNavigationProps {
  onOpenChange: (open: boolean) => void;
}

interface InertSnapshot {
  element: HTMLElement;
  hadAttribute: boolean;
  inert: boolean;
}

function makeBackgroundInert() {
  const elements = [
    document.getElementById('main-content'),
    document.querySelector<HTMLElement>('.context-bar'),
    document.querySelector<HTMLElement>('.mobile-bottom-nav'),
  ].filter((element): element is HTMLElement => element !== null);
  const snapshots: InertSnapshot[] = elements.map((element) => ({
    element,
    hadAttribute: element.hasAttribute('inert'),
    inert: element.inert,
  }));

  for (const { element } of snapshots) {
    element.inert = true;
    element.setAttribute('inert', '');
  }

  return () => {
    for (const snapshot of snapshots) {
      snapshot.element.inert = snapshot.inert;
      if (snapshot.hadAttribute) snapshot.element.setAttribute('inert', '');
      else snapshot.element.removeAttribute('inert');
    }
  };
}

export function MobileNavigation({ onOpenChange }: MobileNavigationProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const restoreTriggerRef = useRef(false);
  const location = useLocation();
  const secondaryRoute = drawerDestinations.some(({ to }) =>
    location.pathname.startsWith(to),
  );

  const closeDrawer = useCallback(() => {
    restoreTriggerRef.current = true;
    onOpenChange(false);
    setOpen(false);
  }, [onOpenChange]);

  const followDrawerLink = () => {
    restoreTriggerRef.current = false;
    onOpenChange(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      if (restoreTriggerRef.current) {
        restoreTriggerRef.current = false;
        triggerRef.current?.focus();
      }
      return;
    }

    const restoreBackground = makeBackgroundInert();
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);

      if (!drawerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreBackground();
    };
  }, [closeDrawer, open]);

  return (
    <>
      <nav
        className="mobile-bottom-nav"
        aria-label={t('shell.mobileNavigation')}
      >
        <NavLink className="mobile-nav-link" end to="/">
          <House aria-hidden="true" size={21} />
          <span>{t('nav.home')}</span>
        </NavLink>
        <NavLink className="mobile-nav-link" to="/cases">
          <FolderOpen aria-hidden="true" size={21} />
          <span>{t('nav.cases')}</span>
        </NavLink>
        <NavLink className="mobile-nav-link" to="/training">
          <Crosshair aria-hidden="true" size={21} />
          <span>{t('nav.training')}</span>
        </NavLink>
        <NavLink className="mobile-nav-link" to="/skills">
          <ChartPolar aria-hidden="true" size={21} />
          <span>{t('nav.skills')}</span>
        </NavLink>
        <button
          ref={triggerRef}
          className="mobile-nav-link"
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={drawerId}
          data-active={secondaryRoute || undefined}
          onClick={() => {
            onOpenChange(true);
            setOpen(true);
          }}
        >
          <DotsThree aria-hidden="true" size={21} />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {open ? (
        <div className="drawer-layer">
          <button
            className="drawer-scrim"
            type="button"
            aria-label={t('shell.dismissMoreDestinations')}
            tabIndex={-1}
            onClick={closeDrawer}
          />
          <aside
            id={drawerId}
            ref={drawerRef}
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-destinations-title"
          >
            <div className="mobile-drawer__header">
              <div>
                <p className="eyebrow">{t('shell.navigationEyebrow')}</p>
                <h2 id="more-destinations-title">
                  {t('shell.moreDestinations')}
                </h2>
              </div>
              <button
                ref={closeRef}
                className="icon-button"
                type="button"
                aria-label={t('shell.closeMoreDestinations')}
                onClick={closeDrawer}
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>
            <nav
              className="drawer-navigation"
              aria-label={t('shell.secondaryNavigation')}
            >
              {drawerDestinations.map(({ to, labelKey, Icon }) => (
                <NavLink
                  className="nav-link"
                  key={to}
                  to={to}
                  onClick={followDrawerLink}
                >
                  <Icon aria-hidden="true" size={20} />
                  <span>{t(labelKey)}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
