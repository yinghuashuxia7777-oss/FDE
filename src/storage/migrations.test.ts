import 'fake-indexeddb/auto';

import { deleteDB, openDB, type DBSchema } from 'idb';

import { openFdeArenaDatabase } from './database';

interface LegacyDatabase extends DBSchema {
  attempts: {
    key: string;
    value: Record<string, unknown>;
  };
  appMeta: {
    key: string;
    value: Record<string, unknown>;
  };
}

describe('IndexedDB migrations', () => {
  it('adds the v2 content store without deleting legacy user history', async () => {
    const name = 'fde-arena-v1-to-v2-preservation';
    const legacy = await openDB<LegacyDatabase>(name, 1, {
      upgrade(database) {
        database.createObjectStore('attempts', { keyPath: 'id' });
        database.createObjectStore('appMeta', { keyPath: 'key' });
      },
    });
    await legacy.put('attempts', {
      id: 'legacy-attempt',
      userId: 'local-user',
      caseId: 'historical-case',
      caseVersion: 1,
      status: 'completed',
      completedAt: '2025-01-01T00:10:00.000Z',
      score: 80,
    });
    legacy.close();

    const migrated = await openFdeArenaDatabase({ name });
    expect(Array.from(migrated.objectStoreNames)).toContain('contentPacks');
    expect(await migrated.get('attempts', 'legacy-attempt')).toEqual(
      expect.objectContaining({
        caseId: 'historical-case',
        caseVersion: 1,
        completedAt: '2025-01-01T00:10:00.000Z',
        score: 80,
      }),
    );
    migrated.close();
    await deleteDB(name);
  });
});
