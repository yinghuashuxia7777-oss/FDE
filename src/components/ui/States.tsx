import { FolderOpen, SpinnerGap, WarningCircle } from '@phosphor-icons/react';

import { Button } from './Button';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <section className="state-panel state-panel--loading" aria-label={label}>
      <SpinnerGap
        className="state-panel__spinner"
        aria-hidden="true"
        size={24}
      />
      <p aria-live="polite">{label}</p>
    </section>
  );
}

interface EmptyStateProps {
  action?: React.ReactNode;
  description: string;
  title: string;
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <section
      className="state-panel state-panel--empty"
      aria-labelledby="empty-state-title"
    >
      <FolderOpen aria-hidden="true" size={24} />
      <h2 id="empty-state-title">{title}</h2>
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
