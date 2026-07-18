import type { IDBPDatabase } from 'idb';

import type { FdeArenaDatabase } from './database';

export function applyMigrations(
  database: IDBPDatabase<FdeArenaDatabase>,
  oldVersion: number,
): void {
  if (oldVersion < 1) {
    const caseVersions = database.createObjectStore('caseVersions', {
      keyPath: ['caseId', 'version'],
    });
    caseVersions.createIndex('by-case', 'caseId');
    caseVersions.createIndex('by-status', 'status');
    caseVersions.createIndex('by-level', 'level');

    const attempts = database.createObjectStore('attempts', { keyPath: 'id' });
    attempts.createIndex('by-user', 'userId');
    attempts.createIndex('by-case', 'caseId');
    attempts.createIndex('by-status', 'status');
    attempts.createIndex('by-completed-at', 'completedAt');
    attempts.createIndex('by-user-case', ['userId', 'caseId']);

    const progress = database.createObjectStore('progress', {
      keyPath: ['userId', 'caseId'],
    });
    progress.createIndex('by-user', 'userId');

    const mastery = database.createObjectStore('mastery', {
      keyPath: ['userId', 'skillId'],
    });
    mastery.createIndex('by-user', 'userId');

    const mistakes = database.createObjectStore('mistakes', { keyPath: 'id' });
    mistakes.createIndex('by-user', 'userId');
    mistakes.createIndex('by-case', 'caseId');
    mistakes.createIndex('by-skill', 'skillIds', { multiEntry: true });
    mistakes.createIndex('by-error', 'errorTypes', { multiEntry: true });
    mistakes.createIndex('by-critical', 'criticalIndex');

    database.createObjectStore('settings', { keyPath: 'userId' });

    const coverage = database.createObjectStore('coverage', {
      keyPath: 'caseId',
    });
    coverage.createIndex('by-status', 'status');
    coverage.createIndex('by-level', 'level');

    database.createObjectStore('appMeta', { keyPath: 'key' });
  }

  if (oldVersion < 2) {
    const contentPacks = database.createObjectStore('contentPacks', {
      keyPath: ['packId', 'contentVersion'],
    });
    contentPacks.createIndex('by-installed-at', 'installedAt');
    contentPacks.createIndex('by-source', 'sourceKind');
  }
}
