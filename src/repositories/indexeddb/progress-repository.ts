import type { IDBPDatabase } from 'idb';
import type { FdeCase } from '../../domain/cases/types';

import type {
  CaseProgressRecord,
  CompletedAttemptRecord,
  LocalDataBundle,
  ProgressRepository,
  ProgressSnapshot,
} from '../contracts';
import {
  assertAttemptIntrinsic,
  assertAttemptMatchesCase,
  assertCompletedRetry,
  assertCompletionProgression,
  AttemptProgressionError,
} from '../attempt-progression';
import type { CompletionMerge } from '../contracts/progress-repository';
import type { FdeArenaDatabase } from '../../storage/database';
import { normalizeAttemptRecord } from './attempt-invariants';
import { toStoredMistake } from './mistake-repository';
import { LocalDataBundleSchema } from '../../schemas/export.schema';
import { getVerdict } from '../../domain/scoring/case-score';

interface ProgressRepositoryFaultInjector {
  afterReplaceDelete?: () => void;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

const FALLBACK_MISTAKE_ERROR_TYPE = 'incorrect-submission';

function persistedMistakeErrorTypes(errorTypes: readonly string[]) {
  return errorTypes.length > 0 ? errorTypes : [FALLBACK_MISTAKE_ERROR_TYPE];
}

function assertPortableReferences(bundle: LocalDataBundle): void {
  const attempts = new Map(
    bundle.attempts.map((attempt) => [attempt.id, attempt]),
  );
  for (const attempt of bundle.attempts) {
    if (
      attempt.status === 'completed' &&
      getVerdict(attempt.score, attempt.criticalErrorIds) !== attempt.verdict
    ) {
      throw new Error(
        'Completed attempt verdict does not match score and critical errors.',
      );
    }
  }
  for (const mistake of bundle.mistakes) {
    const attempt = attempts.get(mistake.attemptId);
    const matchingRound =
      attempt?.status === 'completed'
        ? attempt.roundHistory.find(
            (round) =>
              round.nodeId === mistake.nodeId &&
              !round.evaluation.isCorrect &&
              round.submittedAt === mistake.createdAt &&
              JSON.stringify(canonicalize(round.submission)) ===
                JSON.stringify(canonicalize(mistake.submission)) &&
              mistake.critical ===
                round.evaluation.criticalErrorIds.length > 0 &&
              sameStringSet(
                persistedMistakeErrorTypes(round.evaluation.errorTypes),
                mistake.errorTypes,
              ),
          )
        : undefined;
    if (matchingRound === undefined) {
      throw new Error(
        'Mistake must match a specific wrong round on a completed attempt.',
      );
    }
  }
}

function assertSnapshotIdentity(snapshot: ProgressSnapshot): void {
  const { attempt, progress } = snapshot;
  if (
    attempt.userId !== progress.userId ||
    attempt.caseId !== progress.caseId ||
    attempt.caseVersion !== progress.caseVersion ||
    snapshot.mastery.some((record) => record.userId !== attempt.userId) ||
    snapshot.mistakes.some(
      (record) =>
        record.userId !== attempt.userId ||
        record.attemptId !== attempt.id ||
        record.caseId !== attempt.caseId ||
        record.caseVersion !== attempt.caseVersion,
    )
  ) {
    throw new Error(
      'A progress snapshot must use the same user, case, and case version.',
    );
  }
  if (progress.latestAttemptId !== attempt.id) {
    throw new Error(
      'Progress latest attempt ID must match the persisted attempt ID.',
    );
  }
}

async function settleAbortedTransaction(
  transaction: ReturnType<IDBPDatabase<FdeArenaDatabase>['transaction']>,
): Promise<void> {
  try {
    transaction.abort();
  } catch {
    // A failed request may already have aborted the transaction.
  }
  try {
    await transaction.done;
  } catch {
    // The caller preserves the original error.
  }
}

export class IndexedDbProgressRepository implements ProgressRepository {
  constructor(
    private readonly database: IDBPDatabase<FdeArenaDatabase>,
    private readonly faultInjector: ProgressRepositoryFaultInjector = {},
  ) {}

