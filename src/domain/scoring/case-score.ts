export interface CaseScoreEntry {
  earnedPoints: number;
  possiblePoints: number;
}

export type Verdict =
  'excellent' | 'pass' | 'marginal' | 'fail' | 'critical-risk';

export class CaseScoringDomainError extends Error {
  override readonly name = 'CaseScoringDomainError';
}

function assertNormalizedScore(score: number): void {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new CaseScoringDomainError(
      'Case score must be a finite number between 0 and 100.',
    );
  }
}

export function scoreCase(entries: readonly CaseScoreEntry[]): number {
  for (const { earnedPoints, possiblePoints } of entries) {
    if (
      !Number.isFinite(earnedPoints) ||
      !Number.isFinite(possiblePoints) ||
      earnedPoints < 0 ||
      possiblePoints < 0
    ) {
      throw new CaseScoringDomainError(
        'Case score entries require finite non-negative points.',
      );
    }
  }

  const possiblePoints = entries.reduce(
    (total, entry) => total + entry.possiblePoints,
    0,
  );
  const earnedPoints = entries.reduce(
    (total, entry) => total + entry.earnedPoints,
    0,
  );
  if (!Number.isFinite(possiblePoints) || !Number.isFinite(earnedPoints)) {
    throw new CaseScoringDomainError('Case score totals must remain finite.');
  }
  if (possiblePoints === 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (earnedPoints / possiblePoints) * 100));
}

export function getVerdict(
  score: number,
  criticalErrors: readonly string[],
): Verdict {
  assertNormalizedScore(score);

  if (criticalErrors.length > 0) {
    return 'critical-risk';
  }
  if (score >= 85) {
    return 'excellent';
  }
  if (score >= 70) {
    return 'pass';
  }
  if (score >= 55) {
    return 'marginal';
  }
  return 'fail';
}
