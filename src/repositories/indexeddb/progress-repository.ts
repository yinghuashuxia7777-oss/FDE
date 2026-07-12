import type { IDBPDatabase } from 'idb';

import type {
  CaseProgressRecord,
  ProgressRepository,
  ProgressSnapshot,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';
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
    assertSnapshotIdentity(snapshot);
    const transaction = this.database.transaction(
      ['attempts', 'progress', 'mastery', 'mistakes'],
      'readwrite',
    );
    try {
      await transaction.objectStore('attempts').put(snapshot.attempt);
      await transaction.objectStore('progress').put(snapshot.progress);
      for (const mastery of snapshot.mastery) {
        await transaction.objectStore('mastery').put(mastery);
      }
      for (const mistake of snapshot.mistakes) {
        await transaction.objectStore('mistakes').put(toStoredMistake(mistake));
      }
      await transaction.done;
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
