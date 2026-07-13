import { Link } from 'react-router-dom';

import {
  buildFoundationTrackProgress,
  foundationStatus,
  selectNextFoundation,
} from '../../application/foundation';
import {
  buildDailyTrainingPlan,
  buildDomainSignals,
  calculateTrainingStreak,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import {
  bundledFoundationSource,
  type FoundationSource,
} from '../../content/foundation-source';
import { StatusBadge } from '../../components/ui';
import type {
  FoundationLearningStatus,
  FoundationTrack,
} from '../../domain/foundation/types';
import { useI18n } from '../../i18n';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, NoData, PageHeader } from '../shared';

interface DashboardPageProps {
  foundationSource?: FoundationSource;
  repositories?: ProductRepositories;
  now?: Date;
}

const levelRank = { beginner: 0, intermediate: 1, advanced: 2 } as const;

type Translate = ReturnType<typeof useI18n>['t'];

const masteryStatusKeys = {
  'Not started': 'product.common.mastery.notStarted',
  Weak: 'product.common.mastery.weak',
  Learning: 'product.common.mastery.learning',
  Competent: 'product.common.mastery.competent',
  Proficient: 'product.common.mastery.proficient',
} as const;

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

function translateDailyReason(t: Translate, reason: string): string {
  const exactReasons: Record<string, string> = {
    'Completed today. Review the decision path while it is fresh.':
      'dashboard.daily.reason.completedToday',
    'Revisit a case with a recorded critical-risk decision.':
      'dashboard.daily.reason.revisitCritical',
    'Retry a recent failed case while the evidence is fresh.':
      'dashboard.daily.reason.retryFailed',
    'Continue today with an uncompleted FDE scenario.':
      'dashboard.daily.reason.continueUncompleted',
    'Maintain daily practice with a stable fallback case.':
      'dashboard.daily.reason.stableFallback',
  };
  const exactKey = exactReasons[reason];
  if (exactKey !== undefined) return t(exactKey);

  const criticalSkill =
    /^Transfer the critical-risk skill (.+) into this scenario\.$/.exec(reason);
  if (criticalSkill?.[1] !== undefined) {
    return t('dashboard.daily.reason.transferCritical', {
      skill: criticalSkill[1],
    });
  }
  const weakSkills = /^Strengthen (.+) while mastery is below 40\.$/.exec(
    reason,
  );
  if (weakSkills?.[1] !== undefined) {
    return t('dashboard.daily.reason.strengthenWeak', {
      skills: weakSkills[1],
    });
  }
  const competentSkill =
    /^Verify the newly learned (.+) skill in another scenario\.$/.exec(reason);
  if (competentSkill?.[1] !== undefined) {
    return t('dashboard.daily.reason.verifyCompetent', {
      skill: competentSkill[1],
    });
  }
  return reason;
}

