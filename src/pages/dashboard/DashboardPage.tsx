import { Link } from 'react-router-dom';

import {
  buildDomainSignals,
  calculateTrainingStreak,
  recommendCases,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { StatusBadge } from '../../components/ui';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, NoData, PageHeader } from '../shared';

interface DashboardPageProps {
  repositories?: ProductRepositories;
  now?: Date;
}

const levelRank = { beginner: 0, intermediate: 1, advanced: 2 } as const;

export function DashboardPage({
  repositories: override,
  now,
}: DashboardPageProps) {
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [cases, progress, mastery, mistakes, attempts] = await Promise.all([
      source.cases.list({ status: 'published' }),
      source.progress.list(LOCAL_USER_ID),
      source.skills.list(LOCAL_USER_ID),
      source.mistakes.list({ userId: LOCAL_USER_ID }),
      source.attempts.list({ userId: LOCAL_USER_ID, status: 'completed' }),
    ]);
    return { cases, progress, mastery, mistakes, attempts };
  }, [getRepositories]);

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow="Operational overview"
        title="Dashboard"
        description="Resume deliberate practice from local evidence, not generic activity targets."
      />
      <AsyncPage state={state} retry={retry}>
        {({ cases, progress, mastery, mistakes, attempts }) => {
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
          const visibleAttempts = attempts.filter(({ caseId }) =>
            visibleCaseIds.has(caseId),
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
          const recommendations = recommendCases(
            visibleCases,
            visibleProgress,
            mastery,
            mistakes,
          );
          const domains = buildDomainSignals(visibleCases, mastery);
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
              ? 'N/A'
              : `${completed} / ${available.length}`;
          };
          return (
            <div className="product-stack">
              <section
                className="today-training panel"
                aria-labelledby="today-training-title"
              >
                <div>
                  <p className="eyebrow">Today&apos;s training</p>
                  <h2 id="today-training-title">
                    {recommendations[0]?.caseSummary.title ??
                      'Choose your first field case'}
                  </h2>
                  <p>
                    {recommendations[0]?.reason ??
                      'No local result exists yet; choose a case to establish a baseline.'}
                  </p>
                </div>
                <Link
                  className="button button--primary"
                  to={
                    recommendations[0] === undefined
                      ? '/cases'
                      : `/training/${recommendations[0].caseSummary.id}`
                  }
                >
                  {completedCases === 0
                    ? 'Start first case'
                    : 'Start recommended case'}
                </Link>
              </section>

              <dl className="metric-strip" aria-label="Training metrics">
                <div>
                  <dt>Total cases</dt>
                  <dd>{visibleCases.length}</dd>
                </div>
                <div>
                  <dt>Completed cases</dt>
                  <dd>{completedCases}</dd>
                </div>
                <div>
                  <dt>Completed attempts</dt>
                  <dd>{completedAttempts}</dd>
                </div>
                <div>
                  <dt>Current level</dt>
                  <dd>{highestPassedLevel ?? 'Not established'}</dd>
                </div>
                <div>
                  <dt>Current streak</dt>
                  <dd>
                    {calculateTrainingStreak(
                      visibleAttempts.map(({ updatedAt }) => updatedAt),
                      now,
                    )}{' '}
                    days
                  </dd>
                </div>
                <div>
                  <dt>Pass rate</dt>
                  <dd>
                    {visibleAttempts.length === 0
                      ? 'N/A'
                      : `${Math.round((passes / visibleAttempts.length) * 100)}%`}
                  </dd>
                </div>
                <div>
                  <dt>Critical risks</dt>
                  <dd>{critical}</dd>
                </div>
              </dl>

              <dl className="metric-strip" aria-label="Level progress">
                <div>
                  <dt>Beginner</dt>
                  <dd>{levelProgress('beginner')}</dd>
                </div>
                <div>
                  <dt>Intermediate</dt>
                  <dd>{levelProgress('intermediate')}</dd>
                </div>
                <div>
                  <dt>Advanced</dt>
                  <dd>{levelProgress('advanced')}</dd>
                </div>
              </dl>

              {completedCases === 0 ? <NoData /> : null}

              <section
                className="panel"
                aria-labelledby="recommendations-title"
              >
                <div className="section-heading">
                  <h2 id="recommendations-title">Recommended cases</h2>
                  <Link to="/cases">Browse all cases</Link>
                </div>
                {recommendations.length === 0 ? (
                  <p>
                    No published case is available for a data-backed
                    recommendation.
                  </p>
                ) : (
                  <ol className="ranked-list">
                    {recommendations
                      .slice(0, 5)
                      .map(({ caseSummary, reason }) => (
                        <li key={caseSummary.id}>
                          <div>
                            <Link to={`/training/${caseSummary.id}`}>
                              {caseSummary.title}
                            </Link>
                            <p>{reason}</p>
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
              </section>

              <section
                className="panel"
                aria-labelledby="domain-overview-title"
              >
                <div className="section-heading">
                  <h2 id="domain-overview-title">Fourteen-domain overview</h2>
                  <Link to="/skills">Open skill map</Link>
                </div>
                <div className="domain-grid">
                  {domains.map((domain) => (
                    <article key={domain.id} className="domain-cell">
                      <strong>{domain.label}</strong>
                      <span>
                        {domain.score === undefined
                          ? 'N/A'
                          : `${Math.round(domain.score)} / 100`}
                      </span>
                      <StatusBadge
                        tone={domain.status === 'Weak' ? 'warning' : 'neutral'}
                      >
                        {domain.status}
                      </StatusBadge>
                    </article>
                  ))}
                </div>
              </section>

              <div className="product-split">
                <section className="panel" aria-labelledby="weak-skills-title">
                  <h2 id="weak-skills-title">Weak skills</h2>
                  {weak.length === 0 ? (
                    <p>No evidence-backed weak skill yet.</p>
                  ) : (
                    <ol className="ranked-list">
                      {weak.map((record) => (
                        <li key={record.skillId}>
                          <span>{record.skillId}</span>
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
                  <h2 id="recent-mistakes-title">Recent mistakes</h2>
                  {visibleMistakes.length === 0 ? (
                    <p>No mistakes have been recorded.</p>
                  ) : (
                    <ul className="plain-list">
                      {visibleMistakes.slice(0, 5).map((mistake) => (
                        <li key={mistake.id}>
                          <Link to={`/debrief/${mistake.attemptId}`}>
                            {mistake.caseId}: {mistake.errorTypes.join(', ')}
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
