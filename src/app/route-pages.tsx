import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useLocation,
  useRouteError,
} from 'react-router-dom';

import { SkipLink } from '../components/layout/ApplicationShell';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { localizeUiError, useI18n } from '../i18n';

export function RouteFrame() {
  const location = useLocation();
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    document.getElementById('page-title')?.focus();
  }, [location.pathname]);

  return <Outlet />;
}

interface PlaceholderPageProps {
  description: string;
  eyebrow: string;
  title: string;
}

export function PlaceholderPage({
  description,
  eyebrow,
  title,
}: PlaceholderPageProps) {
  const { t } = useI18n();

  return (
    <section className="page-placeholder" aria-labelledby="page-title">
      <div className="page-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-title" tabIndex={-1}>
          {title}
        </h1>
        <p>{description}</p>
      </div>
      <div
        className="placeholder-console"
        aria-label={t('routes.placeholder.statusLabel', { title })}
      >
        <span className="placeholder-console__label">
          {t('routes.placeholder.channel')}
        </span>
        <span>{t('routes.placeholder.ready')}</span>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <section className="page-placeholder" aria-labelledby="page-title">
      <div className="page-intro">
        <p className="eyebrow">{t('routes.notFound.eyebrow')}</p>
        <h1 id="page-title" tabIndex={-1}>
          {t('routes.notFound.title')}
        </h1>
        <p>{t('routes.notFound.description')}</p>
      </div>
      <Link className="button button--primary" to="/">
        {t('routes.returnToDashboard')}
      </Link>
    </section>
  );
}

export function RouterErrorPage() {
  const error = useRouteError();
  const { language, t } = useI18n();
  const message = isRouteErrorResponse(error)
    ? t('routes.error.http', {
        status: error.status,
        statusText: (() => {
          const value = localizeUiError(language, error.statusText, '');
          return value === '' ? '' : ` ${value}`;
        })(),
      })
    : t('routes.error.fallback');

  return (
    <main className="standalone-state" aria-labelledby="router-error-title">
      <section className="state-panel state-panel--error" role="alert">
        <p className="eyebrow">{t('routes.error.eyebrow')}</p>
        <h1 id="router-error-title">{t('routes.error.title')}</h1>
        <p>{message}</p>
        <a className="button button--secondary" href="#/">
          {t('routes.returnToDashboard')}
        </a>
      </section>
    </main>
  );
}

export function TrainingShell() {
  const { t } = useI18n();

  return (
    <div className="training-shell">
      <SkipLink />
      <header className="training-bar">
        <Link className="training-exit" to="/cases">
          <ArrowLeft aria-hidden="true" size={20} />
          {t('routes.training.exit')}
        </Link>
        <div className="context-bar__identity training-bar__controls">
          <span className="training-bar__mode">
            {t('routes.training.mode')}
          </span>
          <LanguageSwitcher compact />
        </div>
      </header>
      <main
        id="main-content"
        className="training-main"
        aria-labelledby="page-title"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  );
}

export function TrainingLandingPage() {
  const { t } = useI18n();

  return (
    <section className="page-placeholder" aria-labelledby="page-title">
      <div className="page-intro">
        <p className="eyebrow">{t('routes.training.mode')}</p>
        <h1 id="page-title" tabIndex={-1}>
          {t('routes.training.title')}
        </h1>
        <p>{t('routes.training.description')}</p>
      </div>
      <Link className="button button--primary" to="/cases">
        {t('routes.training.openCases')}
      </Link>
    </section>
  );
}
