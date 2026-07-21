import { Link } from 'react-router-dom';
import { useState } from 'react';

import {
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
  foundations,
  mastery,
  progress,
}: NewUserLearningJourneyProps) {
  const { t } = useI18n();
  const {
    completedMissionIds,
    completeMission,
    goal,
    selectProfile,
    startingPoint,
    visitedFoundationIds,
  } = useLearningJourney();
  const [profileGenerated, setProfileGenerated] = useState(
    () => goal !== undefined && startingPoint !== undefined,
  );
  const [draftGoal, setDraftGoal] = useState<GrowthGoal | undefined>(goal);
  const [draftStartingPoint, setDraftStartingPoint] = useState<
    LearnerStartingPoint | undefined
  >(startingPoint);
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

  if (!profileGenerated) {
    return (
      <section
        className="onboarding-journey onboarding-journey--setup panel"
        aria-labelledby="onboarding-title"
      >
        <header className="onboarding-journey__welcome">
          <p className="eyebrow">{t('onboarding.mode.label')}</p>
          <h2 id="onboarding-title">{t('onboarding.welcome.title')}</h2>
          <p>{t('onboarding.welcome.description')}</p>
          <p>{t('onboarding.welcome.value')}</p>
        </header>

        <ol
          className="onboarding-value-loop"
          aria-label={t('onboarding.loop.label')}
        >
          {(
            [
              'learn',
              'practice',
              'challenge',
              'evidence',
              'capability',
            ] as const
          ).map((step) => (
            <li key={step}>{t(`onboarding.loop.${step}`)}</li>
          ))}
        </ol>

        <fieldset className="onboarding-starting-points onboarding-goals">
          <legend>{t('onboarding.goal.legend')}</legend>
          <div className="onboarding-starting-points__grid">
            {goals.map((item) => (
              <label htmlFor={`onboarding-goal-${item}`} key={item}>
                <input
                  checked={draftGoal === item}
                  id={`onboarding-goal-${item}`}
                  name="onboarding-goal"
                  onChange={() => setDraftGoal(item)}
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
                  checked={draftStartingPoint === point}
                  id={`onboarding-start-${point}`}
                  name="onboarding-starting-point"
                  onChange={() => setDraftStartingPoint(point)}
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

        <button
          className="button button--primary onboarding-profile-generate"
          disabled={draftGoal === undefined || draftStartingPoint === undefined}
          onClick={() => {
            if (draftGoal === undefined || draftStartingPoint === undefined) {
              return;
            }
            selectProfile(draftGoal, draftStartingPoint);
            setProfileGenerated(true);
          }}
          type="button"
        >
          {t('onboarding.profile.generate')}
        </button>
      </section>
    );
  }

  if (goal === undefined || startingPoint === undefined) return null;

  return (
    <section
      className="onboarding-journey onboarding-journey--profile panel"
      aria-labelledby="onboarding-profile-title"
    >
      <header className="onboarding-journey__welcome">
        <p className="eyebrow">{t('onboarding.mode.label')}</p>
        <h2 id="onboarding-profile-title">{t('onboarding.profile.title')}</h2>
        <p>{t('onboarding.profile.description')}</p>
      </header>

      <section
        className="onboarding-profile-summary"
        aria-label={t('onboarding.profile.label')}
      >
        <dl>
          <div>
            <dt>{t('onboarding.profile.goal')}</dt>
            <dd>{t(`onboarding.goal.${goal}.title`)}</dd>
          </div>
          <div>
            <dt>{t('onboarding.profile.experience')}</dt>
            <dd>{t(startingPointKeys[startingPoint].title)}</dd>
          </div>
          <div>
            <dt>{t('onboarding.profile.stage')}</dt>
            <dd>{t('onboarding.profile.stageValue')}</dd>
          </div>
          <div>
            <dt>{t('onboarding.profile.proof')}</dt>
            <dd>{t('onboarding.profile.proofValue')}</dd>
          </div>
        </dl>
        <button
          className="text-button"
          onClick={() => setProfileGenerated(false)}
          type="button"
        >
          {t('onboarding.profile.change')}
        </button>
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

      <Link className="text-link" to="/journey">
        {t('onboarding.journey.open')}
      </Link>
    </section>
  );
}
