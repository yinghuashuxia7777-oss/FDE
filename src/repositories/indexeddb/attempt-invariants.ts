import type {
  AttemptRecord,
  AttemptRoundRecord,
  CompletedAttemptRecord,
} from '../contracts';
import { ATTEMPT_SCHEMA_VERSION } from '../contracts';
import type { Verdict } from '../../domain/scoring/case-score';
import {
  compareRfc3339Timestamps,
  normalizeRfc3339Timestamp,
  TimestampInvariantError,
} from '../../storage/timestamps';

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
  try {
    return normalizeRfc3339Timestamp(value, label);
  } catch (error) {
    if (error instanceof TimestampInvariantError) {
      throw new AttemptInvariantError(error.message);
    }
    throw error;
  }
}

function normalizeRoundHistory(
  roundHistory: readonly AttemptRoundRecord[],
): AttemptRoundRecord[] {
  return roundHistory.map((round) => ({
    ...round,
    submittedAt: normalizeTimestamp(round.submittedAt, 'round submittedAt'),
  }));
}

function assertBaseChronology(
  startedAt: string,
  roundHistory: readonly AttemptRoundRecord[],
  updatedAt: string,
): void {
  let previous = startedAt;
  for (const round of roundHistory) {
    if (compareRfc3339Timestamps(round.submittedAt, previous) < 0) {
      throw new AttemptInvariantError(
        'Attempt round timestamps must be chronological after startedAt.',
      );
    }
    previous = round.submittedAt;
  }
  if (compareRfc3339Timestamps(updatedAt, previous) < 0) {
    throw new AttemptInvariantError(
      'Attempt updatedAt cannot be before its latest round timestamp.',
    );
  }
}

function hasCompletionField(attempt: AttemptRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(attempt, key);
}

export function normalizeAttemptRecord(attempt: AttemptRecord): AttemptRecord {
  const rawSchemaVersion: unknown = attempt.schemaVersion;
  if (
    rawSchemaVersion !== undefined &&
    rawSchemaVersion !== ATTEMPT_SCHEMA_VERSION
  ) {
    const receivedVersion =
      typeof rawSchemaVersion === 'number' ||
      typeof rawSchemaVersion === 'string'
        ? String(rawSchemaVersion)
        : 'invalid';
    throw new AttemptInvariantError(
      `Attempt schemaVersion ${receivedVersion} is not supported.`,
    );
  }
  const schemaVersion = ATTEMPT_SCHEMA_VERSION;
  const startedAt = normalizeTimestamp(attempt.startedAt, 'startedAt');
  const updatedAt = normalizeTimestamp(attempt.updatedAt, 'updatedAt');
  const roundHistory = normalizeRoundHistory(attempt.roundHistory);
  assertBaseChronology(startedAt, roundHistory, updatedAt);

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
    const completedAt = normalizeTimestamp(attempt.completedAt, 'completedAt');
    const lastRoundAt = roundHistory.at(-1)?.submittedAt ?? startedAt;
    if (
      compareRfc3339Timestamps(completedAt, lastRoundAt) < 0 ||
      compareRfc3339Timestamps(updatedAt, completedAt) < 0
    ) {
      throw new AttemptInvariantError(
        'A completed attempt requires latest round <= completedAt <= updatedAt.',
      );
    }
    const completed: CompletedAttemptRecord = {
      ...attempt,
      schemaVersion,
      startedAt,
      updatedAt,
      completedAt,
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
      schemaVersion,
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
      schemaVersion,
      startedAt,
      updatedAt,
      roundHistory,
    };
  }

  throw new AttemptInvariantError('Attempt status is not supported.');
}
