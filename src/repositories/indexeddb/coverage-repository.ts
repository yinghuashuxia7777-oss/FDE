import type { IDBPDatabase } from 'idb';

import type { CoverageRecord, CoverageRepository } from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';

export class IndexedDbCoverageRepository implements CoverageRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  get(caseId: string): Promise<CoverageRecord | undefined> {
    return this.database.get('coverage', caseId);
  }

  async list(): Promise<CoverageRecord[]> {
    return (await this.database.getAll('coverage')).sort((left, right) =>
      left.caseId.localeCompare(right.caseId),
    );
  }

  async saveMany(records: readonly CoverageRecord[]): Promise<void> {
    const transaction = this.database.transaction('coverage', 'readwrite');
    await Promise.all([
      ...records.map((record) => transaction.store.put(record)),
      transaction.done,
    ]);
  }
}
