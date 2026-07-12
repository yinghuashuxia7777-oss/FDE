import type { IDBPDatabase } from 'idb';

import type {
  AttemptQuery,
  AttemptRecord,
  AttemptRepository,
} from '../contracts';
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

function sameIdentity(left: AttemptRecord, right: AttemptRecord): boolean {
  return (
    left.userId === right.userId &&
    left.caseId === right.caseId &&
    left.caseVersion === right.caseVersion
  );
}

function isJsonPrefix(
  existing: readonly unknown[],
  incoming: readonly unknown[],
): boolean {
  return (
    existing.length <= incoming.length &&
    existing.every(
      (value, index) =>
        JSON.stringify(value) === JSON.stringify(incoming[index]),
    )
  );
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
    const transaction = this.database.transaction('attempts', 'readwrite');
    const existing = await transaction.store.get(normalized.id);
    if (existing !== undefined && !sameIdentity(existing, normalized)) {
      throw new AttemptCheckpointConflictError(
        'Attempt checkpoint identity must use the same user, case, and version.',
      );
    }
    if (
      existing?.status === 'completed' &&
      normalized.status === 'in-progress'
    ) {
      await transaction.done;
      return;
    }
    if (
      existing?.status === 'in-progress' &&
      normalized.status === 'in-progress'
    ) {
      const chronologyMovesForward =
        compareRfc3339Timestamps(normalized.updatedAt, existing.updatedAt) >= 0;
      const historyMovesForward = isJsonPrefix(
        existing.roundHistory,
        normalized.roundHistory,
      );
      const pathMovesForward = isJsonPrefix(
        existing.visitedNodeIds,
        normalized.visitedNodeIds,
      );
      const consequencesMoveForward = isJsonPrefix(
        existing.consequences ?? [],
        normalized.consequences ?? [],
      );
      if (
        !chronologyMovesForward ||
        !historyMovesForward ||
        !pathMovesForward ||
        !consequencesMoveForward
      ) {
        throw new AttemptCheckpointConflictError(
          'Attempt checkpoint cannot roll stored history or path backward.',
        );
      }
    }
    await transaction.store.put(normalized);
    await transaction.done;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete('attempts', id);
  }
}
