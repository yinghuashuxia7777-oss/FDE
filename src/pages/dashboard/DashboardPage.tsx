import { Link } from 'react-router-dom';

import projectCatalog from '../../../content/projects/mvp/catalog.json';

import {
  buildDailyTrainingPlan,
  calculateEvidenceReadiness,
  compareCompletedAttemptsNewestFirst,
  evidenceToneForVerdict,
  rankSampledMastery,
  projectMvpLeafEvidence,
  projectSessionPracticeEvidence,
  mergeMvpLeafEvidence,
  type DailyTrainingPlanItem,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { usePracticeEvidence } from '../../application/practice';
import {
  mvpCaseAttributions,
  mvpLeafSkills,
} from '../../content/mvp-capability-content';
import {
  buildDailyGrowthMission,
  isNewLearner,
} from '../../application/onboarding';
import {
  bundledConceptSource,
  type ConceptSource,
} from '../../content/concept-source';
import type { SkillDefinition } from '../../content/contracts';
import {
  bundledFoundationSource,
  type FoundationSource,
} from '../../content/foundation-source';
import { mvpPractices } from '../../content/mvp-practice-source';
import { DashboardLearningJourney } from '../../components/onboarding';
import { useI18n } from '../../i18n';
import type {
  CaseSummary,
  CompletedAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';
import {
  CapabilityMapCard,
  ChallengeCard,
  type ChallengeSignal,
  EvidenceTimeline,
  type EvidenceSignal,
  GrowthMissionCard,
  type GrowthMissionStep,
  JourneyCard,
  MentorCard,
  ReadinessCard,
} from './DashboardVisuals';
import {
  buildRealCapabilitySignals,
  provideCapabilityMapData,
} from './capability-map-data';
import { FirstLoopPreview } from './FirstLoopPreview';

export interface DashboardMentorInsight {
  challengeCaseId?: string;
  evidenceAttemptIds: readonly string[];
  gapSkillId?: string;
  source: 'local-rules' | 'ai';
  summary: string;
}

interface DashboardPageProps {
  conceptSource?: ConceptSource;
  foundationSource?: FoundationSource;
  mentorInsight?: DashboardMentorInsight;
  repositories?: ProductRepositories;
  now?: Date;
}

type Translate = ReturnType<typeof useI18n>['t'];

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

function readinessStage(readiness: number | undefined): number {
  if (readiness === undefined) return 0;
  if (readiness < 40) return 1;
  if (readiness < 70) return 2;
  if (readiness < 85) return 3;
  return 4;
}

function selectGapRecord(
  activeSkillIds: ReadonlySet<string>,
  mastery: readonly SkillMasteryRecord[],
  mistakes: readonly MistakeRecord[],
): SkillMasteryRecord | undefined {
  const ranked = rankSampledMastery(activeSkillIds, mastery);
  const criticalSkillIds = new Set(
    mistakes
      .filter(({ critical }) => critical)
      .flatMap(({ skillIds }) => skillIds),
  );
  return (
    ranked.find(({ skillId }) => criticalSkillIds.has(skillId)) ?? ranked[0]
  );
}

function toChallengeSignal(
  item: DailyTrainingPlanItem,
  t: Translate,
  skillDefinitionsById: ReadonlyMap<string, SkillDefinition>,
): ChallengeSignal {
  const summary = item.caseSummary;
  const skills = summary.skills
    .map((skillId) => skillDefinitionsById.get(skillId)?.label ?? skillId)
    .slice(0, 2)
    .join(', ');
  return {
    completed: item.completedToday,
    difficulty: t(`product.common.level.${summary.level}`),
    estimatedTime: t('product.common.minutesShort', {
      minutes: summary.estimatedMinutes,
    }),
    id: summary.id,
    reason: translateDailyReason(t, item.reason),
    skills: skills === '' ? t('product.common.notAvailable') : skills,
    title: summary.title,
    to:
      item.completedToday && item.attemptId !== undefined
        ? `/debrief/${item.attemptId}`
        : `/training/${summary.id}`,
  };
}

function caseById(
  cases: readonly CaseSummary[],
  caseId: string | undefined,
): CaseSummary | undefined {
  return caseId === undefined
    ? undefined
    : cases.find(({ id }) => id === caseId);
}

export function DashboardPage({
  conceptSource = bundledConceptSource,
  foundationSource = bundledFoundationSource,
  mentorInsight,
  repositories: override,
  now,
}: DashboardPageProps) {
  const { language, t } = useI18n();
  const { evidence: practiceEvidence, projectEvidence } = usePracticeEvidence();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [
      cases,
      progress,
      mastery,
      mistakes,
      attempts,
      skillDefinitions,
      foundationItems,
    ] = await Promise.all([
      source.cases.listActive({ status: 'published' }),
      source.progress.list(LOCAL_USER_ID),
      source.skills.list(LOCAL_USER_ID),
      source.mistakes.list({ userId: LOCAL_USER_ID }),
      source.attempts.list({ userId: LOCAL_USER_ID }),
      source.content.listActiveSkills(),
      foundationSource.loadAll(),
    ]);
    return {
      cases,
      progress,
      mastery,
      mistakes,
      attempts,
      skillDefinitions,
      foundationItems,
    };
  }, [foundationSource, getRepositories]);

  return (
    <section
      className="product-page dashboard-page dashboard-page--growth-os"
      aria-labelledby="page-title"
    >
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
            (attempt): attempt is CompletedAttemptRecord =>
              attempt.status === 'completed' &&
              visibleCaseIds.has(attempt.caseId),
          );
          const isNewUserMode = isNewLearner(progress, mastery, attempts);
          const skillDefinitionsById = new Map(
            skillDefinitions.map((definition) => [definition.id, definition]),
          );
          const activeSkillIds = new Set(skillDefinitions.map(({ id }) => id));
          const sampledMastery = rankSampledMastery(activeSkillIds, mastery);
          const readiness = calculateEvidenceReadiness(activeSkillIds, mastery);
          const stage = readinessStage(readiness);
          const strengths = [...sampledMastery]
            .filter(({ score }) => score >= 60)
            .sort(
              (left, right) =>
                right.score - left.score ||
                left.skillId.localeCompare(right.skillId),
            )
            .slice(0, 2)
            .map(
              ({ skillId }) =>
                skillDefinitionsById.get(skillId)?.label ?? skillId,
            );
          const gaps = sampledMastery
            .filter(({ score }) => score < 60)
            .slice(0, 2)
            .map(
              ({ skillId }) =>
                skillDefinitionsById.get(skillId)?.label ?? skillId,
            );
          const gapRecord = selectGapRecord(activeSkillIds, mastery, mistakes);
          const gapLabel =
            gapRecord === undefined
              ? t('dashboard.mentor.noGap')
              : (skillDefinitionsById.get(gapRecord.skillId)?.label ??
                gapRecord.skillId);

          const dailyPlan = buildDailyTrainingPlan(
            visibleCases,
            visibleProgress,
            mastery,
            mistakes,
            attempts,
            now,
          );
          const dailyItems = [
            ...(dailyPlan.focusCase === undefined ? [] : [dailyPlan.focusCase]),
            ...dailyPlan.nextCases,
          ];
          const primaryItem =
            dailyItems.find(({ completedToday }) => !completedToday) ??
            dailyPlan.focusCase;
          const primaryChallenge =
            primaryItem === undefined
              ? undefined
              : toChallengeSignal(primaryItem, t, skillDefinitionsById);
          const secondaryChallenges = dailyItems
            .filter(
              ({ caseSummary }) =>
                caseSummary.id !== primaryItem?.caseSummary.id,
            )
            .slice(0, 2)
            .map((item) => toChallengeSignal(item, t, skillDefinitionsById));

          const lifetimeEvidence = visibleAttempts.reduce(
            (total, attempt) => total + Math.round(attempt.score),
            0,
          );
          const evidenceGoal = (Math.floor(lifetimeEvidence / 500) + 1) * 500;

          const casesById = new Map(
            visibleCases.map((caseSummary) => [caseSummary.id, caseSummary]),
          );
          const dateFormatter = new Intl.DateTimeFormat(language, {
            dateStyle: 'medium',
          });
          const evidenceSignals: EvidenceSignal[] = [...visibleAttempts]
            .sort(compareCompletedAttemptsNewestFirst)
            .slice(0, 4)
            .map((attempt) => ({
              completedAt: dateFormatter.format(new Date(attempt.completedAt)),
              completedAtIso: attempt.completedAt,
              id: attempt.id,
              score: attempt.score,
              title: casesById.get(attempt.caseId)?.title ?? attempt.caseId,
              tone: evidenceToneForVerdict(attempt.verdict),
              to: `/debrief/${attempt.id}`,
              verdict: t(`product.common.verdict.${attempt.verdict}`),
            }));

          const capabilityMap = provideCapabilityMapData({
            attempts,
            definitions: skillDefinitions,
            mastery,
            mvpLeafEvidence: mergeMvpLeafEvidence(
              projectMvpLeafEvidence(
                visibleAttempts,
                mvpCaseAttributions,
                mvpLeafSkills,
              ),
              projectSessionPracticeEvidence(practiceEvidence, mvpLeafSkills),
            ),
            realReadiness: readiness,
            t,
          });
          const capabilityMapIsDemo = capabilityMap.mode === 'demo';
          const capabilityMapSource = capabilityMapIsDemo
            ? t('dashboard.capability.demoSource', {
                goal: capabilityMap.profile.goal,
                name: capabilityMap.profile.name,
              })
            : t('dashboard.capability.source');
          const capabilityMapCoreEvidence = capabilityMapIsDemo
            ? t('dashboard.capability.demoReadiness', {
                value: capabilityMap.mapReadiness,
              })
            : capabilityMap.mapReadiness === undefined
              ? t('dashboard.capability.buildProof')
              : t('dashboard.capability.coreReadiness', {
                  value: Math.round(capabilityMap.mapReadiness),
                });

          const completedProjectIds = projectEvidence
            .filter(
              ({ completedMilestones }) => completedMilestones.length === 3,
            )
            .map(({ projectId }) => projectId);
          const completedCaseIds = new Set(
            visibleAttempts.map(({ caseId }) => caseId),
          );
          const completedPracticeIds = new Set(
            practiceEvidence.map(({ practiceId }) => practiceId),
          );
          const completedProjectIdSet = new Set(completedProjectIds);
          const growthMission = buildDailyGrowthMission({
            completedCaseIds: [...completedCaseIds],
            completedPracticeIds: [...completedPracticeIds],
            completedProjectIds,
          });
          const foundationById = new Map(
            foundationItems.map((item) => [item.id, item]),
          );
          const practiceById = new Map(
            mvpPractices.map((item) => [item.id, item]),
          );
          const leafSkillById = new Map(
            mvpLeafSkills.map((item) => [item.id, item]),
          );
          const growthMissionSteps: GrowthMissionStep[] =
            growthMission === undefined
              ? []
              : [
                  {
                    type: 'learn',
                    label: t('dashboard.growthMission.learn'),
                    title:
                      foundationById.get(growthMission.foundationId)?.title ??
                      growthMission.foundationId,
                    to: `/foundation/${growthMission.foundationId}`,
                  },
                  {
                    type: 'practice',
                    label: t('dashboard.growthMission.practice'),
                    title:
                      practiceById.get(growthMission.practiceId)?.title ??
                      growthMission.practiceId,
                    to: `/practices/${growthMission.practiceId}`,
                  },
                  {
                    type: 'challenge',
                    label: t('dashboard.growthMission.challenge'),
                    title:
                      casesById.get(growthMission.caseId)?.title ??
                      growthMission.caseId,
                    to: `/training/${growthMission.caseId}`,
                  },
                  {
                    type: 'evidence',
                    label: t('dashboard.growthMission.evidence'),
                    title:
                      leafSkillById.get(growthMission.evidenceSkillId)?.name ??
                      growthMission.evidenceSkillId,
                    to: '/profile',
                  },
                ];
          const firstLoopPreviewSkillId =
            growthMission === undefined
              ? undefined
              : leafSkillById.get(growthMission.evidenceSkillId)?.parentSkillId;
          const firstLoopPreviewSignals = buildRealCapabilitySignals(
            t,
            skillDefinitions,
            mastery,
          );
          const projectById = new Map(
            projectCatalog.projects.map((project) => [project.id, project]),
          );
          const growthMissionAction =
            growthMission === undefined
              ? undefined
              : !completedPracticeIds.has(growthMission.practiceId)
                ? growthMissionSteps.find(({ type }) => type === 'learn')
                : !completedCaseIds.has(growthMission.caseId)
                  ? growthMissionSteps.find(({ type }) => type === 'challenge')
                  : growthMission.projectId !== undefined &&
                      !completedProjectIdSet.has(growthMission.projectId)
                    ? {
                        title:
                          projectById.get(growthMission.projectId)?.title ??
                          growthMission.projectId,
                        to: `/projects/${growthMission.projectId}`,
                      }
                    : growthMissionSteps.find(
                        ({ type }) => type === 'evidence',
                      );
          const recommendedCase =
            caseById(visibleCases, mentorInsight?.challengeCaseId) ??
            primaryItem?.caseSummary;
          const mentorGapLabel =
            growthMission === undefined
              ? mentorInsight?.gapSkillId === undefined
                ? gapLabel
                : (skillDefinitionsById.get(mentorInsight.gapSkillId)?.label ??
                  mentorInsight.gapSkillId)
              : (leafSkillById.get(growthMission.evidenceSkillId)?.name ??
                growthMission.evidenceSkillId);
          const mentorSummary =
            mentorInsight?.summary ??
            (growthMission === undefined
              ? gapRecord === undefined
                ? t('dashboard.mentor.diagnosis.insufficient')
                : t('dashboard.mentor.diagnosis.gap', { skill: gapLabel })
              : t('dashboard.mentor.diagnosis.mission', {
                  skill: mentorGapLabel,
                }));
          const mentorRecommendation =
            growthMissionAction?.title ??
            recommendedCase?.title ??
            t('dashboard.mentor.recommendation.empty');
          const mentorActionTo =
            growthMissionAction?.to ??
            (recommendedCase === undefined
              ? '/cases'
              : `/training/${recommendedCase.id}`);

          return (
            <div
              className="dashboard-command-center"
              data-dashboard-mode={isNewUserMode ? 'new-user' : 'active'}
            >
              {isNewUserMode ? (
                <div className="growth-onboarding">
                  <DashboardLearningJourney
                    attempts={attempts}
                    cases={visibleCases}
                    conceptSource={conceptSource}
                    foundations={foundationItems}
                    mastery={mastery}
                    progress={progress}
                    skills={skillDefinitions}
                  />
                  <FirstLoopPreview
                    previewSkillId={firstLoopPreviewSkillId}
                    signals={firstLoopPreviewSignals}
                    steps={growthMissionSteps}
                  />
                </div>
              ) : (
                <>
                  <GrowthMissionCard
                    actionLabel={t('dashboard.growthMission.action')}
                    actionTo={growthMissionAction?.to ?? '/journey'}
                    complete={growthMission === undefined}
                    completeDescription={t(
                      'dashboard.growthMission.completeDescription',
                    )}
                    completeTitle={t('dashboard.growthMission.completeTitle')}
                    description={t('dashboard.growthMission.description')}
                    label={t('dashboard.growthMission.label')}
                    steps={growthMissionSteps}
                    title={t('dashboard.growthMission.title', {
                      day: growthMission?.day ?? 7,
                    })}
                  />
                  <div className="growth-os-grid">
                    <JourneyCard
                      actionLabel={t('dashboard.journey.start')}
                      actionTo="/journey"
                      description={t('dashboard.journey.description')}
                      label={t('dashboard.journey.label')}
                      steps={[
                        {
                          label: t('dashboard.journey.step.learn'),
                          to: '/foundation',
                        },
                        {
                          label: t('dashboard.journey.step.practice'),
                          to: '/practices',
                        },
                        {
                          label: t('dashboard.journey.step.cases'),
                          to: '/cases',
                        },
                        {
                          label: t('dashboard.journey.step.projects'),
                          to: '/projects',
                        },
                        {
                          label: t('dashboard.journey.step.evidence'),
                          to: '/profile',
                        },
                      ]}
                      title={t('dashboard.journey.title')}
                    />

                    <ReadinessCard
                      evidenceBasis={t('dashboard.readiness.evidenceBasis')}
                      evidenceCurrent={lifetimeEvidence}
                      evidenceGoal={evidenceGoal}
                      evidenceProgressLabel={t(
                        'dashboard.readiness.evidenceProgress',
                        { current: lifetimeEvidence, goal: evidenceGoal },
                      )}
                      gaps={gaps}
                      gapsLabel={t('dashboard.readiness.gaps')}
                      insufficientLabel={t('dashboard.readiness.insufficient')}
                      label={t('dashboard.readiness.label')}
                      readiness={readiness}
                      reportLabel={t('dashboard.readiness.report')}
                      reportTo="/skills"
                      stage={t('dashboard.readiness.stage', { stage })}
                      stageLabel={t('dashboard.readiness.currentStage')}
                      strengths={strengths}
                      strengthsLabel={t('dashboard.readiness.strengths')}
                      target={t('dashboard.target.productionEngineer')}
                      targetLabel={t('dashboard.readiness.target')}
                      title={t('dashboard.readiness.title')}
                    />

                    <CapabilityMapCard
                      badgeLabel={
                        capabilityMapIsDemo
                          ? t('dashboard.capability.demoBadge')
                          : undefined
                      }
                      confidenceLabel={t('dashboard.capability.confidence')}
                      coreLabel={t('dashboard.capability.core')}
                      coreEvidence={capabilityMapCoreEvidence}
                      levelLabel={t('dashboard.capability.level')}
                      legendItems={[
                        {
                          label: t('product.common.mastery.proficient'),
                          mastery: 'proficient',
                        },
                        {
                          label: t('product.common.mastery.competent'),
                          mastery: 'competent',
                        },
                        {
                          label: t('product.common.mastery.learning'),
                          mastery: 'learning',
                        },
                        {
                          label: t('dashboard.capability.status.notVerified'),
                          mastery: 'not-started',
                        },
                      ]}
                      linkLabel={t('dashboard.capability.openGraph')}
                      signals={capabilityMap.signals}
                      sourceLabel={capabilityMapSource}
                      title={t('dashboard.capability.title')}
                      viewLabel={t('dashboard.capability.view')}
                    />

                    <MentorCard
                      actionLabel={t('dashboard.mentor.action')}
                      actionTo={mentorActionTo}
                      actionVariant="secondary"
                      diagnosis={mentorSummary}
                      gapLabel={t('dashboard.mentor.gap')}
                      gapSkill={mentorGapLabel}
                      label={t('dashboard.mentor.label')}
                      recommendation={mentorRecommendation}
                      recommendationLabel={t('dashboard.mentor.recommendation')}
                      sourceLabel={t('dashboard.mentor.source.local')}
                    />

                    <ChallengeCard
                      actionLabel={t('dashboard.challenge.action')}
                      browseLabel={t('dashboard.challenge.browseAll')}
                      browseTo="/cases"
                      completedLabel={t('product.common.completed')}
                      description={t('dashboard.challenge.description')}
                      difficultyLabel={t('dashboard.mission.difficulty')}
                      emptyActionLabel={t('dashboard.daily.browseCases')}
                      emptyDescription={t('dashboard.challenge.empty')}
                      emptyTo="/cases"
                      estimatedTimeLabel={t('dashboard.mission.estimatedTime')}
                      primary={primaryChallenge}
                      secondary={secondaryChallenges}
                      secondaryLabel={t('dashboard.challenge.secondary')}
                      skillsLabel={t('dashboard.mission.skillFocus')}
                      title={t('dashboard.challenge.title')}
                    />

                    <EvidenceTimeline
                      empty={t('dashboard.evidence.empty')}
                      linkLabel={t('dashboard.evidence.viewAll')}
                      linkTo="/profile"
                      reviewLabel={t('dashboard.evidence.review')}
                      scoreLabel={t('dashboard.evidence.score')}
                      signals={evidenceSignals}
                      title={t('dashboard.evidence.title')}
                    />
                  </div>

                  <aside className="local-feedback-entry">
                    <span>{t('feedback.entry.dashboard')}</span>
                    <Link to="/feedback">
                      {t('feedback.entry.action')}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </aside>
                </>
              )}
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
