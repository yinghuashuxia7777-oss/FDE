import type { IDBPDatabase } from 'idb';

import {
  LOCAL_USER_ID,
  type AppMetaRecord,
  type LocalUser,
  type UserRepository,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';
import { localUserMetaKey } from '../../storage/seed';

function isLocalUser(value: unknown): value is LocalUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    value.id === LOCAL_USER_ID &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  );
}

export class IndexedDbUserRepository implements UserRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  async getLocal(): Promise<LocalUser | undefined> {
    const record = await this.database.get('appMeta', localUserMetaKey);
    return record !== undefined && isLocalUser(record.value)
      ? record.value
      : undefined;
  }

  async ensureLocalUser(): Promise<LocalUser> {
    const existing = await this.getLocal();
    if (existing !== undefined) {
      return existing;
    }

    const createdAt = new Date().toISOString();
    const user: LocalUser = {
      id: LOCAL_USER_ID,
      displayName: 'Local user',
      createdAt,
    };
    const record: AppMetaRecord = {
      key: localUserMetaKey,
      value: user,
      updatedAt: createdAt,
    };
    await this.database.put('appMeta', record);
    return user;
  }
}
