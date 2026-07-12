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

const RFC3339_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

export class AttemptInvariantError extends Error {
  override readonly name = 'AttemptInvariantError';
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidCalendarTime(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === undefined ? 0 : Number(match[7]);
  const offsetMinute = match[8] === undefined ? 0 : Number(match[8]);
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return (
    Number.isInteger(year) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (daysInMonth[month - 1] ?? 0) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59 &&
    offsetHour >= 0 &&
    offsetHour <= 23 &&
    offsetMinute >= 0 &&
    offsetMinute <= 59
  );
}

export function normalizeTimestamp(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new AttemptInvariantError(`${label} must be a valid timestamp.`);
  }
  const match = RFC3339_TIMESTAMP.exec(value);
  if (match === null || !isValidCalendarTime(match)) {
    throw new AttemptInvariantError(
      `${label} must be a valid RFC3339 timestamp.`,
    );
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
