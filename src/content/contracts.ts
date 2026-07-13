import type { FdeCase, CaseStatus } from '../domain/cases/types';

export const CURRENT_CONTENT_SCHEMA_VERSION = 1 as const;
export const CONTENT_PACK_FORMAT_VERSION = 1 as const;
export const MAX_CONTENT_PACK_BYTES = 10 * 1024 * 1024;
export const MAX_CASES_PER_PACK = 1_000;
export const MAX_NODES_PER_CASE = 200;
export const MAX_OPTIONS_PER_NODE = 50;
export const MAX_EVIDENCE_PER_NODE = 50;
export const MAX_CONTENT_TEXT_LENGTH = 100_000;
export const ACTIVE_CONTENT_CATALOG_META_KEY = 'active-content-catalog';

export type ContentSourceKind = 'bundled' | 'file' | 'url' | 'database';

export interface DomainDefinition {
  schemaVersion: 1;
  id: string;
  label: string;
  description: string;
  status: 'active' | 'deprecated';
}

export interface SkillDefinition {
  schemaVersion: 1;
  id: string;
  domainId: string;
  label: string;
  description: string;
  status: 'active' | 'deprecated';
}

export interface CoveragePlanDomain {
  domainId: string;
  targetCaseCount: number;
}

export interface CoveragePlan {
  schemaVersion: 1;
  targetCaseCount: number;
  domains: CoveragePlanDomain[];
}

export interface ContentConfig {
  packId: string;
  displayName: string;
  contentVersion: string;
  releasedAt: string;
  activeCases: ActiveCaseReference[];
}

export interface ContentManifestCase {
  caseId: string;
  version: number;
  schemaVersion: number;
  status: CaseStatus;
  path: string;
  contentHash: string;
}

export interface ActiveCaseReference {
  caseId: string;
  version: number;
}

export interface ContentManifest {
  packId: string;
  displayName: string;
  contentVersion: string;
  schemaVersion: number;
  releasedAt: string;
  activePublishedCaseCount: number;
  caseVersionCount: number;
  activeCases: ActiveCaseReference[];
  activeCaseIds: string[];
  allCaseIds: string[];
  domains: string[];
  domainCaseCounts: Record<string, number>;
  cases: ContentManifestCase[];
  checksum: string;
}

export interface ContentPack {
  formatVersion: 1;
  manifest: ContentManifest;
  cases: FdeCase[];
  skills: SkillDefinition[];
  domains: DomainDefinition[];
  coverage: CoveragePlan;
}

export interface ActiveContentCatalog {
  packId: string;
  contentVersion: string;
  schemaVersion: number;
  sourceKind: ContentSourceKind;
  activeCases: ActiveCaseReference[];
  activeDomainIds: string[];
  activeSkillIds: string[];
  installedAt: string;
  checksum: string;
}

export interface ContentSource {
  readonly sourceKind: ContentSourceKind;
  loadPack(): Promise<ContentPack>;
}
