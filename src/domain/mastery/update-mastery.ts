export class MasteryDomainError extends Error {
  override readonly name = 'MasteryDomainError';
}

function assertScore(score: number, label: string): void {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new MasteryDomainError(
      `${label} must be a finite number between 0 and 100.`,
    );
  }
}

export function updateMastery(
  previous: number | undefined,
  currentScore: number,
  critical: boolean,
): number {
  assertScore(currentScore, 'Current mastery score');
  if (previous !== undefined) {
    assertScore(previous, 'Previous mastery score');
  }

  const adjustedCurrentScore = critical
    ? Math.min(currentScore, 40)
    : currentScore;
  return previous === undefined
    ? adjustedCurrentScore
    : previous * 0.7 + adjustedCurrentScore * 0.3;
}
