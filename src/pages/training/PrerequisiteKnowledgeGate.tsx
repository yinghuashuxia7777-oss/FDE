import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import type { FoundationItemProgress } from '../../application/foundation';
import { StatusBadge } from '../../components/ui';
import type { FoundationLearningStatus } from '../../domain/foundation/types';
import { useI18n } from '../../i18n';

interface PrerequisiteKnowledgeGateProps {
  error: boolean;
  onStart: () => void;
  pending: boolean;
  prerequisites: readonly FoundationItemProgress[];
}

const statusKeys: Record<FoundationLearningStatus, string> = {
  'not-started': 'foundation.status.notStarted',
  learning: 'foundation.status.learning',
  mastered: 'foundation.status.mastered',
};

function statusTone(status: FoundationLearningStatus) {
  if (status === 'mastered') return 'success' as const;
  if (status === 'learning') return 'warning' as const;
  return 'neutral' as const;
}

export function PrerequisiteKnowledgeGate({
  error,
  onStart,
  pending,
  prerequisites,
}: PrerequisiteKnowledgeGateProps) {
  const { t } = useI18n();
  const pageTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    pageTitleRef.current?.focus();
  }, []);

  return (
    <section className="training-session-page" aria-labelledby="page-title">
      <div className="panel product-stack">
        <header className="page-intro">
          <p className="eyebrow">{t('foundation.prerequisite.eyebrow')}</p>
          <h1 id="page-title" ref={pageTitleRef} tabIndex={-1}>
            {t('foundation.prerequisite.title')}
          </h1>
          <p>{t('foundation.prerequisite.description')}</p>
        </header>

        <section aria-labelledby="prerequisite-list-title">
          <h2 id="prerequisite-list-title">
            {t('foundation.prerequisite.recommended')}
          </h2>
          <ul className="plain-list">
            {prerequisites.map(({ item, status }) => (
              <li className="panel" key={item.id}>
                <div className="section-heading">
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {t('foundation.prerequisite.itemMeta', {
                        minutes: item.estimatedMinutes,
                      })}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(status)}>
                    {t(statusKeys[status])}
                  </StatusBadge>
                </div>
                <Link to={`/foundation/${item.id}`}>
                  {t('foundation.prerequisite.learn', { title: item.title })}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {error ? (
          <p role="alert">{t('foundation.prerequisite.startFailed')}</p>
        ) : null}
        <div className="button-row">
          <button
            className="button button--primary"
            type="button"
            disabled={pending}
            onClick={onStart}
          >
            {t(
              pending
                ? 'foundation.prerequisite.starting'
                : 'foundation.prerequisite.startDirect',
            )}
          </button>
          <p>{t('foundation.prerequisite.bypassNote')}</p>
        </div>
      </div>
    </section>
  );
}
