import type { IDBPDatabase } from 'idb';

import type { FdeArenaDatabase } from '../storage/database';
import {
  CaseVersionConflictError,
  canonicalJson,
  createCaseVersionRecord,
} from '../storage/seed';
import type {
  AppMetaRecord,
  CaseVersionRecord,
  InstalledContentPackRecord,
} from '../repositories/contracts';
import {
  ACTIVE_CONTENT_CATALOG_META_KEY,
  CURRENT_CONTENT_SCHEMA_VERSION,
  type ActiveContentCatalog,
  type ContentPack,
  type ContentSource,
  type ContentSourceKind,
} from './contracts';
import { deepFreeze } from './deep-freeze';
import { sha256Content } from './hash';
import { validateAndNormalizeContentPack } from './validate-content-pack';

export interface ContentInstallPreview {
  packId: string;
  displayName: string;
  contentVersion: string;
  schemaVersion: number;
  sourceKind: ContentSourceKind;
  activeCaseCount: number;
  caseVersionCount: number;
  newCaseVersionCount: number;
  existingCaseVersionCount: number;
  domainCount: number;
  skillCount: number;
  releasedAt: string;
  checksum: string;
}

export interface PreparedContentInstallation {
  readonly pack: ContentPack;
  readonly sourceKind: ContentSourceKind;
  readonly preview: ContentInstallPreview;
}

export interface ContentInstallerOptions {
  now?: (() => string) | undefined;
  /** Synchronous fault probe used to prove IndexedDB transaction rollback. */
  onInstallStep?: ((step: string) => void) | undefined;
}

export class ContentPackConflictError extends Error {
  override readonly name = 'ContentPackConflictError';

  constructor(packId: string, contentVersion: string) {
    super(
      `Content pack "${packId}" version ${contentVersion} already exists with different content.`,
    );
  }
}

async function existingRecordMatches(
  existing: CaseVersionRecord,
  incoming: CaseVersionRecord,
): Promise<boolean> {
  if (existing.contentHash !== undefined) {
    return existing.contentHash === incoming.contentHash;
  }
  if (existing.canonicalContent === incoming.canonicalContent) return true;
  return (await sha256Content(existing.content)) === incoming.contentHash;
}

function catalogFor(
  pack: ContentPack,
  sourceKind: ContentSourceKind,
  installedAt: string,
): ActiveContentCatalog {
  return {
    packId: pack.manifest.packId,
    contentVersion: pack.manifest.contentVersion,
    schemaVersion: pack.manifest.schemaVersion,
    sourceKind,
    activeCases: pack.manifest.activeCases.map((reference) => ({
      ...reference,
    })),
    activeDomainIds: pack.domains
      .filter(({ status }) => status === 'active')
      .map(({ id }) => id)
      .sort(),
    activeSkillIds: pack.skills
      .filter(({ status }) => status === 'active')
      .map(({ id }) => id)
      .sort(),
    installedAt,
    checksum: pack.manifest.checksum,
  };
}

export class ContentInstaller {
  private readonly now: () => string;
  private readonly onInstallStep: (step: string) => void;

  constructor(
    private readonly database: IDBPDatabase<FdeArenaDatabase>,
    options: ContentInstallerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.onInstallStep = options.onInstallStep ?? (() => undefined);
  }

