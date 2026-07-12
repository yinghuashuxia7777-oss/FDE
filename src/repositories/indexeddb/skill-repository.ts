import type { IDBPDatabase } from 'idb';

import type { SkillMasteryRecord, SkillRepository } from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';

export class IndexedDbSkillRepository implements SkillRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  get(
    userId: string,
    skillId: string,
  ): Promise<SkillMasteryRecord | undefined> {
    return this.database.get('mastery', [userId, skillId]);
  }

  list(userId: string): Promise<SkillMasteryRecord[]> {
    return this.database.getAllFromIndex('mastery', 'by-user', userId);
  }

  async save(mastery: SkillMasteryRecord): Promise<void> {
    await this.database.put('mastery', mastery);
  }

  async saveMany(records: readonly SkillMasteryRecord[]): Promise<void> {
    const transaction = this.database.transaction('mastery', 'readwrite');
    await Promise.all([
      ...records.map((record) => transaction.store.put(record)),
      transaction.done,
    ]);
  }
}
