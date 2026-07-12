import type { IDBPDatabase } from 'idb';

import type {
  AttemptQuery,
  AttemptRecord,
  AttemptRepository,
} from '../contracts';
import {
  assertAbandonmentProgression,
  assertAttemptIntrinsic,
  assertCheckpointProgression,
  assertFreshCheckpoint,
  AttemptProgressionError,
} from '../attempt-progression';
import type { FdeArenaDatabase } from '../../storage/database';
import {
  compareRfc3339Timestamps,
  rfc3339SecondIndexPrefix,
} from '../../storage/timestamps';
import {
  normalizeAttemptRecord,
  normalizeTimestamp,
} from './attempt-invariants';

export class AttemptCheckpointConflictError extends Error {
  override readonly name = 'AttemptCheckpointConflictError';
}

export class IndexedDbAttemptRepository implements AttemptRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  get(id: string): Promise<AttemptRecord | undefined> {
    return this.database.get('attempts', id);
  }

  async list(query: AttemptQuery = {}): Promise<AttemptRecord[]> {
    const completedAfter =
      query.completedAfter === undefined
        ? undefined
        : normalizeTimestamp(query.completedAfter, 'completedAfter');
    let attempts: AttemptRecord[];
    if (completedAfter !== undefined) {
      attempts = await this.database.getAllFromIndex(
        'attempts',
        'by-completed-at',
        IDBKeyRange.lowerBound(
          rfc3339SecondIndexPrefix(completedAfter, 'completedAfter'),
          true,
        ),
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
          (completedAfter === undefined ||
            (attempt.completedAt !== undefined &&
              compareRfc3339Timestamps(attempt.completedAt, completedAfter) >
                0)),
      )
      .sort((left, right) =>
        compareRfc3339Timestamps(right.updatedAt, left.updatedAt),
      );
  }

  async save(attempt: AttemptRecord): Promise<void> {
    const normalized = normalizeAttemptRecord(attempt);
    if (normalized.status === 'completed') {
      throw new AttemptCheckpointConflictError(
        'Completed attempts can only be written through commitCompletion.',
      );
    }
    try {
      assertAttemptIntrinsic(normalized);
    } catch (error) {
      if (error instanceof AttemptProgressionError) {
        throw new AttemptCheckpointConflictError(error.message);
      }
      throw error;
    }
    const transaction = this.database.transaction('attempts', 'readwrite');
    const existing = await transaction.store.get(normalized.id);
    try {
      if (existing === undefined) {
        if (normalized.status !== 'in-progress') {
          throw new AttemptProgressionError(
            'An abandoned attempt requires an existing in-progress checkpoint.',
          );
        }
        assertFreshCheckpoint(normalized);
      } else if (existing.status === 'completed') {
        throw new AttemptProgressionError(
          'A completed attempt is immutable outside commitCompletion.',
        );
      } else if (existing.status === 'abandoned') {
        throw new AttemptProgressionError(
          'An abandoned attempt cannot transition to another state.',
        );
      } else if (normalized.status === 'in-progress') {
        assertCheckpointProgression(existing, normalized);
      } else {
        assertAbandonmentProgression(existing, normalized);
      }
    } catch (error) {
      if (error instanceof AttemptProgressionError) {
        throw new AttemptCheckpointConflictError(error.message);
      }
      throw error;
    }
    await transaction.store.put(normalized);
    await transaction.done;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete('attempts', id);
  }
}
