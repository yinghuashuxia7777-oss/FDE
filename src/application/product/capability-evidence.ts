import type { SkillDefinition } from '../../content/contracts';
import type { Verdict } from '../../domain/scoring/case-score';
import type {
  CompletedAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { compareRfc3339Timestamps } from '../../storage/timestamps';
import type { TrustedAttempt } from './analysis';
import { masteryStatus, type MasteryStatus } from './catalog';

export type EvidenceConfidence = 'none' | 'low' | 'medium' | 'high';
export type EvidenceTone = 'positive' | 'warning' | 'negative';
export type SkillEvidenceRisk =
  'critical' | 'developing' | 'limited' | 'verified' | 'no-evidence';

export interface CapabilityEvidenceRecord {
  attemptId: string;
  caseId: string;
  caseVersion: number;
  completedAt: string;
  level: TrustedAttempt['caseContent']['level'];
  score: number;
  skillIds: readonly string[];
  title: string;
  tone: EvidenceTone;
  verdict: Verdict;
}

export interface SkillEvidenceProfile {
  criticalMistakeCount: number;
  description: string;
  isGrowthArea: boolean;
  isStrength: boolean;
  label: string;
  latestEvidence: CapabilityEvidenceRecord | undefined;
  risk: SkillEvidenceRisk;
  sampleCount: number;
  score: number | undefined;
  skillId: string;
  status: MasteryStatus;
}

export type CompletedChallengeProfile = CapabilityEvidenceRecord;

export function calculateEvidenceReadiness(
  activeSkillIds: ReadonlySet<string>,
  mastery: readonly SkillMasteryRecord[],
): number | undefined {
  const sampled = mastery.filter(
    ({ sampleCount, skillId }) =>
      sampleCount > 0 && activeSkillIds.has(skillId),
  );
  const samples = sampled.reduce(
    (total, record) => total + record.sampleCount,
    0,
  );
  if (samples === 0) return undefined;
  return (
    sampled.reduce(
      (total, record) => total + record.score * record.sampleCount,
      0,
    ) / samples
  );
}

export function rankSampledMastery(
  activeSkillIds: ReadonlySet<string>,
  mastery: readonly SkillMasteryRecord[],
): SkillMasteryRecord[] {
  return mastery
    .filter(
      ({ sampleCount, skillId }) =>
        sampleCount > 0 && activeSkillIds.has(skillId),
    )
    .sort(
      (left, right) =>
        left.score - right.score || left.skillId.localeCompare(right.skillId),
    );
}

export function evidenceConfidence(sampleCount: number): EvidenceConfidence {
  if (sampleCount === 0) return 'none';
  if (sampleCount === 1) return 'low';
  if (sampleCount < 4) return 'medium';
  return 'high';
}

export function compareCompletedAttemptsNewestFirst(
  left: CompletedAttemptRecord,
  right: CompletedAttemptRecord,
): number {
  return (
    compareRfc3339Timestamps(right.completedAt, left.completedAt) ||
    right.id.localeCompare(left.id)
  );
}

export function evidenceToneForVerdict(verdict: Verdict): EvidenceTone {
  if (verdict === 'excellent' || verdict === 'pass') return 'positive';
  if (verdict === 'marginal') return 'warning';
  return 'negative';
}

function toCapabilityEvidenceRecord({
  attempt,
  caseContent,
}: TrustedAttempt): CapabilityEvidenceRecord {
  return {
    attemptId: attempt.id,
    caseId: attempt.caseId,
    caseVersion: attempt.caseVersion,
    completedAt: attempt.completedAt,
    level: caseContent.level,
    score: attempt.score,
    skillIds: [...caseContent.skills],
    title: caseContent.title,
    tone: evidenceToneForVerdict(attempt.verdict),
    verdict: attempt.verdict,
  };
}

export function buildCapabilityEvidenceRecords(
  trustedAttempts: readonly TrustedAttempt[],
): CapabilityEvidenceRecord[] {
  return [...trustedAttempts]
    .sort((left, right) =>
      compareCompletedAttemptsNewestFirst(left.attempt, right.attempt),
    )
    .map(toCapabilityEvidenceRecord);
}

function skillRisk(
  record: SkillMasteryRecord | undefined,
  criticalMistakeCount: number,
): SkillEvidenceRisk {
  if (criticalMistakeCount > 0) return 'critical';
  if (record === undefined || record.sampleCount === 0) return 'no-evidence';
  if (record.score < 60) return 'developing';
  if (record.sampleCount < 3) return 'limited';
  return 'verified';
}

export function buildSkillEvidenceProfiles(
  definitions: readonly SkillDefinition[],
  mastery: readonly SkillMasteryRecord[],
  mistakes: readonly MistakeRecord[],
  trustedAttempts: readonly TrustedAttempt[],
): SkillEvidenceProfile[] {
  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  const masteryById = new Map(
    mastery.map((record) => [record.skillId, record]),
  );
  const evidence = buildCapabilityEvidenceRecords(trustedAttempts);
  const skillIds = new Set([
    ...definitions.map(({ id }) => id),
    ...mastery.map(({ skillId }) => skillId),
    ...mistakes.flatMap(({ skillIds: ids }) => ids),
    ...evidence.flatMap(({ skillIds: ids }) => ids),
  ]);

  return [...skillIds]
    .map((skillId): SkillEvidenceProfile => {
      const definition = definitionById.get(skillId);
      const record = masteryById.get(skillId);
      const sampleCount = record?.sampleCount ?? 0;
      const criticalMistakeCount = mistakes.filter(
        (mistake) => mistake.critical && mistake.skillIds.includes(skillId),
      ).length;
      const latestEvidence = evidence.find(({ skillIds: ids }) =>
        ids.includes(skillId),
      );
      const isGrowthArea =
        criticalMistakeCount > 0 ||
        (record !== undefined && record.sampleCount > 0 && record.score < 60);
      return {
        skillId,
        label: definition?.label ?? skillId,
        description: definition?.description ?? '',
        score:
          record === undefined || record.sampleCount === 0
            ? undefined
            : record.score,
        sampleCount,
        status: masteryStatus(record?.score, sampleCount),
        criticalMistakeCount,
        latestEvidence,
        isGrowthArea,
        isStrength:
          criticalMistakeCount === 0 &&
          record !== undefined &&
          record.sampleCount > 0 &&
          record.score >= 60,
        risk: skillRisk(record, criticalMistakeCount),
      };
    })
    .sort((left, right) => {
      const leftHasEvidence =
        left.sampleCount > 0 ||
        left.criticalMistakeCount > 0 ||
        left.latestEvidence !== undefined;
      const rightHasEvidence =
        right.sampleCount > 0 ||
        right.criticalMistakeCount > 0 ||
        right.latestEvidence !== undefined;
      return (
        Number(rightHasEvidence) - Number(leftHasEvidence) ||
        (right.score ?? -1) - (left.score ?? -1) ||
        left.label.localeCompare(right.label) ||
        left.skillId.localeCompare(right.skillId)
      );
    });
}

export function buildCompletedChallengeProfiles(
  trustedAttempts: readonly TrustedAttempt[],
): CompletedChallengeProfile[] {
  const bestByCase = new Map<string, CapabilityEvidenceRecord>();
  for (const evidence of buildCapabilityEvidenceRecords(trustedAttempts)) {
    const current = bestByCase.get(evidence.caseId);
    if (
      current === undefined ||
      evidence.score > current.score ||
      (evidence.score === current.score &&
        compareRfc3339Timestamps(evidence.completedAt, current.completedAt) > 0)
    ) {
      bestByCase.set(evidence.caseId, evidence);
    }
  }
  return [...bestByCase.values()].sort(
    (left, right) =>
      right.score - left.score ||
      compareRfc3339Timestamps(right.completedAt, left.completedAt) ||
      right.attemptId.localeCompare(left.attemptId),
  );
}
