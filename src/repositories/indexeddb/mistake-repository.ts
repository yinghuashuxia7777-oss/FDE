import type { IDBPDatabase } from 'idb';

import type {
  MistakeQuery,
  MistakeRecord,
  MistakeRepository,
  StoredMistakeRecord,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';

export function toStoredMistake(mistake: MistakeRecord): StoredMistakeRecord {
  return {
    ...mistake,
    criticalIndex: mistake.critical ? 'critical' : 'non-critical',
  };
}

function fromStoredMistake(record: StoredMistakeRecord): MistakeRecord {
  const { criticalIndex, ...mistake } = record;
  void criticalIndex;
  return mistake;
}

export class IndexedDbMistakeRepository implements MistakeRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  async get(id: string): Promise<MistakeRecord | undefined> {
    const record = await this.database.get('mistakes', id);
    return record === undefined ? undefined : fromStoredMistake(record);
  }

  async list(query: MistakeQuery = {}): Promise<MistakeRecord[]> {
    let mistakes: StoredMistakeRecord[];
    if (query.skillId !== undefined) {
      mistakes = await this.database.getAllFromIndex(
        'mistakes',
        'by-skill',
        query.skillId,
      );
    } else if (query.errorType !== undefined) {
      mistakes = await this.database.getAllFromIndex(
        'mistakes',
        'by-error',
        query.errorType,
      );
    } else if (query.critical !== undefined) {
      mistakes = await this.database.getAllFromIndex(
        'mistakes',
        'by-critical',
        query.critical ? 'critical' : 'non-critical',
      );
    } else if (query.userId !== undefined) {
      mistakes = await this.database.getAllFromIndex(
        'mistakes',
        'by-user',
        query.userId,
      );
    } else {
      mistakes = await this.database.getAll('mistakes');
    }

    return mistakes
      .filter(
        (mistake) =>
          (query.userId === undefined || mistake.userId === query.userId) &&
          (query.skillId === undefined ||
            mistake.skillIds.includes(query.skillId)) &&
          (query.errorType === undefined ||
            mistake.errorTypes.includes(query.errorType)) &&
          (query.critical === undefined || mistake.critical === query.critical),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(fromStoredMistake);
  }

  async save(mistake: MistakeRecord): Promise<void> {
    await this.database.put('mistakes', toStoredMistake(mistake));
  }

  async delete(id: string): Promise<void> {
    await this.database.delete('mistakes', id);
  }
}
