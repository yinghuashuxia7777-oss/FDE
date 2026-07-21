import { Link } from 'react-router-dom';

import {
  buildGrowthRoadmap,
  growthJourneyStages,
  isNewLearner,
  selectFirstMission,
  type GrowthGoal,
  type LearnerStartingPoint,
} from '../../application/onboarding';
import type { SkillDefinition } from '../../content/contracts';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import type { FoundationKnowledge } from '../../domain/foundation/types';
import type {
  AttemptRecord,
  CaseProgressRecord,
  CaseSummary,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { useI18n } from '../../i18n';
import { useLearningJourney } from './LearningJourneyContext';

export interface NewUserLearningJourneyProps {
  attempts: readonly AttemptRecord[];
  cases: readonly CaseSummary[];
  concepts: readonly ConceptKnowledge[] | undefined;
  foundations: readonly FoundationKnowledge[];
  mastery: readonly SkillMasteryRecord[];
  progress: readonly CaseProgressRecord[];
  skills: readonly SkillDefinition[];
}

const startingPoints: LearnerStartingPoint[] = [
  'zero-basics',
  'programming-basics',
  'ai-project',
];

const goals: readonly GrowthGoal[] = [
  'become-ai-engineer',
  'improve-ai-engineering-skills',
  'prepare-fde-career',
];

const startingPointKeys: Record<
  LearnerStartingPoint,
  { description: string; title: string }
> = {
  'zero-basics': {
    title: 'onboarding.start.zero.title',
    description: 'onboarding.start.zero.description',
  },
  'programming-basics': {
    title: 'onboarding.start.programming.title',
    description: 'onboarding.start.programming.description',
  },
  'ai-project': {
    title: 'onboarding.start.aiProject.title',
    description: 'onboarding.start.aiProject.description',
  },
};

export function NewUserLearningJourney({
  attempts,
  cases,
  concepts,
  foundations,
  mastery,
  progress,
  skills,
}: NewUserLearningJourneyProps) {
  const { t } = useI18n();
  const {
    completedMissionIds,
    completeMission,
    goal,
    selectGoal,
    selectStartingPoint,
    startingPoint,
    visitedFoundationIds,
  } = useLearningJourney();
  if (!isNewLearner(progress, mastery, attempts)) return null;

  const mission =
    startingPoint === undefined || goal === undefined
      ? undefined
      : selectFirstMission({
          attempts,
          cases,
          completedMissionIds: [...completedMissionIds],
          foundations,
          mastery,
          progress,
          startingPoint,
        });
  const roadmap = buildGrowthRoadmap({
    concepts: concepts ?? [],
    foundations,
    skills,
  });
  const guideConcept = concepts
    ?.filter((concept) =>
      mission?.kind === 'foundation'
        ? concept.relatedFoundation.includes(mission.id)
        : mission?.kind === 'case'
          ? concept.relatedCases.includes(mission.id)
          : false,
    )
    .sort(
      (left, right) =>
        left.order - right.order || left.id.localeCompare(right.id),
    )[0];

  if (completedMissionIds.size > 0) {
    return (
      <section
        className="onboarding-journey onboarding-journey--complete panel"
        aria-labelledby="onboarding-complete-title"
      >
        <p className="eyebrow">{t('onboarding.mode.label')}</p>
        <h2 id="onboarding-complete-title">{t('onboarding.complete.title')}</h2>
        <p>{t('onboarding.complete.description')}</p>
        <div className="button-row">
          <Link className="button button--primary" to="/journey">
            {t('onboarding.complete.journey')}
          </Link>
          <Link className="button button--secondary" to="/practices">
            {t('onboarding.complete.practice')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="onboarding-journey panel"
      aria-labelledby="onboarding-title"
    >
      <header className="onboarding-journey__welcome">
        <p className="eyebrow">{t('onboarding.mode.label')}</p>
        <h2 id="onboarding-title">{t('onboarding.welcome.title')}</h2>
        <p>{t('onboarding.welcome.description')}</p>
        <p>{t('onboarding.welcome.value')}</p>
      </header>

      <fieldset className="onboarding-starting-points onboarding-goals">
        <legend>{t('onboarding.goal.legend')}</legend>
        <div className="onboarding-starting-points__grid">
          {goals.map((item) => (
            <label htmlFor={`onboarding-goal-${item}`} key={item}>
              <input
                checked={goal === item}
                id={`onboarding-goal-${item}`}
                name="onboarding-goal"
                onChange={() => selectGoal(item)}
                type="radio"
                value={item}
              />
              <span>
                {t(`onboarding.goal.${item}.title`)}
                <small>{t(`onboarding.goal.${item}.description`)}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="onboarding-starting-points">
        <legend>{t('onboarding.start.legend')}</legend>
        <div className="onboarding-starting-points__grid">
          {startingPoints.map((point) => (
            <label htmlFor={`onboarding-start-${point}`} key={point}>
              <input
                checked={startingPoint === point}
                id={`onboarding-start-${point}`}
                name="onboarding-starting-point"
                onChange={() => selectStartingPoint(point)}
                type="radio"
                value={point}
              />
              <span>
                {t(startingPointKeys[point].title)}
                <small>{t(startingPointKeys[point].description)}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section
        className="onboarding-method"
        aria-labelledby="onboarding-method-title"
      >
        <h3 id="onboarding-method-title">{t('onboarding.method.title')}</h3>
        <p>{t('onboarding.method.description')}</p>
        <ol>
          {(['foundation', 'concept', 'case', 'mastery'] as const).map(
            (step) => (
              <li key={step}>{t(`onboarding.method.${step}`)}</li>
            ),
          )}
        </ol>
      </section>

      <section
        className="onboarding-journey-preview"
        aria-labelledby="onboarding-journey-preview-title"
      >
        <h3 id="onboarding-journey-preview-title">
          {t('onboarding.journey.title')}
        </h3>
        <p>{t('onboarding.journey.description')}</p>
        <ol>
          {growthJourneyStages.map((stage, index) => (
            <li key={stage.id}>
              <span>{t('onboarding.journey.stage', { stage: index })}</span>
              <strong>{t(`journey.stage.${stage.id}.title`)}</strong>
            </li>
          ))}
        </ol>
        <Link className="text-link" to="/journey">
          {t('onboarding.journey.open')}
        </Link>
      </section>

      {mission === undefined ? null : (
        <section
          className="onboarding-first-mission"
          aria-labelledby="onboarding-first-mission-title"
          aria-live="polite"
        >
          <h3 id="onboarding-first-mission-title">
            {t('onboarding.mission.title')}
          </h3>
          <strong>{mission.title}</strong>
          <p>
            {t('onboarding.mission.minutes', {
              minutes: mission.estimatedMinutes,
            })}
          </p>
          <p>{t('onboarding.mission.why', { reason: mission.motivation })}</p>
          <div className="button-row">
            <Link className="button button--primary" to={mission.to}>
              {t('onboarding.mission.start', { title: mission.title })}
            </Link>
            {mission.kind === 'foundation' &&
            visitedFoundationIds.has(mission.id) ? (
              <button
                className="button button--secondary"
                onClick={() => completeMission(mission.id)}
                type="button"
              >
                {t('onboarding.mission.complete')}
              </button>
            ) : null}
          </div>
        </section>
      )}

      <section
        className="onboarding-roadmap"
        aria-labelledby="onboarding-roadmap-title"
      >
        <h3 id="onboarding-roadmap-title">{t('onboarding.roadmap.title')}</h3>
        <ol>
          {roadmap.map((stage, index) => (
            <li key={stage.id}>
              <span>{t(`onboarding.roadmap.level${String(index)}.label`)}</span>
              <strong>
                {t(`onboarding.roadmap.level${String(index)}.title`)}
              </strong>
              <p>{t(`onboarding.roadmap.level${String(index)}.description`)}</p>
              <small>
                {concepts === undefined
                  ? t('onboarding.roadmap.metricsConceptPending', {
                      foundations: stage.foundationCount,
                      skills: stage.skillCount,
                    })
                  : t('onboarding.roadmap.metrics', {
                      foundations: stage.foundationCount,
                      concepts: stage.conceptCount,
                      skills: stage.skillCount,
                    })}
              </small>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="onboarding-guide"
        aria-labelledby="onboarding-guide-title"
      >
        <h3 id="onboarding-guide-title">{t('onboarding.guide.title')}</h3>
        {mission === undefined ? (
          <p>{t('onboarding.guide.empty')}</p>
        ) : (
          <>
            <p>{t('onboarding.guide.current', { title: mission.title })}</p>
            {concepts === undefined ? (
              <p>{t('onboarding.guide.pending')}</p>
            ) : guideConcept === undefined ? (
              <p>{t('onboarding.guide.noRelated')}</p>
            ) : (
              <>
                <p>
                  {t('onboarding.guide.next', { title: guideConcept.title })}
                </p>
                <p>
                  {t('onboarding.guide.reason', {
                    reason: guideConcept.whyItMatters,
                  })}
                </p>
              </>
            )}
          </>
        )}
      </section>
    </section>
  );
}
