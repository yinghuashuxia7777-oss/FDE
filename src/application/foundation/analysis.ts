import type {
  FoundationKnowledge,
  FoundationLearningStatus,
  FoundationTrack,
} from '../../domain/foundation/types';
import type {
  AttemptRecord,
  CaseSummary,
  SkillMasteryRecord,
} from '../../repositories/contracts';

const TRACK_ORDER: readonly FoundationTrack[] = [
  'computer-basics',
  'network-api',
  'ai-basics',
];

const STATUS_ORDER: Readonly<Record<FoundationLearningStatus, number>> = {
  learning: 0,
  'not-started': 1,
  mastered: 2,
};

export interface FoundationItemProgress {
  item: FoundationKnowledge;
  status: FoundationLearningStatus;
}

export interface FoundationTrackProgress {
  track: FoundationTrack;
  total: number;
  mastered: number;
  learning: number;
  notStarted: number;
  percent: number;
}

function masteryBySkill(
  mastery: readonly SkillMasteryRecord[],
): ReadonlyMap<string, SkillMasteryRecord> {
  return new Map(mastery.map((record) => [record.skillId, record]));
}

function relatedCaseIds(item: FoundationKnowledge): ReadonlySet<string> {
  return new Set(item.relatedCases);
}

function hasAppliedCaseEvidence(
  item: FoundationKnowledge,
  attempts: readonly AttemptRecord[],
): boolean {
  const related = relatedCaseIds(item);
  return attempts.some(
    (attempt) =>
      related.has(attempt.caseId) &&
      attempt.status === 'completed' &&
      (attempt.verdict === 'pass' || attempt.verdict === 'excellent'),
  );
}

export function foundationStatus(
  item: FoundationKnowledge,
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): FoundationLearningStatus {
  const bySkill = masteryBySkill(mastery);
  const allSkillsMastered = item.skills.every((skillId) => {
    const record = bySkill.get(skillId);
    return record !== undefined && record.sampleCount > 0 && record.score >= 60;
  });

  if (allSkillsMastered && hasAppliedCaseEvidence(item, attempts)) {
    return 'mastered';
  }

  const hasSkillSample = item.skills.some(
    (skillId) => (bySkill.get(skillId)?.sampleCount ?? 0) > 0,
  );
  const related = relatedCaseIds(item);
  const hasCaseAttempt = attempts.some((attempt) =>
    related.has(attempt.caseId),
  );

  return hasSkillSample || hasCaseAttempt ? 'learning' : 'not-started';
}

export function buildFoundationTrackProgress(
  items: readonly FoundationKnowledge[],
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): FoundationTrackProgress[] {
  const statuses = new Map(
    items.map((item) => [item.id, foundationStatus(item, mastery, attempts)]),
  );

  return TRACK_ORDER.map((track) => {
    const trackItems = items.filter((item) => item.track === track);
    const mastered = trackItems.filter(
      (item) => statuses.get(item.id) === 'mastered',
    ).length;
    const learning = trackItems.filter(
      (item) => statuses.get(item.id) === 'learning',
    ).length;
    const total = trackItems.length;

    return {
      track,
      total,
      mastered,
      learning,
      notStarted: total - mastered - learning,
      percent: total === 0 ? 0 : Math.round((mastered / total) * 100),
    };
  });
}

function compareProgress(
  left: FoundationItemProgress,
  right: FoundationItemProgress,
): number {
  return (
    STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
    left.item.order - right.item.order ||
    left.item.id.localeCompare(right.item.id)
  );
}

export function selectNextFoundation(
  items: readonly FoundationKnowledge[],
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): FoundationKnowledge | undefined {
  return items
    .map((item) => ({
      item,
      status: foundationStatus(item, mastery, attempts),
    }))
    .filter(({ status }) => status !== 'mastered')
    .sort(compareProgress)[0]?.item;
}

export function selectFoundationForCase(
  items: readonly FoundationKnowledge[],
  targetCase: Pick<CaseSummary, 'id' | 'skills'>,
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): FoundationKnowledge | undefined {
  const caseSkills = new Set(targetCase.skills);
  const bySkill = masteryBySkill(mastery);

  return items
    .filter(
      (item) =>
        item.relatedCases.includes(targetCase.id) &&
        item.skills.some((skillId) => caseSkills.has(skillId)),
    )
    .map((item) => {
      const status = foundationStatus(item, mastery, attempts);
      const weakScore = item.skills
        .filter((skillId) => caseSkills.has(skillId))
        .map((skillId) => bySkill.get(skillId))
        .filter(
          (record): record is SkillMasteryRecord =>
            record !== undefined && record.sampleCount > 0 && record.score < 40,
        )
        .reduce(
          (lowest, record) => Math.min(lowest, record.score),
          Number.POSITIVE_INFINITY,
        );
      return { item, status, weakScore };
    })
    .filter(({ status }) => status !== 'mastered')
    .sort(
      (left, right) =>
        Number(Number.isFinite(right.weakScore)) -
          Number(Number.isFinite(left.weakScore)) ||
        left.weakScore - right.weakScore ||
        STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
        left.item.order - right.item.order ||
        left.item.id.localeCompare(right.item.id),
    )[0]?.item;
}

export function prerequisitesForCase(
  items: readonly FoundationKnowledge[],
  caseId: string,
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): FoundationItemProgress[] {
  return items
    .filter((item) => item.relatedCases.includes(caseId))
    .map((item) => ({
      item,
      status: foundationStatus(item, mastery, attempts),
    }))
    .sort(compareProgress);
}
