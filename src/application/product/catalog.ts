import type {
  CaseProgressRecord,
  CaseSummary,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';

export const FDE_DOMAINS = [
  { id: 'customer-discovery', label: 'Customer discovery & requirements' },
  { id: 'software-foundations', label: 'Software foundations & structure' },
  { id: 'systems-networking', label: 'Terminal, systems & networking' },
  { id: 'git-delivery', label: 'Git, collaboration & delivery' },
  { id: 'api-integration', label: 'HTTP, API, auth & integration' },
  { id: 'data-engineering', label: 'Data, databases & engineering' },
  { id: 'cloud-deployment', label: 'Cloud, containers & Kubernetes' },
  { id: 'reliability', label: 'Observability & reliability' },
  { id: 'security-governance', label: 'Security, privacy & governance' },
  { id: 'llm-applications', label: 'LLM foundations & AI applications' },
  { id: 'rag-search', label: 'RAG, search & enterprise knowledge' },
  { id: 'agents-evals', label: 'Agents, tools & evaluation' },
  { id: 'performance-scale', label: 'Performance, cost & scale' },
  { id: 'fde-adoption', label: 'FDE delivery, adoption & communication' },
] as const;

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
  cases: readonly CaseSummary[],
  mastery: readonly SkillMasteryRecord[],
): DomainSignal[] {
  const masteryBySkill = new Map(
    mastery.map((record) => [record.skillId, record]),
  );
  return FDE_DOMAINS.map((domain) => {
    const skillIds = new Set(
      cases
        .filter((summary) => summary.domains.includes(domain.id))
        .flatMap((summary) => summary.skills),
    );
    const records = [...skillIds]
      .map((skillId) => masteryBySkill.get(skillId))
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
