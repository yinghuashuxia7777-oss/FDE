import type { IDBPDatabase } from 'idb';

import type {
  AttemptQuery,
  AttemptRecord,
  AttemptRepository,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';

export class IndexedDbAttemptRepository implements AttemptRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  get(id: string): Promise<AttemptRecord | undefined> {
    return this.database.get('attempts', id);
  }

  async list(query: AttemptQuery = {}): Promise<AttemptRecord[]> {
    let attempts: AttemptRecord[];
    if (query.completedAfter !== undefined) {
      attempts = await this.database.getAllFromIndex(
        'attempts',
        'by-completed-at',
        IDBKeyRange.lowerBound(query.completedAfter, true),
      );
    } else if (query.caseId !== undefined) {
      attempts = await this.database.getAllFromIndex(
        'attempts',
        'by-case',
        query.caseId,
      );
    } else if (query.status !== undefined) {
      attempts = await this.database.getAllFromIndex(
        'attempts',
        'by-status',
        query.status,
      );
    } else if (query.userId !== undefined) {
      attempts = await this.database.getAllFromIndex(
        'attempts',
        'by-user',
        query.userId,
      );
    } else {
      attempts = await this.database.getAll('attempts');
    }

    return attempts
      .filter(
        (attempt) =>
          (query.userId === undefined || attempt.userId === query.userId) &&
          (query.caseId === undefined || attempt.caseId === query.caseId) &&
          (query.status === undefined || attempt.status === query.status) &&
          (query.completedAfter === undefined ||
            (attempt.completedAt !== undefined &&
              attempt.completedAt > query.completedAfter)),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async save(attempt: AttemptRecord): Promise<void> {
    await this.database.put('attempts', attempt);
  }

  async delete(id: string): Promise<void> {
    await this.database.delete('attempts', id);
  }
}
