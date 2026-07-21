import type { CompletedAttemptRecord } from '../../repositories/contracts';

export interface MvpLeafSkill {
  id: string;
  name: string;
  parentSkillId?: string;
}

export interface MvpCaseAttribution {
  caseId: string;
  caseVersion: number;
  leafSkillId: string;
  role: 'primary' | 'secondary';
  evidenceType: string;
}

export interface MvpLeafEvidenceProfile {
  skillId: string;
  label: string;
  parentSkillId: string | undefined;
  score: number | undefined;
  primaryEvidenceCount: number;
  supportingEvidenceCount: number;
  sourceAttemptIds: readonly string[];
}

export function projectMvpLeafEvidence(
  attempts: readonly CompletedAttemptRecord[],
  attributions: readonly MvpCaseAttribution[],
  skills: readonly MvpLeafSkill[],
): MvpLeafEvidenceProfile[] {
  const attributionByCase = new Map<string, MvpCaseAttribution[]>();
  attributions.forEach((attribution) => {
    const key = `${attribution.caseId}@${String(attribution.caseVersion)}`;
    attributionByCase.set(key, [
      ...(attributionByCase.get(key) ?? []),
      attribution,
    ]);
  });
  const evidence = new Map<
    string,
    { primary: CompletedAttemptRecord[]; secondary: Set<string> }
  >();
  const seen = new Set<string>();

  attempts.forEach((attempt) => {
    const mappings =
      attributionByCase.get(
        `${attempt.caseId}@${String(attempt.caseVersion)}`,
      ) ?? [];
    mappings.forEach((mapping) => {
      const sourceKey = `${attempt.id}|${mapping.leafSkillId}`;
      if (seen.has(sourceKey)) return;
      seen.add(sourceKey);
      const current = evidence.get(mapping.leafSkillId) ?? {
        primary: [],
        secondary: new Set<string>(),
      };
      if (mapping.role === 'primary') current.primary.push(attempt);
      else current.secondary.add(attempt.id);
      evidence.set(mapping.leafSkillId, current);
    });
  });

  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  return [...evidence.entries()]
    .map(([skillId, value]): MvpLeafEvidenceProfile => {
      const skill = skillById.get(skillId);
      const sourceAttemptIds = [
        ...new Set([...value.primary.map(({ id }) => id), ...value.secondary]),
      ];
      return {
        skillId,
        label: skill?.name ?? skillId,
        parentSkillId: skill?.parentSkillId,
        score:
          value.primary.length === 0
            ? undefined
            : value.primary.reduce(
                (total, attempt) => total + attempt.score,
                0,
              ) / value.primary.length,
        primaryEvidenceCount: value.primary.length,
        supportingEvidenceCount: value.secondary.size,
        sourceAttemptIds,
      };
    })
    .sort(
      (left, right) =>
        right.primaryEvidenceCount - left.primaryEvidenceCount ||
        left.skillId.localeCompare(right.skillId),
    );
}

export function projectSessionPracticeEvidence(
  evidence: readonly {
    id: string;
    leafSkillId: string;
    evaluationResult: { score: number };
  }[],
  skills: readonly MvpLeafSkill[],
): MvpLeafEvidenceProfile[] {
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const bySkill = new Map<string, typeof evidence>();
  evidence.forEach((item) => {
    bySkill.set(item.leafSkillId, [
      ...(bySkill.get(item.leafSkillId) ?? []),
      item,
    ]);
  });
  return [...bySkill.entries()].map(([skillId, items]) => {
    const skill = skillById.get(skillId);
    return {
      skillId,
      label: skill?.name ?? skillId,
      parentSkillId: skill?.parentSkillId,
      score:
        items.reduce((total, item) => total + item.evaluationResult.score, 0) /
        items.length,
      primaryEvidenceCount: items.length,
      supportingEvidenceCount: 0,
      sourceAttemptIds: items.map(({ id }) => id),
    };
  });
}

export function mergeMvpLeafEvidence(
  ...groups: readonly (readonly MvpLeafEvidenceProfile[])[]
): MvpLeafEvidenceProfile[] {
  const bySkill = new Map<string, MvpLeafEvidenceProfile[]>();
  groups.flat().forEach((profile) => {
    bySkill.set(profile.skillId, [
      ...(bySkill.get(profile.skillId) ?? []),
      profile,
    ]);
  });
  return [...bySkill.values()].map((profiles) => {
    const first = profiles[0]!;
    const scored = profiles.filter(({ score }) => score !== undefined);
    return {
      ...first,
      score:
        scored.length === 0
          ? undefined
          : scored.reduce((total, item) => total + item.score!, 0) /
            scored.length,
      primaryEvidenceCount: profiles.reduce(
        (total, item) => total + item.primaryEvidenceCount,
        0,
      ),
      supportingEvidenceCount: profiles.reduce(
        (total, item) => total + item.supportingEvidenceCount,
        0,
      ),
      sourceAttemptIds: [
        ...new Set(
          profiles.flatMap(({ sourceAttemptIds }) => sourceAttemptIds),
        ),
      ],
    };
  });
}
