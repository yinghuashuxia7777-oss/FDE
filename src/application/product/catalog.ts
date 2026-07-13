import type {
  DomainDefinition,
  SkillDefinition,
} from '../../content/contracts';
import type {
  AttemptRecord,
  CaseProgressRecord,
  CaseSummary,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';

export type MasteryStatus =
  'Not started' | 'Weak' | 'Learning' | 'Competent' | 'Proficient';

export function masteryStatus(
  score: number | undefined,
  sampleCount = 0,
): MasteryStatus {
  if (score === undefined || sampleCount === 0) return 'Not started';
  if (score < 40) return 'Weak';
  if (score < 60) return 'Learning';
  if (score < 80) return 'Competent';
  return 'Proficient';
}

export interface DomainSignal {
  id: string;
  label: string;
  score: number | undefined;
  sampleCount: number;
  status: MasteryStatus;
}

export function buildDomainSignals(
  domains: readonly DomainDefinition[],
  skills: readonly SkillDefinition[],
  mastery: readonly SkillMasteryRecord[],
): DomainSignal[] {
  const masteryBySkill = new Map(
    mastery.map((record) => [record.skillId, record]),
  );
  return domains.map((domain) => {
    const records = skills
      .filter(({ domainId }) => domainId === domain.id)
      .map(({ id }) => masteryBySkill.get(id))
      .filter((record): record is SkillMasteryRecord => record !== undefined);
    const sampleCount = records.reduce(
      (sum, record) => sum + record.sampleCount,
      0,
    );
    const score =
      sampleCount === 0
        ? undefined
        : records.reduce(
            (sum, record) => sum + record.score * record.sampleCount,
            0,
          ) / sampleCount;
    return {
      ...domain,
      score,
      sampleCount,
      status: masteryStatus(score, sampleCount),
    };
  });
}

export interface CaseRecommendation {
  caseSummary: CaseSummary;
  priority: number;
  rankTuple: readonly [number, string, string];
  reason: string;
}

export function recommendCases(
  cases: readonly CaseSummary[],
  progress: readonly CaseProgressRecord[],
  mastery: readonly SkillMasteryRecord[],
  mistakes: readonly MistakeRecord[],
): CaseRecommendation[] {
  const progressByCase = new Map(
    progress.map((record) => [record.caseId, record]),
  );
  const skillById = new Map(mastery.map((record) => [record.skillId, record]));
  const criticalCases = new Set(
    mistakes.filter(({ critical }) => critical).map(({ caseId }) => caseId),
  );
  const criticalSkills = new Set(
    mistakes
      .filter(({ critical }) => critical)
      .flatMap(({ skillIds }) => skillIds),
  );
  return cases
    .map((caseSummary) => {
      const record = progressByCase.get(caseSummary.id);
      const weakSkills = caseSummary.skills.filter(
        (skillId) => (skillById.get(skillId)?.score ?? 100) < 40,
      );
      const criticalSkill = caseSummary.skills.find((skillId) =>
        criticalSkills.has(skillId),
      );
      const sameCaseCritical =
        criticalCases.has(caseSummary.id) || record?.hasCriticalError === true;
      if (sameCaseCritical || criticalSkill !== undefined) {
        const reason = sameCaseCritical
          ? 'Revisit a case with a recorded critical-risk decision.'
          : `Transfer the critical-risk skill ${criticalSkill ?? ''} into another scenario.`;
        return {
          caseSummary,
          priority: 0,
          rankTuple: [0, '', caseSummary.id] as const,
          reason,
        };
      }
      if (weakSkills.length > 0) {
        return {
          caseSummary,
          priority: 1,
          rankTuple: [1, '', caseSummary.id] as const,
          reason: `Strengthen ${weakSkills.slice(0, 2).join(', ')}.`,
        };
      }
      const newlyCompetent = caseSummary.skills.find((skillId) => {
        const signal = skillById.get(skillId);
        return (
          signal !== undefined && signal.score >= 60 && signal.sampleCount <= 2
        );
      });
      if (record === undefined && newlyCompetent !== undefined) {
        return {
          caseSummary,
          priority: 2,
          rankTuple: [2, '', caseSummary.id] as const,
          reason: `Cross-check newly competent ${newlyCompetent} in an unattempted scenario.`,
        };
      }
      if (record !== undefined) {
        return {
          caseSummary,
          priority: 3,
          rankTuple: [3, record.updatedAt, caseSummary.id] as const,
          reason: `Refresh a capability last practiced ${record.updatedAt.slice(0, 10)}.`,
        };
      }
      return {
        caseSummary,
        priority: 4,
        rankTuple: [4, '', caseSummary.id] as const,
        reason:
          'Stable fallback for common FDE practice when local evidence is not available.',
      };
    })
    .sort(
      (left, right) =>
        left.rankTuple[0] - right.rankTuple[0] ||
        left.rankTuple[1].localeCompare(right.rankTuple[1]) ||
        left.rankTuple[2].localeCompare(right.rankTuple[2]),
    );
}

export interface DailyTrainingPlanItem {
  caseSummary: CaseSummary;
  reason: string;
  completedToday: boolean;
  attemptId?: string;
  score?: number;
}

export interface DailyTrainingPlan {
  focusCase: DailyTrainingPlanItem | undefined;
  nextCases: DailyTrainingPlanItem[];
  completedCount: number;
  plannedCount: number;
  estimatedMinutes: number;
}

interface RankedDailyCase extends DailyTrainingPlanItem {
  priority: number;
  orderScore: number;
}

const dailyLevels = new Set(['beginner', 'intermediate', 'advanced']);

function validTime(value: string): number | undefined {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

export function buildDailyTrainingPlan(
  cases: readonly CaseSummary[],
  progress: readonly CaseProgressRecord[],
  mastery: readonly SkillMasteryRecord[],
  mistakes: readonly MistakeRecord[],
  todayAttempts: readonly AttemptRecord[],
  now = new Date(),
): DailyTrainingPlan {
  const eligibleCases = cases
    .filter(
      ({ level, status }) => status === 'published' && dailyLevels.has(level),
    )
    .sort(
      (left, right) =>
        left.id.localeCompare(right.id) || right.version - left.version,
    )
    .filter(
      (caseSummary, index, sorted) =>
        index === 0 || sorted[index - 1]?.id !== caseSummary.id,
    );
  const eligibleById = new Map(
    eligibleCases.map((caseSummary) => [caseSummary.id, caseSummary]),
  );
  const progressByCase = new Map(
    progress.map((record) => [record.caseId, record]),
  );
  const masteryBySkill = new Map(
    mastery.map((record) => [record.skillId, record]),
  );
  const criticalCases = new Set(
    mistakes.filter(({ critical }) => critical).map(({ caseId }) => caseId),
  );
  const criticalSkills = new Set(
    mistakes
      .filter(({ critical }) => critical)
      .flatMap(({ skillIds }) => skillIds),
  );

  const completedByCase = new Map<
    string,
    { attempt: Extract<AttemptRecord, { status: 'completed' }>; time: number }
  >();
  const todayKey = localDayKey(now);
  for (const attempt of todayAttempts) {
    if (attempt.status !== 'completed' || !eligibleById.has(attempt.caseId)) {
      continue;
    }
    const time = validTime(attempt.completedAt);
    if (time === undefined || localDayKey(new Date(time)) !== todayKey) {
      continue;
    }
    const existing = completedByCase.get(attempt.caseId);
    if (
      existing === undefined ||
      time > existing.time ||
      (time === existing.time &&
        attempt.id.localeCompare(existing.attempt.id) > 0)
    ) {
      completedByCase.set(attempt.caseId, { attempt, time });
    }
  }

  const completedItems = [...completedByCase.entries()]
    .sort(
      ([leftId, left], [rightId, right]) =>
        left.time - right.time || leftId.localeCompare(rightId),
    )
    .map(([caseId, { attempt }]): DailyTrainingPlanItem => ({
      caseSummary: eligibleById.get(caseId)!,
      reason: 'Completed today. Review the decision path while it is fresh.',
      completedToday: true,
      attemptId: attempt.id,
      score: attempt.score,
    }));
  const completedCaseIds = new Set(
    completedItems.map(({ caseSummary }) => caseSummary.id),
  );

  const rankedCases = eligibleCases
    .filter(({ id }) => !completedCaseIds.has(id))
    .map((caseSummary): RankedDailyCase => {
      const record = progressByCase.get(caseSummary.id);
      const weakSkills = caseSummary.skills
        .map((skillId) => masteryBySkill.get(skillId))
        .filter(
          (signal): signal is SkillMasteryRecord =>
            signal !== undefined && signal.sampleCount > 0 && signal.score < 40,
        )
        .sort((left, right) => left.score - right.score);
      const criticalSkill = caseSummary.skills.find((skillId) =>
        criticalSkills.has(skillId),
      );
      const sameCaseCritical =
        criticalCases.has(caseSummary.id) || record?.hasCriticalError === true;

      if (sameCaseCritical || criticalSkill !== undefined) {
        return {
          caseSummary,
          completedToday: false,
          priority: 0,
          orderScore: 0,
          reason: sameCaseCritical
            ? 'Revisit a case with a recorded critical-risk decision.'
            : `Transfer the critical-risk skill ${criticalSkill ?? ''} into this scenario.`,
        };
      }
      if (weakSkills.length > 0) {
        return {
          caseSummary,
          completedToday: false,
          priority: 1,
          orderScore: weakSkills[0]!.score,
          reason: `Strengthen ${weakSkills
            .slice(0, 2)
            .map(({ skillId }) => skillId)
            .join(', ')} while mastery is below 40.`,
        };
      }
      if (
        record?.latestVerdict === 'fail' ||
        record?.latestVerdict === 'critical-risk'
      ) {
        return {
          caseSummary,
          completedToday: false,
          priority: 2,
          orderScore: -(validTime(record.updatedAt) ?? 0),
          reason: 'Retry a recent failed case while the evidence is fresh.',
        };
      }
      const newlyCompetent = caseSummary.skills.find((skillId) => {
        const signal = masteryBySkill.get(skillId);
        return (
          signal !== undefined && signal.score >= 60 && signal.sampleCount <= 2
        );
      });
      if (record === undefined && newlyCompetent !== undefined) {
        return {
          caseSummary,
          completedToday: false,
          priority: 3,
          orderScore: 0,
          reason: `Verify the newly learned ${newlyCompetent} skill in another scenario.`,
        };
      }
      if (record === undefined || record.completedCount === 0) {
        return {
          caseSummary,
          completedToday: false,
          priority: 4,
          orderScore: 0,
          reason: 'Continue today with an uncompleted FDE scenario.',
        };
      }
      return {
        caseSummary,
        completedToday: false,
        priority: 5,
        orderScore: validTime(record.updatedAt) ?? Number.MAX_SAFE_INTEGER,
        reason: 'Maintain daily practice with a stable fallback case.',
      };
    })
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.orderScore - right.orderScore ||
        left.caseSummary.id.localeCompare(right.caseSummary.id),
    );

  const items: DailyTrainingPlanItem[] = [
    ...completedItems,
    ...rankedCases,
  ].slice(0, 3);
  return {
    focusCase: items[0],
    nextCases: items.slice(1),
    completedCount: items.filter(({ completedToday }) => completedToday).length,
    plannedCount: items.length,
    estimatedMinutes: items.reduce(
      (total, { caseSummary }) => total + caseSummary.estimatedMinutes,
      0,
    ),
  };
}

function localDayKey(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateTrainingStreak(
  timestamps: readonly string[],
  now = new Date(),
): number {
  const days = new Set(
    timestamps.flatMap((timestamp) => {
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? [] : [localDayKey(date)];
    }),
  );
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  if (!days.has(localDayKey(cursor))) return 0;
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatSubmission(
  submission: import('../../domain/cases/types').NodeSubmission,
): string {
  switch (submission.type) {
    case 'choice':
      return submission.selectedOptionIds.join(', ');
    case 'ordering':
      return submission.orderedOptionIds.join(' → ');
    case 'matching':
      return Object.entries(submission.pairs)
        .map(([left, right]) => `${left} → ${right}`)
        .join('; ');
    case 'evidence-conclusion':
      return `${submission.conclusionId}; evidence: ${submission.evidenceIds.join(', ')}`;
  }
}
