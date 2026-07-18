import { FolderOpen, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { useI18n } from '../../i18n';
import { Button } from './Button';

interface LoadingStateProps {
  focusTitle?: boolean;
  label?: string;
  titleAs?: 'h1' | 'h2' | 'p';
  titleId?: string;
}

interface StateTitleProps {
  children: ReactNode;
  focus: boolean;
  id?: string;
  renderAs: 'h1' | 'h2' | 'p';
}

function StateTitle({ children, focus, id, renderAs }: StateTitleProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focus) headingRef.current?.focus();
  }, [focus]);

  if (renderAs === 'h1') {
    return (
      <h1 id={id} ref={headingRef} tabIndex={focus ? -1 : undefined}>
        {children}
      </h1>
    );
  }
  if (renderAs === 'h2') {
    return (
      <h2 id={id} ref={headingRef} tabIndex={focus ? -1 : undefined}>
        {children}
      </h2>
    );
  }
  return <p id={id}>{children}</p>;
}

export function LoadingState({
  focusTitle = false,
  label,
  titleAs = 'p',
  titleId,
}: LoadingStateProps) {
  const { t } = useI18n();
  const resolvedLabel = label ?? t('ui.loading');

  return (
    <section
      className="state-panel state-panel--loading"
      role="status"
      aria-label={resolvedLabel}
      aria-live="polite"
    >
      <SpinnerGap
        className="state-panel__spinner"
        aria-hidden="true"
        size={24}
      />
      <StateTitle
        focus={focusTitle}
        renderAs={titleAs}
        {...(titleId === undefined ? {} : { id: titleId })}
      >
        {resolvedLabel}
      </StateTitle>
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
  focusTitle?: boolean;
  message: string;
  onRetry?: () => void;
  title: string;
  titleAs?: 'h1' | 'h2';
  titleId?: string;
}

export function ErrorState({
  focusTitle = false,
  message,
  onRetry,
  title,
  titleAs = 'h2',
  titleId,
}: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <section className="state-panel state-panel--error" role="alert">
      <WarningCircle aria-hidden="true" size={24} />
      <StateTitle
        focus={focusTitle}
        renderAs={titleAs}
        {...(titleId === undefined ? {} : { id: titleId })}
      >
        {title}
      </StateTitle>
      <p>{message}</p>
      {onRetry === undefined ? null : (
        <Button variant="secondary" onClick={onRetry}>
          {t('ui.retry')}
        </Button>
      )}
    </section>
  );
}
