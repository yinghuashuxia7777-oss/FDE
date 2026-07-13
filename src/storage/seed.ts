import type { IDBPDatabase } from 'idb';

import type { FdeCase } from '../domain/cases/types';
import { canonicalizeContent } from '../content/canonicalize';
import { sha256Content } from '../content/hash';
import {
  LOCAL_USER_ID,
  type AppMetaRecord,
  type CaseVersionRecord,
  type LocalUser,
} from '../repositories/contracts';
import type { FdeArenaDatabase } from './database';

const LOCAL_USER_META_KEY = 'local-user-profile';

export class CaseVersionConflictError extends Error {
  override readonly name = 'CaseVersionConflictError';

  constructor(caseId: string, version: number) {
    super(
      `Case "${caseId}" version ${version} already exists with different content.`,
    );
  }
}

export function canonicalJson(value: unknown): string {
  return canonicalizeContent(value);
}

export async function createCaseVersionRecord(
  content: FdeCase,
): Promise<CaseVersionRecord> {
  return {
    caseId: content.id,
    version: content.metadata.version,
    schemaVersion: content.schemaVersion,
    contentHash: await sha256Content(content),
    status: content.status,
    level: content.level,
    canonicalContent: canonicalJson(content),
    content,
  };
}

export async function seedCaseVersions(
  database: IDBPDatabase<FdeArenaDatabase>,
  cases: readonly FdeCase[],
): Promise<void> {
  const records = await Promise.all(cases.map(createCaseVersionRecord));
  const transaction = database.transaction('caseVersions', 'readwrite');
  try {
    for (const record of records) {
      const existing = await transaction.store.get([
        record.caseId,
        record.version,
      ]);
      if (existing !== undefined) {
        if (existing.canonicalContent !== record.canonicalContent) {
          throw new CaseVersionConflictError(record.caseId, record.version);
        }
        continue;
      }
      await transaction.store.add(record);
    }
    await transaction.done;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // A failed request may already have aborted the transaction.
    }
    try {
      await transaction.done;
    } catch {
      // Preserve the original conflict or request error.
    }
    throw error;
  }
}

export async function bootstrapDatabase(
  database: IDBPDatabase<FdeArenaDatabase>,
  cases: readonly FdeCase[],
): Promise<void> {
  const records = await Promise.all(cases.map(createCaseVersionRecord));
  const transaction = database.transaction(
    ['caseVersions', 'appMeta'],
    'readwrite',
  );
  try {
    for (const record of records) {
      const existing = await transaction
        .objectStore('caseVersions')
        .get([record.caseId, record.version]);
      if (existing !== undefined) {
        if (existing.canonicalContent !== record.canonicalContent) {
          throw new CaseVersionConflictError(record.caseId, record.version);
        }
        continue;
      }
      await transaction.objectStore('caseVersions').add(record);
    }

    const appMeta = transaction.objectStore('appMeta');
    if ((await appMeta.get(LOCAL_USER_META_KEY)) === undefined) {
      const createdAt = new Date().toISOString();
      const user: LocalUser = {
        id: LOCAL_USER_ID,
        displayName: 'Local user',
        createdAt,
      };
      const record: AppMetaRecord = {
        key: LOCAL_USER_META_KEY,
        value: user,
        updatedAt: createdAt,
      };
      await appMeta.add(record);
    }
    await transaction.done;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // A failed request may already have aborted the transaction.
    }
    try {
      await transaction.done;
    } catch {
      // Preserve the original conflict or request error.
    }
    throw error;
  }
}

export const localUserMetaKey = LOCAL_USER_META_KEY;
