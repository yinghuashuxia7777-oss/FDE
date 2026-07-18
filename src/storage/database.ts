import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type {
  AppMetaRecord,
  AttemptRecord,
  CaseProgressRecord,
  CaseVersionRecord,
  CoverageRecord,
  InstalledContentPackRecord,
  SkillMasteryRecord,
  StoredMistakeRecord,
  UserSettings,
} from '../repositories/contracts';
import { applyMigrations } from './migrations';

export const DATABASE_NAME = 'fde-arena';
export const DATABASE_VERSION = 2;

export interface FdeArenaDatabase extends DBSchema {
  caseVersions: {
    key: [string, number];
    value: CaseVersionRecord;
    indexes: {
      'by-case': string;
      'by-status': CaseVersionRecord['status'];
      'by-level': CaseVersionRecord['level'];
    };
  };
  attempts: {
    key: string;
    value: AttemptRecord;
    indexes: {
      'by-user': string;
      'by-case': string;
      'by-status': AttemptRecord['status'];
      'by-completed-at': string;
      'by-user-case': [string, string];
    };
  };
  progress: {
    key: [string, string];
    value: CaseProgressRecord;
    indexes: {
      'by-user': string;
    };
  };
  mastery: {
    key: [string, string];
    value: SkillMasteryRecord;
    indexes: {
      'by-user': string;
    };
  };
  mistakes: {
    key: string;
    value: StoredMistakeRecord;
    indexes: {
      'by-user': string;
      'by-case': string;
      'by-skill': string;
      'by-error': string;
      'by-critical': StoredMistakeRecord['criticalIndex'];
    };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
  coverage: {
    key: string;
    value: CoverageRecord;
    indexes: {
      'by-status': CoverageRecord['status'];
      'by-level': CoverageRecord['level'];
    };
  };
  appMeta: {
    key: string;
    value: AppMetaRecord;
  };
  contentPacks: {
    key: [string, string];
    value: InstalledContentPackRecord;
    indexes: {
      'by-installed-at': string;
      'by-source': InstalledContentPackRecord['sourceKind'];
    };
  };
}

export interface OpenDatabaseOptions {
  name?: string | undefined;
}

export function openFdeArenaDatabase(
  options: OpenDatabaseOptions = {},
): Promise<IDBPDatabase<FdeArenaDatabase>> {
  return openDB<FdeArenaDatabase>(
    options.name ?? DATABASE_NAME,
    DATABASE_VERSION,
    {
      upgrade(database, oldVersion) {
        applyMigrations(database, oldVersion);
      },
    },
  );
}
