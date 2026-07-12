import type { IDBPDatabase } from 'idb';

import type {
  CaseProgressRecord,
  CompletedAttemptRecord,
  ProgressRepository,
  ProgressSnapshot,
} from '../contracts';
import type { CompletionMerge } from '../contracts/progress-repository';
import type { FdeArenaDatabase } from '../../storage/database';
import { normalizeAttemptRecord } from './attempt-invariants';
import { toStoredMistake } from './mistake-repository';

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
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  get(userId: string, caseId: string): Promise<CaseProgressRecord | undefined> {
    return this.database.get('progress', [userId, caseId]);
  }

  list(userId: string): Promise<CaseProgressRecord[]> {
    return this.database.getAllFromIndex('progress', 'by-user', userId);
  }

  async save(progress: CaseProgressRecord): Promise<void> {
    await this.database.put('progress', progress);
  }

  async saveSnapshot(snapshot: ProgressSnapshot): Promise<void> {
    const normalizedSnapshot: ProgressSnapshot = {
      ...snapshot,
      attempt: normalizeAttemptRecord(snapshot.attempt),
    };
    assertSnapshotIdentity(normalizedSnapshot);
    const transaction = this.database.transaction(
      ['attempts', 'progress', 'mastery', 'mistakes'],
      'readwrite',
    );
    try {
      await transaction.objectStore('attempts').put(normalizedSnapshot.attempt);
      await transaction
        .objectStore('progress')
        .put(normalizedSnapshot.progress);
      for (const mastery of normalizedSnapshot.mastery) {
        await transaction.objectStore('mastery').put(mastery);
      }
      for (const mistake of normalizedSnapshot.mistakes) {
        await transaction.objectStore('mistakes').put(toStoredMistake(mistake));
      }
      await transaction.done;
    } catch (error) {
      await settleAbortedTransaction(transaction);
      throw error;
    }
  }

  async commitCompletion(
    attempt: CompletedAttemptRecord,
    merge: CompletionMerge,
  ): Promise<CompletedAttemptRecord> {
    const normalizedAttempt = normalizeAttemptRecord(attempt);
    if (normalizedAttempt.status !== 'completed') {
      throw new Error('A completion commit requires a completed attempt.');
    }
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

      if (
        existingAttempt !== undefined &&
        (existingAttempt.userId !== normalizedAttempt.userId ||
          existingAttempt.caseId !== normalizedAttempt.caseId ||
          existingAttempt.caseVersion !== normalizedAttempt.caseVersion)
      ) {
        throw new Error(
          'An existing attempt must use the same user, case, and case version.',
        );
      }
      if (existingAttempt?.status === 'completed') {
        await transaction.done;
        return existingAttempt;
      }

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
}