function translateErrorType(t: Translate, value: string): string {
  const key = `product.errorType.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

export function DashboardPage({
  foundationSource = bundledFoundationSource,
  repositories: override,
  now,
}: DashboardPageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [
      cases,
      progress,
      mastery,
      mistakes,
      attempts,
      domainDefinitions,
      skillDefinitions,
      foundationItems,
    ] = await Promise.all([
      source.cases.listActive({ status: 'published' }),
      source.progress.list(LOCAL_USER_ID),
      source.skills.list(LOCAL_USER_ID),
      source.mistakes.list({ userId: LOCAL_USER_ID }),
      source.attempts.list({ userId: LOCAL_USER_ID }),
      source.content.listActiveDomains(),
      source.content.listActiveSkills(),
      foundationSource.loadAll(),
    ]);
    return {
      cases,
      progress,
      mastery,
      mistakes,
      attempts,
      domainDefinitions,
      skillDefinitions,
      foundationItems,
    };
  }, [foundationSource, getRepositories]);

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        description={t('dashboard.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({
          cases,
          progress,
          mastery,
          mistakes,
          attempts,
          domainDefinitions,
          skillDefinitions,
          foundationItems,
        }) => {
          const visibleCases = cases.filter(
            ({ level, status }) =>
              status === 'published' &&
              (level === 'beginner' ||
                level === 'intermediate' ||
                level === 'advanced'),
          );
          const visibleCaseIds = new Set(visibleCases.map(({ id }) => id));
          const visibleProgress = progress.filter(({ caseId }) =>
            visibleCaseIds.has(caseId),
          );
          const visibleAttempts = attempts.filter(
            (attempt) =>
              attempt.status === 'completed' &&
              visibleCaseIds.has(attempt.caseId),
          );
          const visibleMistakes = mistakes.filter(({ caseId }) =>
            visibleCaseIds.has(caseId),
          );
          const visibleSkills = new Set(
            visibleCases.flatMap(({ skills }) => skills),
          );
          const completedCases = new Set(
            visibleProgress.map(({ caseId }) => caseId),
          ).size;
          const completedAttempts = visibleAttempts.length;
          const passes = visibleAttempts.filter(
            (attempt) =>
              attempt.status === 'completed' &&
              (attempt.verdict === 'excellent' || attempt.verdict === 'pass'),
          ).length;
          const critical = visibleMistakes.filter(
            ({ critical: isCritical }) => isCritical,
          ).length;
          const dailyPlan = buildDailyTrainingPlan(
            visibleCases,
            visibleProgress,
            mastery,
            mistakes,
            visibleAttempts,
            now,
          );
          const foundationTracks = buildFoundationTrackProgress(
            foundationItems,
            mastery,
            attempts,
          );
          const nextFoundation = selectNextFoundation(
            foundationItems,
            mastery,
            attempts,
          );
          const foundationCta = nextFoundation ?? foundationItems[0];
          const foundationCtaStatus =
            foundationCta === undefined
              ? undefined
              : foundationStatus(foundationCta, mastery, attempts);
          const dailyItems = [
            ...(dailyPlan.focusCase === undefined ? [] : [dailyPlan.focusCase]),
            ...dailyPlan.nextCases,
          ];
          const firstUnfinishedCaseId = dailyItems.find(
            ({ completedToday }) => !completedToday,
          )?.caseSummary.id;
          const domains = buildDomainSignals(
            domainDefinitions,
            skillDefinitions,
            mastery,
          );
          const skillDefinitionsById = new Map(
            skillDefinitions.map((definition) => [definition.id, definition]),
          );
          const weak = [...mastery]
            .filter(
              ({ sampleCount, score, skillId }) =>
                visibleSkills.has(skillId) && sampleCount > 0 && score < 40,
            )
            .sort((left, right) => left.score - right.score)
            .slice(0, 5);
          const passedCaseIds = new Set(
            visibleProgress
              .filter(
                ({ latestVerdict }) =>
                  latestVerdict === 'excellent' || latestVerdict === 'pass',
              )
              .map(({ caseId }) => caseId),
          );
          const highestPassedLevel = visibleCases
            .filter(
              ({ id, level }) =>
                id !== '' && level in levelRank && passedCaseIds.has(id),
            )
            .sort(
              (left, right) =>
                levelRank[right.level as keyof typeof levelRank] -
                levelRank[left.level as keyof typeof levelRank],
            )[0]?.level;
          const levelProgress = (level: keyof typeof levelRank) => {
            const available = visibleCases.filter(
              (summary) => summary.level === level,
            );
            const completed = available.filter(({ id }) =>
              visibleProgress.some((record) => record.caseId === id),
            ).length;
            return available.length === 0
              ? t('product.common.notAvailable')
              : `${completed} / ${available.length}`;
          };
          const streakDays = calculateTrainingStreak(
            visibleAttempts.map(({ updatedAt }) => updatedAt),
            now,
          );
          return (
            <div className="product-stack">
              <section
                className="today-training panel"
                aria-labelledby="today-training-title"
              >
                <div className="daily-plan__header">
                  <div>
                    <p className="eyebrow">{t('dashboard.daily.eyebrow')}</p>
                    <h2 id="today-training-title">
                      {t('dashboard.daily.title')}
                    </h2>
                  </div>
                  <p className="daily-plan__summary">
                    {t('dashboard.daily.summary', {
                      completed: dailyPlan.completedCount,
                      planned: dailyPlan.plannedCount,
                      minutes: dailyPlan.estimatedMinutes,
                    })}
                  </p>
                </div>
                {dailyPlan.focusCase === undefined ? (
                  <div className="daily-plan__empty">
                    <p>{t('dashboard.daily.empty')}</p>
                    <Link className="button button--secondary" to="/cases">
                      {t('dashboard.daily.browseCases')}
                    </Link>
                  </div>
                ) : (
                  <>
                    <article className="daily-plan__focus">
                      <div>
                        <p className="eyebrow">
                          {t('dashboard.daily.focusCase')}
                        </p>
                        <h3>{dailyPlan.focusCase.caseSummary.title}</h3>
                        <p>
                          {translateDailyReason(t, dailyPlan.focusCase.reason)}
                        </p>
                      </div>
                      <div className="daily-plan__actions">
                        {dailyPlan.focusCase.completedToday ? (
                          <>
                            <StatusBadge tone="success">
                              {t('product.common.completed')}
                            </StatusBadge>
                            <span>
                              {t('product.common.score', {
                                score: dailyPlan.focusCase.score ?? '',
                              })}
                            </span>
                            <Link
                              className="button button--secondary"
                              to={`/debrief/${dailyPlan.focusCase.attemptId}`}
                            >
                              {t('product.common.review')}
                            </Link>
                          </>
                        ) : dailyPlan.focusCase.caseSummary.id ===
                          firstUnfinishedCaseId ? (
                          <Link
                            className="button button--primary"
                            to={`/training/${dailyPlan.focusCase.caseSummary.id}`}
                          >
                            {t('product.common.trainCase', {
                              title: dailyPlan.focusCase.caseSummary.title,
                            })}
                          </Link>
                        ) : null}
                      </div>
                    </article>

                    <div className="daily-plan__next">
                      <h3>{t('dashboard.daily.nextRecommendations')}</h3>
                      {dailyPlan.nextCases.length === 0 ? (
                        <p>{t('dashboard.daily.noAdditional')}</p>
                      ) : (
                        <ol className="daily-plan__list">
                          {dailyPlan.nextCases.map((item) => (
                            <li key={item.caseSummary.id}>
                              <div>
                                <h4>{item.caseSummary.title}</h4>
                                <p>{translateDailyReason(t, item.reason)}</p>
                              </div>
                              <div className="daily-plan__actions">
                                {item.completedToday ? (
                                  <>
                                    <StatusBadge tone="success">
                                      {t('product.common.completed')}
                                    </StatusBadge>
                                    <span>
                                      {t('product.common.score', {
                                        score: item.score ?? '',
                                      })}
                                    </span>
                                    <Link
                                      className="button button--secondary"
                                      to={`/debrief/${item.attemptId}`}
                                    >
                                      {t('product.common.review')}
                                    </Link>
                                  </>
                                ) : item.caseSummary.id ===
                                  firstUnfinishedCaseId ? (
                                  <Link
                                    className="button button--primary"
                                    to={`/training/${item.caseSummary.id}`}
                                  >
                                    {t('product.common.trainCase', {
                                      title: item.caseSummary.title,
                                    })}
                                  </Link>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </>
                )}
              </section>

              <section
                className="foundation-dashboard panel"
                aria-labelledby="dashboard-foundation-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      {t('foundation.dashboard.eyebrow')}
                    </p>
                    <h2 id="dashboard-foundation-title">
                      {t('foundation.dashboard.title')}
                    </h2>
                  </div>
                  <Link to="/foundation">
                    {t('foundation.dashboard.openLibrary')}
                  </Link>
                </div>
                <p>{t('foundation.dashboard.description')}</p>
                <div className="foundation-track-grid">
                  {foundationTracks.map((track) => {
                    const trackLabel = t(foundationTrackKeys[track.track]);
                    return (
                      <article
                        className="foundation-track-card"
                        key={track.track}
                      >
                        <div>
                          <strong>{trackLabel}</strong>
                          <span>
                            {t('foundation.library.progress', {
                              mastered: track.mastered,
                              total: track.total,
                            })}
                          </span>
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
                      </article>
                    );
                  })}
                </div>
                {foundationCta === undefined ||
                foundationCtaStatus === undefined ? null : (
                  <div className="foundation-dashboard__next">
                    <div>
                      <p>
                        {t('foundation.dashboard.nextItem', {
                          title: foundationCta.title,
                        })}
                      </p>
                      <StatusBadge
                        tone={
                          foundationCtaStatus === 'mastered'
                            ? 'success'
                            : foundationCtaStatus === 'learning'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {t(foundationStatusKeys[foundationCtaStatus])}
                      </StatusBadge>
                    </div>
                    <Link
                      className="button button--primary"
                      to={`/foundation/${foundationCta.id}`}
                    >
                      {t(
                        nextFoundation === undefined
                          ? 'foundation.library.reviewFoundation'
                          : 'foundation.library.continueLearning',
                      )}
                    </Link>
                  </div>
                )}
              </section>

              <dl
                className="metric-strip"
                aria-label={t('dashboard.metrics.label')}
              >
                <div>
                  <dt>{t('dashboard.metrics.totalCases')}</dt>
                  <dd>{visibleCases.length}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.metrics.completedCases')}</dt>
                  <dd>{completedCases}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.metrics.completedAttempts')}</dt>
                  <dd>{completedAttempts}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.metrics.currentLevel')}</dt>
                  <dd>
                    {highestPassedLevel === undefined
                      ? t('dashboard.metrics.notEstablished')
                      : t(`product.common.level.${highestPassedLevel}`)}
                  </dd>
                </div>
                <div>
                  <dt>{t('dashboard.metrics.currentStreak')}</dt>
                  <dd>
                    {t(
                      streakDays === 1
                        ? 'dashboard.metrics.dayOne'
                        : 'dashboard.metrics.days',
                      { days: streakDays },
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('dashboard.metrics.passRate')}</dt>
                  <dd>
                    {visibleAttempts.length === 0
                      ? t('product.common.notAvailable')
                      : `${Math.round((passes / visibleAttempts.length) * 100)}%`}
                  </dd>
                </div>
                <div>
                  <dt>{t('dashboard.metrics.criticalRisks')}</dt>
                  <dd>{critical}</dd>
                </div>
              </dl>

              <dl
                className="metric-strip"
                aria-label={t('dashboard.levelProgress.label')}
              >
                <div>
                  <dt>{t('dashboard.level.beginner')}</dt>
                  <dd>{levelProgress('beginner')}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.level.intermediate')}</dt>
                  <dd>{levelProgress('intermediate')}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.level.advanced')}</dt>
                  <dd>{levelProgress('advanced')}</dd>
                </div>
              </dl>

              {completedCases === 0 ? <NoData /> : null}

              <section
                className="panel"
                aria-labelledby="domain-overview-title"
              >
                <div className="section-heading">
                  <h2 id="domain-overview-title">
                    {t('dashboard.domain.title')}
                  </h2>
                  <Link to="/skills">{t('dashboard.domain.openSkillMap')}</Link>
                </div>
                <div className="domain-grid">
                  {domains.map((domain) => (
                    <article key={domain.id} className="domain-cell">
                      <strong>{domain.label}</strong>
                      <span>
                        {domain.score === undefined
                          ? t('product.common.notAvailable')
                          : `${Math.round(domain.score)} / 100`}
                      </span>
                      <StatusBadge
                        tone={domain.status === 'Weak' ? 'warning' : 'neutral'}
                      >
                        {t(masteryStatusKeys[domain.status])}
                      </StatusBadge>
                    </article>
                  ))}
                </div>
              </section>

              <div className="product-split">
                <section className="panel" aria-labelledby="weak-skills-title">
                  <h2 id="weak-skills-title">
                    {t('dashboard.weakSkills.title')}
                  </h2>
                  {weak.length === 0 ? (
                    <p>{t('dashboard.weakSkills.empty')}</p>
                  ) : (
                    <ol className="ranked-list">
                      {weak.map((record) => (
                        <li key={record.skillId}>
                          <span>
                            {skillDefinitionsById.get(record.skillId)?.label ??
                              record.skillId}
                          </span>
                          <strong>{Math.round(record.score)} / 100</strong>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
                <section
                  className="panel"
                  aria-labelledby="recent-mistakes-title"
                >
                  <h2 id="recent-mistakes-title">
                    {t('dashboard.recentMistakes.title')}
                  </h2>
                  {visibleMistakes.length === 0 ? (
                    <p>{t('dashboard.recentMistakes.empty')}</p>
                  ) : (
                    <ul className="plain-list">
                      {visibleMistakes.slice(0, 5).map((mistake) => (
                        <li key={mistake.id}>
                          <Link to={`/debrief/${mistake.attemptId}`}>
                            {mistake.caseId}:{' '}
                            {mistake.errorTypes
                              .map((value) => translateErrorType(t, value))
                              .join(', ')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
