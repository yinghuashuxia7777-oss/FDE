import { MasteryDomainError } from './update-mastery';

export interface CompletedSkillNode {
  score0to100: number;
  skillWeights: Readonly<Record<string, number>>;
}

interface SkillAccumulator {
  weightedScore: number;
  totalWeight: number;
}

export function aggregateSkillScores(
  completedNodes: readonly CompletedSkillNode[],
): Record<string, number> {
  const accumulators = new Map<string, SkillAccumulator>();

  for (const { score0to100, skillWeights } of completedNodes) {
    if (!Number.isFinite(score0to100) || score0to100 < 0 || score0to100 > 100) {
      throw new MasteryDomainError(
        'Completed node score must be finite and between 0 and 100.',
      );
    }
    if (
      typeof skillWeights !== 'object' ||
      skillWeights === null ||
      Array.isArray(skillWeights)
    ) {
      throw new MasteryDomainError('Skill weights must be a record.');
    }

    for (const [skillId, weight] of Object.entries(skillWeights)) {
      if (skillId.trim().length === 0) {
        throw new MasteryDomainError('Skill IDs must not be empty.');
      }
      if (!Number.isFinite(weight) || weight < 0) {
        throw new MasteryDomainError(
          `Weight for skill "${skillId}" must be finite and non-negative.`,
        );
      }
      if (weight === 0) {
        continue;
      }

      const previous = accumulators.get(skillId) ?? {
        weightedScore: 0,
        totalWeight: 0,
      };
      const weightedScore = previous.weightedScore + score0to100 * weight;
      const totalWeight = previous.totalWeight + weight;
      if (!Number.isFinite(weightedScore) || !Number.isFinite(totalWeight)) {
        throw new MasteryDomainError(
          `Aggregate weight for skill "${skillId}" is too large.`,
        );
      }
      accumulators.set(skillId, { weightedScore, totalWeight });
    }
  }

  return Object.fromEntries(
    [...accumulators.entries()]
      .sort(([leftSkillId], [rightSkillId]) =>
        leftSkillId.localeCompare(rightSkillId),
      )
      .map(([skillId, { weightedScore, totalWeight }]) => [
        skillId,
        weightedScore / totalWeight,
      ]),
  );
}
