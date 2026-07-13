import { ArrowLeft } from '@phosphor-icons/react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

import { SkipLink } from '../components/layout/ApplicationShell';

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
        aria-label={`${title} workspace status`}
      >
        <span className="placeholder-console__label">Workspace channel</span>
        <span>Ready for local training data</span>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section className="page-placeholder" aria-labelledby="page-title">
      <div className="page-intro">
        <p className="eyebrow">Route 404</p>
        <h1 id="page-title" tabIndex={-1}>
          Page not found
        </h1>
        <p>The requested workspace does not exist in this local build.</p>
      </div>
      <Link className="button button--primary" to="/">
        Return to dashboard
      </Link>
    </section>
  );
}

export function RouterErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${String(error.status)} ${error.statusText}`
    : 'The workspace could not be rendered.';

  return (
    <main className="standalone-state" aria-labelledby="router-error-title">
      <section className="state-panel state-panel--error" role="alert">
        <p className="eyebrow">Application error</p>
        <h1 id="router-error-title">Workspace unavailable</h1>
        <p>{message}</p>
        <a className="button button--secondary" href="#/">
          Return to dashboard
        </a>
      </section>
    </main>
  );
}

export function TrainingShell() {
  return (
    <div className="training-shell">
      <SkipLink />
      <header className="training-bar">
        <Link className="training-exit" to="/cases">
          <ArrowLeft aria-hidden="true" size={20} />
          Exit training
        </Link>
        <span className="training-bar__mode">Focused decision mode</span>
      </header>
      <main
        id="main-content"
        className="training-main"
        aria-labelledby="page-title"
        tabIndex={-1}
      >
        <section className="page-placeholder">
          <div className="page-intro">
            <p className="eyebrow">Active case</p>
            <h1 id="page-title" tabIndex={-1}>
              Training
            </h1>
            <p>Scene, evidence, and decision tools load here.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
