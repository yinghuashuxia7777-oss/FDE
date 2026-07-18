import type { ReactNode } from 'react';

import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import type { AsyncDataState } from '../application/product';
import { localizeUiError, useI18n } from '../i18n';

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
  const { language, t } = useI18n();

  if (state.status === 'loading') {
    return <LoadingState label={t('shared.loadingWorkspace')} />;
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        title={t('shared.dataUnavailable')}
        message={localizeUiError(language, state.error, t('shared.loadFailed'))}
        onRetry={retry}
      />
    );
  }
  return children(state.data);
}

export function NoData({ action }: { action?: ReactNode }) {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t('shared.noTrainingSignal')}
      description={t('shared.noTrainingSignalDescription')}
      action={action}
    />
  );
}
