import { Link } from 'react-router-dom';

import {
  buildFoundationTrackProgress,
  foundationStatus,
  selectNextFoundation,
} from '../../application/foundation';
import {
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import {
  bundledFoundationSource,
  type FoundationSource,
} from '../../content/foundation-source';
import { EmptyState, StatusBadge } from '../../components/ui';
import type {
  FoundationLearningStatus,
  FoundationTrack,
} from '../../domain/foundation/types';
import { useI18n } from '../../i18n';
import { localizeFoundations } from '../../i18n/content-localization';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface FoundationLibraryPageProps {
  foundationSource?: FoundationSource;
  repositories?: ProductRepositories;
}

const foundationTrackKeys: Record<FoundationTrack, string> = {
  'computer-basics': 'foundation.track.computerBasics',
  'network-api': 'foundation.track.networkApi',
  'ai-basics': 'foundation.track.aiBasics',
};

const foundationStatusKeys: Record<FoundationLearningStatus, string> = {
  'not-started': 'foundation.status.notStarted',
  learning: 'foundation.status.learning',
  mastered: 'foundation.status.mastered',
};

function statusTone(status: FoundationLearningStatus) {
  if (status === 'mastered') return 'success' as const;
  if (status === 'learning') return 'warning' as const;
  return 'neutral' as const;
}

export function FoundationLibraryPage({
  foundationSource = bundledFoundationSource,
  repositories: override,
}: FoundationLibraryPageProps) {
  const { language, t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [items, mastery, attempts] = await Promise.all([
      foundationSource.loadAll(),
      source.skills.list(LOCAL_USER_ID),
      source.attempts.list({ userId: LOCAL_USER_ID }),
    ]);
    return {
      items: localizeFoundations(items, language),
      mastery,
      attempts,
    };
  }, [foundationSource, getRepositories, language]);

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('foundation.library.eyebrow')}
        title={t('foundation.library.title')}
        description={t('foundation.library.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({ items, mastery, attempts }) => {
          if (items.length === 0) {
            return (
              <EmptyState
                title={t('foundation.library.empty.title')}
                description={t('foundation.library.empty.description')}
              />
            );
          }

          const tracks = buildFoundationTrackProgress(items, mastery, attempts);
          const overall = tracks.reduce(
            (summary, track) => ({
              mastered: summary.mastered + track.mastered,
              total: summary.total + track.total,
            }),
            { mastered: 0, total: 0 },
          );
          const overallPercent =
            overall.total === 0
              ? 0
              : Math.round((overall.mastered / overall.total) * 100);
          const next = selectNextFoundation(items, mastery, attempts);
          const continueItem = next ?? items[0];

          return (
            <div className="product-stack">
              <div className="foundation-library-overview">
                <section
                  className="foundation-overall panel"
                  aria-labelledby="foundation-overall-title"
                >
                  <div className="foundation-track__heading">
                    <div>
                      <p className="eyebrow">
                        {t('foundation.library.overallEyebrow')}
                      </p>
                      <h2 id="foundation-overall-title">
                        {t('foundation.library.overallTitle')}
                      </h2>
                    </div>
                    <strong>{t('foundation.library.progress', overall)}</strong>
                  </div>
                  <progress
                    aria-label={t('foundation.library.overallProgressLabel', {
                      mastered: overall.mastered,
                      total: overall.total,
                    })}
                    max={overall.total || 1}
                    value={overall.mastered}
                  >
                    {overallPercent}%
                  </progress>
                </section>

                {continueItem === undefined ? null : (
                  <section
                    className="foundation-continue panel"
                    aria-labelledby="foundation-continue-title"
                  >
                    <div>
                      <p className="eyebrow">
                        {t('foundation.library.continueTitle')}
                      </p>
                      <h2 id="foundation-continue-title">
                        {continueItem.title}
                      </h2>
                      <p>{t('foundation.library.continueDescription')}</p>
                    </div>
                    <Link
                      className="button button--primary"
                      to={`/foundation/${continueItem.id}`}
                    >
                      {t(
                        next === undefined
                          ? 'foundation.library.reviewFoundation'
                          : 'foundation.library.continueLearning',
                      )}
                    </Link>
                  </section>
                )}
              </div>

              {tracks.map((track) => {
                const trackItems = items.filter(
                  (item) => item.track === track.track,
                );
                const titleId = `foundation-track-${track.track}`;
                const trackLabel = t(foundationTrackKeys[track.track]);
                return (
                  <section
                    className={`foundation-track foundation-track--${track.track} panel`}
                    aria-labelledby={titleId}
                    data-track={track.track}
                    key={track.track}
                  >
                    <div className="foundation-track__heading">
                      <div>
                        <h2 id={titleId}>{trackLabel}</h2>
                        <p>
                          {t('foundation.library.trackSummary', {
                            learning: track.learning,
                            notStarted: track.notStarted,
                          })}
                        </p>
                      </div>
                      <strong>
                        {t('foundation.library.progress', {
                          mastered: track.mastered,
                          total: track.total,
                        })}
                      </strong>
                    </div>
                    <progress
                      aria-label={t('foundation.library.progressLabel', {
                        track: trackLabel,
                        mastered: track.mastered,
                        total: track.total,
                      })}
                      max={track.total || 1}
                      value={track.mastered}
                    >
                      {track.percent}%
                    </progress>
                    <div className="case-grid foundation-card-grid">
                      {trackItems.map((item) => {
                        const status = foundationStatus(
                          item,
                          mastery,
                          attempts,
                        );
                        return (
                          <article
                            className="case-card foundation-card"
                            data-status={status}
                            key={item.id}
                          >
                            <div className="case-card__header">
                              <div>
                                <p className="eyebrow">
                                  {t(`product.common.level.${item.level}`)}
                                </p>
                                <h3>
                                  <Link to={`/foundation/${item.id}`}>
                                    {item.title}
                                  </Link>
                                </h3>
                              </div>
                              <StatusBadge tone={statusTone(status)}>
                                {t(foundationStatusKeys[status])}
                              </StatusBadge>
                            </div>
                            <p>
                              {t('foundation.library.itemMeta', {
                                level: t(`product.common.level.${item.level}`),
                                minutes: item.estimatedMinutes,
                              })}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
