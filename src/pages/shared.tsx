import type { ReactNode } from 'react';

import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import type { AsyncDataState } from '../application/product';

export function PageHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="page-title" tabIndex={-1}>
        {title}
      </h1>
      <p>{description}</p>
    </header>
  );
}

export function AsyncPage<T>({
  state,
  retry,
  children,
}: {
  state: AsyncDataState<T>;
  retry: () => void;
  children: (data: T) => ReactNode;
}) {
  if (state.status === 'loading') {
    return <LoadingState label="Loading local workspace data" />;
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        title="Local data unavailable"
        message={state.error}
        onRetry={retry}
      />
    );
  }
  return children(state.data);
}

export function NoData({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      title="No training signal yet"
      description="Complete your first case to generate recommendations, mastery signals, and mistake history."
      action={action}
    />
  );
}
