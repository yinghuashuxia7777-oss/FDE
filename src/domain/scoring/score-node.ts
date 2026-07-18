import type { CaseNode, EvaluationResult } from '../cases/types';

export type AttemptNumber = 1 | 2 | 3;

export class NodeScoringDomainError extends Error {
  override readonly name = 'NodeScoringDomainError';
}

function clampPercentage(percentage: number): number {
  if (!Number.isFinite(percentage)) {
    throw new NodeScoringDomainError(
      'Attempt percentage must be a finite number.',
    );
  }

  return Math.min(100, Math.max(0, percentage));
}

export function scoreNode(
  node: CaseNode,
  result: EvaluationResult,
  attemptNumber: AttemptNumber,
  revealed: boolean,
): number {
  if (!Number.isFinite(node.scoring.weight) || node.scoring.weight < 0) {
    throw new NodeScoringDomainError(
      'Node scoring weight must be a finite non-negative number.',
    );
  }
  if (![1, 2, 3].includes(attemptNumber)) {
    throw new NodeScoringDomainError(
      'Attempt number must be one, two, or three.',
    );
  }

  if (!result.isCorrect || revealed) {
    return 0;
  }

  const authoredPercentage =
    attemptNumber === 1
      ? node.scoring.firstTry
      : attemptNumber === 2
        ? node.scoring.secondTry
        : node.scoring.thirdTry;

  return node.scoring.weight * (clampPercentage(authoredPercentage) / 100);
}
