import type { IDBPDatabase } from 'idb';

import type { SettingsRepository, UserSettings } from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';

export class IndexedDbSettingsRepository implements SettingsRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  get(userId: string): Promise<UserSettings | undefined> {
    return this.database.get('settings', userId);
  }

  async save(settings: UserSettings): Promise<void> {
    await this.database.put('settings', settings);
  }
}