  get(userId: string, caseId: string): Promise<CaseProgressRecord | undefined> {
    return this.database.get('progress', [userId, caseId]);
  }

  list(userId: string): Promise<CaseProgressRecord[]> {
    return this.database.getAllFromIndex('progress', 'by-user', userId);
  }

  async commitCompletion(
    attempt: CompletedAttemptRecord,
    caseContent: FdeCase,
    merge: CompletionMerge,
  ): Promise<CompletedAttemptRecord> {
    const normalizedAttempt = normalizeAttemptRecord(attempt);
    if (normalizedAttempt.status !== 'completed') {
      throw new Error('A completion commit requires a completed attempt.');
    }
    assertAttemptIntrinsic(normalizedAttempt);
    assertAttemptMatchesCase(normalizedAttempt, caseContent);
    const transaction = this.database.transaction(
      ['attempts', 'progress', 'mastery', 'mistakes'],
      'readwrite',
    );
    try {
      const attempts = transaction.objectStore('attempts');
      const progress = transaction.objectStore('progress');
      const mastery = transaction.objectStore('mastery');
      const mistakes = transaction.objectStore('mistakes');
      const [existingAttempt, previousProgress, previousMastery] =
        await Promise.all([
          attempts.get(normalizedAttempt.id),
          progress.get([normalizedAttempt.userId, normalizedAttempt.caseId]),
          mastery.index('by-user').getAll(normalizedAttempt.userId),
        ]);

      if (existingAttempt === undefined) {
        throw new AttemptProgressionError(
          'Completion requires an existing in-progress checkpoint.',
        );
      }
      if (existingAttempt.status === 'completed') {
        assertCompletedRetry(existingAttempt, normalizedAttempt);
        await transaction.done;
        return existingAttempt;
      }
      if (existingAttempt.status === 'abandoned') {
        throw new AttemptProgressionError(
          'An abandoned attempt cannot be completed.',
        );
      }
      assertCompletionProgression(existingAttempt, normalizedAttempt);

      const merged = merge({ previousProgress, previousMastery });
      if (
        typeof merged !== 'object' ||
        merged === null ||
        typeof (merged as { then?: unknown }).then === 'function'
      ) {
        throw new Error('The completion merge callback must be synchronous.');
      }
      const snapshot: ProgressSnapshot = {
        attempt: normalizedAttempt,
        progress: merged.progress,
        mastery: [...merged.mastery],
        mistakes: [...merged.mistakes],
      };
      assertSnapshotIdentity(snapshot);

      await attempts.put(normalizedAttempt);
      await progress.put(snapshot.progress);
      for (const masteryRecord of snapshot.mastery) {
        await mastery.put(masteryRecord);
      }
      for (const mistake of snapshot.mistakes) {
        await mistakes.put(toStoredMistake(mistake));
      }
      await transaction.done;
      return normalizedAttempt;
    } catch (error) {
      await settleAbortedTransaction(transaction);
      throw error;
    }
  }

  async clear(userId: string): Promise<void> {
    const transaction = this.database.transaction(
      ['attempts', 'progress', 'mastery', 'mistakes'],
      'readwrite',
    );
    try {
      const attempts = transaction.objectStore('attempts');
      const progress = transaction.objectStore('progress');
      const mastery = transaction.objectStore('mastery');
      const mistakes = transaction.objectStore('mistakes');
      const [attemptKeys, progressKeys, masteryKeys, mistakeKeys] =
        await Promise.all([
          attempts.index('by-user').getAllKeys(userId),
          progress.index('by-user').getAllKeys(userId),
          mastery.index('by-user').getAllKeys(userId),
          mistakes.index('by-user').getAllKeys(userId),
        ]);

      await Promise.all([
        ...attemptKeys.map((key) => attempts.delete(key)),
        ...progressKeys.map((key) => progress.delete(key)),
        ...masteryKeys.map((key) => mastery.delete(key)),
        ...mistakeKeys.map((key) => mistakes.delete(key)),
      ]);
      await transaction.done;
    } catch (error) {
      await settleAbortedTransaction(transaction);
      throw error;
    }
  }

