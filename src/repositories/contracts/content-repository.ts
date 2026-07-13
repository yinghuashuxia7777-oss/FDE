import type {
  ActiveContentCatalog,
  DomainDefinition,
  SkillDefinition,
} from '../../content/contracts';
import type { InstalledContentPackRecord } from './models';

export interface ContentRepository {
  getActiveCatalog(): Promise<ActiveContentCatalog | undefined>;
  getActivePack(): Promise<InstalledContentPackRecord | undefined>;
  getInstalledPack(
    packId: string,
    contentVersion: string,
  ): Promise<InstalledContentPackRecord | undefined>;
  listInstalledPacks(): Promise<InstalledContentPackRecord[]>;
  countHistoricalCaseVersions(): Promise<number>;
  listActiveDomains(): Promise<DomainDefinition[]>;
  listActiveSkills(): Promise<SkillDefinition[]>;
  findDomainDefinition(id: string): Promise<DomainDefinition | undefined>;
  findSkillDefinition(id: string): Promise<SkillDefinition | undefined>;
}
