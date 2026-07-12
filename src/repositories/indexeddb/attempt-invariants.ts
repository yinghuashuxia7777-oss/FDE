import type {
  AttemptRecord,
  AttemptRoundRecord,
  CompletedAttemptRecord,
} from '../contracts';
import type { Verdict } from '../../domain/scoring/case-score';

const VERDICTS = new Set<Verdict>([
  'excellent',
  'pass',
  'marginal',
  'fail',
  'critical-risk',
]);

export class AttemptInvariantError extends Error {
  override readonly name = 'AttemptInvariantError';
}

export function normalizeTimestamp(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new AttemptInvariantError(`${label} must be a valid timestamp.`);
  }
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new AttemptInvariantError(`${label} must be a valid timestamp.`);
  }
  return timestamp.toISOString();
}

function normalizeRoundHistory(
  roundHistory: readonly AttemptRoundRecord[],
): AttemptRoundRecord[] {
  return roundHistory.map((round) => ({
    ...round,
    submittedAt: normalizeTimestamp(round.submittedAt, 'round submittedAt'),
  }));
}

function hasCompletionField(attempt: AttemptRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(attempt, key);
}

export function normalizeAttemptRecord(attempt: AttemptRecord): AttemptRecord {
  const startedAt = normalizeTimestamp(attempt.startedAt, 'startedAt');
  const updatedAt = normalizeTimestamp(attempt.updatedAt, 'updatedAt');
  const roundHistory = normalizeRoundHistory(attempt.roundHistory);

  if (attempt.status === 'completed') {
    if (
      attempt.currentNodeId !== null ||
      typeof attempt.completedAt !== 'string' ||
      typeof attempt.score !== 'number' ||
      !Number.isFinite(attempt.score) ||
      attempt.score < 0 ||
      attempt.score > 100 ||
      !VERDICTS.has(attempt.verdict)
    ) {
      throw new AttemptInvariantError(
        'A completed attempt requires completedAt, score, verdict, and a null currentNodeId.',
      );
    }
    const completed: CompletedAttemptRecord = {
      ...attempt,
      startedAt,
      updatedAt,
      completedAt: normalizeTimestamp(attempt.completedAt, 'completedAt'),
      roundHistory,
    };
    return completed;
  }

  if (attempt.status === 'in-progress') {
    if (
      typeof attempt.currentNodeId !== 'string' ||
      attempt.currentNodeId.trim().length === 0 ||
      hasCompletionField(attempt, 'completedAt') ||
      hasCompletionField(attempt, 'score') ||
      hasCompletionField(attempt, 'verdict')
    ) {
      throw new AttemptInvariantError(
        'An in-progress attempt requires a currentNodeId and cannot contain completion results.',
      );
    }
    return {
      ...attempt,
      startedAt,
      updatedAt,
      roundHistory,
    };
  }

  if (attempt.status === 'abandoned') {
    if (
      (attempt.currentNodeId !== null &&
        (typeof attempt.currentNodeId !== 'string' ||
          attempt.currentNodeId.trim().length === 0)) ||
      hasCompletionField(attempt, 'completedAt') ||
      hasCompletionField(attempt, 'score') ||
      hasCompletionField(attempt, 'verdict')
    ) {
      throw new AttemptInvariantError(
        'An abandoned attempt cannot contain completion results.',
      );
    }
    return {
      ...attempt,
      startedAt,
      updatedAt,
      roundHistory,
    };
  }

  throw new AttemptInvariantError('Attempt status is not supported.');
}
