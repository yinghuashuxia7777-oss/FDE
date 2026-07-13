import { FolderOpen, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { type ReactNode, useId } from 'react';

import { Button } from './Button';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <section
      className="state-panel state-panel--loading"
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <SpinnerGap
        className="state-panel__spinner"
        aria-hidden="true"
        size={24}
      />
      <p>{label}</p>
    </section>
  );
}

interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      className="state-panel state-panel--empty"
      aria-labelledby={titleId}
    >
      <FolderOpen aria-hidden="true" size={24} />
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  title: string;
}

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  return (
    <section className="state-panel state-panel--error" role="alert">
      <WarningCircle aria-hidden="true" size={24} />
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry === undefined ? null : (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </section>
  );
}