  async prepare(source: ContentSource): Promise<PreparedContentInstallation> {
    const pack = deepFreeze(
      await validateAndNormalizeContentPack(await source.loadPack()),
    ) as ContentPack;
    const records = await Promise.all(pack.cases.map(createCaseVersionRecord));
    let existingCaseVersionCount = 0;

    for (const record of records) {
      const existing = await this.database.get('caseVersions', [
        record.caseId,
        record.version,
      ]);
      if (existing === undefined) continue;
      existingCaseVersionCount += 1;
      if (!(await existingRecordMatches(existing, record))) {
        throw new CaseVersionConflictError(record.caseId, record.version);
      }
    }

    const existingPack = await this.database.get('contentPacks', [
      pack.manifest.packId,
      pack.manifest.contentVersion,
    ]);
    if (
      existingPack !== undefined &&
      existingPack.checksum !== pack.manifest.checksum
    ) {
      throw new ContentPackConflictError(
        pack.manifest.packId,
        pack.manifest.contentVersion,
      );
    }

    const preview: ContentInstallPreview = {
      packId: pack.manifest.packId,
      displayName: pack.manifest.displayName,
      contentVersion: pack.manifest.contentVersion,
      schemaVersion: pack.manifest.schemaVersion,
      sourceKind: source.sourceKind,
      activeCaseCount: pack.manifest.activePublishedCaseCount,
      caseVersionCount: pack.manifest.caseVersionCount,
      newCaseVersionCount: pack.cases.length - existingCaseVersionCount,
      existingCaseVersionCount,
      domainCount: pack.domains.length,
      skillCount: pack.skills.length,
      releasedAt: pack.manifest.releasedAt,
      checksum: pack.manifest.checksum,
    };
    return deepFreeze({
      pack,
      sourceKind: source.sourceKind,
      preview,
    });
  }

  async install(
    prepared: PreparedContentInstallation,
  ): Promise<ActiveContentCatalog> {
    const { pack, sourceKind } = prepared;
    if (pack.manifest.schemaVersion !== CURRENT_CONTENT_SCHEMA_VERSION) {
      throw new Error(
        'Prepared content schema version is no longer supported.',
      );
    }
    const records = await Promise.all(pack.cases.map(createCaseVersionRecord));
    for (const record of records) {
      const existing = await this.database.get('caseVersions', [
        record.caseId,
        record.version,
      ]);
      if (
        existing !== undefined &&
        !(await existingRecordMatches(existing, record))
      ) {
        throw new CaseVersionConflictError(record.caseId, record.version);
      }
    }
    const installedAt = this.now();
    const catalog = catalogFor(pack, sourceKind, installedAt);
    const installedPack: InstalledContentPackRecord = {
      packId: pack.manifest.packId,
      contentVersion: pack.manifest.contentVersion,
      schemaVersion: pack.manifest.schemaVersion,
      sourceKind,
      manifest: pack.manifest,
      domains: pack.domains,
      skills: pack.skills,
      coverage: pack.coverage,
      installedAt,
      checksum: pack.manifest.checksum,
    };
    const catalogRecord: AppMetaRecord = {
      key: ACTIVE_CONTENT_CATALOG_META_KEY,
      value: catalog,
      updatedAt: installedAt,
    };

    const transaction = this.database.transaction(
      ['caseVersions', 'contentPacks', 'appMeta'],
      'readwrite',
    );
    try {
      const caseStore = transaction.objectStore('caseVersions');
      const existingRecords = await Promise.all(
        records.map((record) => caseStore.get([record.caseId, record.version])),
      );
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index]!;
        const existing = existingRecords[index];
        if (existing !== undefined) {
          if (
            existing.contentHash !== undefined &&
            existing.contentHash !== record.contentHash
          ) {
            throw new CaseVersionConflictError(record.caseId, record.version);
          }
          continue;
        }
        await caseStore.add({
          ...record,
          canonicalContent: canonicalJson(record.content),
        });
        this.onInstallStep(`case:${index}`);
      }

      const packStore = transaction.objectStore('contentPacks');
      const existingPack = await packStore.get([
        installedPack.packId,
        installedPack.contentVersion,
      ]);
      if (
        existingPack !== undefined &&
        existingPack.checksum !== installedPack.checksum
      ) {
        throw new ContentPackConflictError(
          installedPack.packId,
          installedPack.contentVersion,
        );
      }
      await packStore.put(installedPack);
      this.onInstallStep('pack');
      await transaction.objectStore('appMeta').put(catalogRecord);
      this.onInstallStep('catalog');
      await transaction.done;
      return deepFreeze(catalog);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // A failed request may already have aborted the transaction.
      }
      try {
        await transaction.done;
      } catch {
        // Preserve the original validation, conflict, or storage error.
      }
      throw error;
    }
  }
}
