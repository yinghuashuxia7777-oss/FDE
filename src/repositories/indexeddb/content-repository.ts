import type { IDBPDatabase } from 'idb';

import {
  ACTIVE_CONTENT_CATALOG_META_KEY,
  type ActiveContentCatalog,
  type DomainDefinition,
  type SkillDefinition,
} from '../../content/contracts';
import { ActiveContentCatalogSchema } from '../../content/schemas';
import type { FdeArenaDatabase } from '../../storage/database';
import type {
  ContentRepository,
  InstalledContentPackRecord,
} from '../contracts';

export class IndexedDbContentRepository implements ContentRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  async getActiveCatalog(): Promise<ActiveContentCatalog | undefined> {
    const record = await this.database.get(
      'appMeta',
      ACTIVE_CONTENT_CATALOG_META_KEY,
    );
    if (record === undefined) return undefined;
    return ActiveContentCatalogSchema.parse(record.value);
  }

  getInstalledPack(
    packId: string,
    contentVersion: string,
  ): Promise<InstalledContentPackRecord | undefined> {
    return this.database.get('contentPacks', [packId, contentVersion]);
  }

  async getActivePack(): Promise<InstalledContentPackRecord | undefined> {
    const catalog = await this.getActiveCatalog();
    if (catalog === undefined) return undefined;
    return this.getInstalledPack(catalog.packId, catalog.contentVersion);
  }

  async listInstalledPacks(): Promise<InstalledContentPackRecord[]> {
    const packs = await this.database.getAll('contentPacks');
    return packs.sort(
      (left, right) =>
        right.installedAt.localeCompare(left.installedAt) ||
        left.packId.localeCompare(right.packId) ||
        left.contentVersion.localeCompare(right.contentVersion),
    );
  }

  countHistoricalCaseVersions(): Promise<number> {
    return this.database.count('caseVersions');
  }

  async listActiveDomains(): Promise<DomainDefinition[]> {
    const [catalog, pack] = await Promise.all([
      this.getActiveCatalog(),
      this.getActivePack(),
    ]);
    if (catalog === undefined || pack === undefined) return [];
    const byId = new Map(
      pack.domains.map((definition) => [definition.id, definition]),
    );
    return catalog.activeDomainIds.flatMap((id) => {
      const definition = byId.get(id);
      return definition === undefined ? [] : [definition];
    });
  }

  async listActiveSkills(): Promise<SkillDefinition[]> {
    const [catalog, pack] = await Promise.all([
      this.getActiveCatalog(),
      this.getActivePack(),
    ]);
    if (catalog === undefined || pack === undefined) return [];
    const byId = new Map(
      pack.skills.map((definition) => [definition.id, definition]),
    );
    return catalog.activeSkillIds.flatMap((id) => {
      const definition = byId.get(id);
      return definition === undefined ? [] : [definition];
    });
  }

  async findDomainDefinition(
    id: string,
  ): Promise<DomainDefinition | undefined> {
    const active = await this.getActivePack();
    const activeMatch = active?.domains.find(
      (definition) => definition.id === id,
    );
    if (activeMatch !== undefined) return activeMatch;
    for (const pack of await this.listInstalledPacks()) {
      const match = pack.domains.find((definition) => definition.id === id);
      if (match !== undefined) return match;
    }
    return undefined;
  }

  async findSkillDefinition(id: string): Promise<SkillDefinition | undefined> {
    const active = await this.getActivePack();
    const activeMatch = active?.skills.find(
      (definition) => definition.id === id,
    );
    if (activeMatch !== undefined) return activeMatch;
    for (const pack of await this.listInstalledPacks()) {
      const match = pack.skills.find((definition) => definition.id === id);
      if (match !== undefined) return match;
    }
    return undefined;
  }
}