  async exportUserData(userId: string): Promise<LocalDataBundle> {
    if (userId !== 'local-user') {
      throw new Error('Only the fixed local user can be exported.');
    }
    const transaction = this.database.transaction(
      ['attempts', 'progress', 'mastery', 'mistakes', 'settings'],
      'readonly',
    );
    const [attempts, progress, mastery, storedMistakes, settings] =
      await Promise.all([
        transaction.objectStore('attempts').index('by-user').getAll(userId),
        transaction.objectStore('progress').index('by-user').getAll(userId),
        transaction.objectStore('mastery').index('by-user').getAll(userId),
        transaction.objectStore('mistakes').index('by-user').getAll(userId),
        transaction.objectStore('settings').get(userId),
      ]);
    await transaction.done;
    const byId = <T extends { id: string }>(left: T, right: T) =>
      left.id.localeCompare(right.id);
    return LocalDataBundleSchema.parse({
      userId,
      attempts: attempts.sort(byId),
      progress: progress.sort((left, right) =>
        left.caseId.localeCompare(right.caseId),
      ),
      mastery: mastery.sort((left, right) =>
        left.skillId.localeCompare(right.skillId),
      ),
      mistakes: storedMistakes
        .map((record) => {
          const { criticalIndex, ...mistake } = record;
          void criticalIndex;
          return mistake;
        })
        .sort(byId),
      settings: settings ?? null,
    });
  }

  async replaceUserData(bundle: LocalDataBundle): Promise<void> {
    const parsed = LocalDataBundleSchema.parse(bundle);
    const validated: LocalDataBundle = {
      ...parsed,
      attempts: parsed.attempts.map((attempt) =>
        normalizeAttemptRecord(attempt),
      ),
    };
    validated.attempts.forEach(assertAttemptIntrinsic);
    assertPortableReferences(validated);
    const userId = validated.userId;
    const transaction = this.database.transaction(
      ['attempts', 'progress', 'mastery', 'mistakes', 'settings'],
      'readwrite',
    );
    try {
      const attempts = transaction.objectStore('attempts');
      const progress = transaction.objectStore('progress');
      const mastery = transaction.objectStore('mastery');
      const mistakes = transaction.objectStore('mistakes');
      const settings = transaction.objectStore('settings');
      const [attemptKeys, progressKeys, masteryKeys, mistakeKeys] =
        await Promise.all([
          attempts.index('by-user').getAllKeys(userId),
          progress.index('by-user').getAllKeys(userId),
          mastery.index('by-user').getAllKeys(userId),
          mistakes.index('by-user').getAllKeys(userId),
        ]);
      await Promise.all([
        ...attemptKeys.map((key) => attempts.delete(key)),
        ...progressKeys.map((key) => progress.delete(key)),
        ...masteryKeys.map((key) => mastery.delete(key)),
        ...mistakeKeys.map((key) => mistakes.delete(key)),
        settings.delete(userId),
      ]);
      this.faultInjector.afterReplaceDelete?.();
      await Promise.all([
        ...validated.attempts.map((record) => attempts.put(record)),
        ...validated.progress.map((record) => progress.put(record)),
        ...validated.mastery.map((record) => mastery.put(record)),
        ...validated.mistakes.map((record) =>
          mistakes.put(toStoredMistake(record)),
        ),
        ...(validated.settings === null
          ? []
          : [settings.put(validated.settings)]),
      ]);
      await transaction.done;
    } catch (error) {
      await settleAbortedTransaction(transaction);
      throw error;
    }
  }
}
