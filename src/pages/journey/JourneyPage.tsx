import {
  ArrowRight,
  CheckCircle,
  Circle,
  Flag,
  Path,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

import projectCatalog from '../../../content/projects/mvp/catalog.json';
import {
  growthJourneyStages,
  starterJourneyDays,
} from '../../application/onboarding';
import {
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { usePracticeEvidence } from '../../application/practice';
import { useLearningJourney } from '../../components/onboarding';
import { bundledFoundationSource } from '../../content/foundation-source';
import { mvpLeafSkills } from '../../content/mvp-capability-content';
import { mvpPractices } from '../../content/mvp-practice-source';
import { useI18n } from '../../i18n';
import { localizeFoundations } from '../../i18n/content-localization';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface JourneyPageProps {
  repositories?: ProductRepositories;
}

export function JourneyPage({ repositories: override }: JourneyPageProps) {
  const { language, t } = useI18n();
  const { goal, experienceLevel } = useLearningJourney();
  const { evidence, projectEvidence } = usePracticeEvidence();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [cases, attempts, foundations] = await Promise.all([
      source.cases.listActive({ status: 'published' }),
      source.attempts.list({ userId: LOCAL_USER_ID, status: 'completed' }),
      bundledFoundationSource.loadAll(),
    ]);
    return {
      cases,
      attempts,
      foundations: localizeFoundations(foundations, language),
    };
  }, [getRepositories, language]);

  return (
    <section className="product-page journey-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('journey.eyebrow')}
        title={t('journey.title')}
        description={t('journey.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({ cases, attempts, foundations }) => {
          const caseById = new Map(cases.map((item) => [item.id, item]));
          const foundationById = new Map(
            foundations.map((item) => [item.id, item]),
          );
          const practiceById = new Map(
            mvpPractices.map((item) => [item.id, item]),
          );
          const projectById = new Map(
            projectCatalog.projects.map((item) => [item.id, item]),
          );
          const skillById = new Map(
            mvpLeafSkills.map((item) => [item.id, item]),
          );
          const completedCases = new Set(attempts.map(({ caseId }) => caseId));
          const completedPractices = new Set(
            evidence.map(({ practiceId }) => practiceId),
          );
          const completedProjects = new Set(
            projectEvidence
              .filter(
                ({ completedMilestones }) => completedMilestones.length === 3,
              )
              .map(({ projectId }) => projectId),
          );
          const completedDays = starterJourneyDays.filter(
            (day) =>
              completedPractices.has(day.practiceId) &&
              completedCases.has(day.caseId) &&
              (day.projectId === undefined ||
                completedProjects.has(day.projectId)),
          ).length;

          return (
            <div className="journey-stack">
              <section className="growth-card journey-summary">
                <div>
                  <p className="eyebrow">{t('journey.summary.label')}</p>
                  <h2>{t('journey.summary.title')}</h2>
                  <p>
                    {t('journey.summary.preference', {
                      goal:
                        goal === undefined
                          ? t('journey.summary.goalFallback')
                          : t(`onboarding.goal.${goal}.title`),
                      level:
                        experienceLevel === undefined
                          ? t('journey.summary.levelFallback')
                          : t(`onboarding.level.${experienceLevel}`),
                    })}
                  </p>
                </div>
                <div className="journey-summary__progress">
                  <strong>{completedDays}/7</strong>
                  <span>{t('journey.summary.daysComplete')}</span>
                </div>
              </section>

              <section aria-labelledby="capability-path-title">
                <div className="section-heading">
                  <div>
                    <h2 id="capability-path-title">
                      {t('journey.path.title')}
                    </h2>
                  </div>
                  <p>{t('journey.path.description')}</p>
                </div>
                <ol className="journey-stage-list">
                  {growthJourneyStages.map((stage, index) => {
                    const practiceComplete = completedPractices.has(
                      stage.practiceId,
                    );
                    const caseComplete = completedCases.has(stage.caseId);
                    const projectComplete = completedProjects.has(
                      stage.projectId,
                    );
                    const hasEvidence =
                      practiceComplete || caseComplete || projectComplete;
                    return (
                      <li className="growth-card journey-stage" key={stage.id}>
                        <div className="journey-stage__marker">
                          <span>{index}</span>
                          {hasEvidence ? (
                            <CheckCircle aria-hidden="true" size={20} />
                          ) : (
                            <Circle aria-hidden="true" size={20} />
                          )}
                        </div>
                        <div className="journey-stage__content">
                          <span className="journey-stage__number">
                            {t('journey.stage.label', { stage: index })}
                          </span>
                          <h3>{t(`journey.stage.${stage.id}.title`)}</h3>
                          <p>{t(`journey.stage.${stage.id}.outcome`)}</p>
                          <div className="journey-stage__skills">
                            {stage.skillIds.map((id) => (
                              <span key={id}>
                                {skillById.get(id)?.name ?? id}
                              </span>
                            ))}
                          </div>
                        </div>
                        <dl className="journey-proof-list">
                          <div data-complete={practiceComplete || undefined}>
                            <dt>{t('journey.proof.practice')}</dt>
                            <dd>
                              <Link to={`/practices/${stage.practiceId}`}>
                                {practiceById.get(stage.practiceId)?.title ??
                                  stage.practiceId}
                              </Link>
                            </dd>
                          </div>
                          <div data-complete={caseComplete || undefined}>
                            <dt>{t('journey.proof.case')}</dt>
                            <dd>
                              <Link to={`/training/${stage.caseId}`}>
                                {caseById.get(stage.caseId)?.title ??
                                  stage.caseId}
                              </Link>
                            </dd>
                          </div>
                          <div data-complete={projectComplete || undefined}>
                            <dt>{t('journey.proof.project')}</dt>
                            <dd>
                              <Link to={`/projects/${stage.projectId}`}>
                                {projectById.get(stage.projectId)?.title ??
                                  stage.projectId}
                              </Link>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section aria-labelledby="starter-journey-title">
                <div className="section-heading">
                  <div>
                    <h2 id="starter-journey-title">
                      {t('journey.starter.title')}
                    </h2>
                  </div>
                  <p>{t('journey.starter.description')}</p>
                </div>
                <ol className="starter-journey-grid">
                  {starterJourneyDays.map((day) => {
                    const complete =
                      completedPractices.has(day.practiceId) &&
                      completedCases.has(day.caseId) &&
                      (day.projectId === undefined ||
                        completedProjects.has(day.projectId));
                    return (
                      <li
                        className="growth-card starter-day"
                        data-complete={complete || undefined}
                        key={day.day}
                      >
                        <div className="starter-day__heading">
                          <span>
                            {t('journey.starter.day', { day: day.day })}
                          </span>
                          {complete ? (
                            <CheckCircle aria-hidden="true" size={20} />
                          ) : (
                            <Flag aria-hidden="true" size={20} />
                          )}
                        </div>
                        <h3>{t(`journey.day${String(day.day)}.title`)}</h3>
                        <p>
                          {foundationById.get(day.foundationId)?.title ??
                            day.foundationId}
                        </p>
                        <Link to={`/practices/${day.practiceId}`}>
                          {t('journey.starter.start')}
                          <ArrowRight aria-hidden="true" size={16} />
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <footer className="growth-card journey-next-action">
                <Path aria-hidden="true" size={28} />
                <div>
                  <h2>{t('journey.next.title')}</h2>
                  <p>{t('journey.next.description')}</p>
                </div>
                <Link className="button button--primary" to="/">
                  {t('journey.next.dashboard')}
                </Link>
              </footer>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
