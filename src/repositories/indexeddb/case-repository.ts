import type { IDBPDatabase } from 'idb';

import type { FdeCase } from '../../domain/cases/types';
import type {
  CaseQuery,
  CaseRepository,
  CaseSummary,
  CaseVersionRecord,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';
import { ACTIVE_CONTENT_CATALOG_META_KEY } from '../../content/contracts';
import { ActiveContentCatalogSchema } from '../../content/schemas';
import { seedCaseVersions } from '../../storage/seed';

function toSummary(record: CaseVersionRecord): CaseSummary {
  const content = record.content;
  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    level: content.level,
    status: content.status,
    version: content.metadata.version,
    estimatedMinutes: content.estimatedMinutes,
    domains: content.domains,
    skills: content.skills,
    riskTypes: content.riskTypes,
    scenarioSummary: content.scenario.initialIncident,
    technicalLayers: content.technicalLayers,
    nodeTypes: [...new Set(content.nodes.map(({ type }) => type))],
  };
}

export class IndexedDbCaseRepository implements CaseRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  async listActive(query: CaseQuery = {}): Promise<CaseSummary[]> {
    const catalogRecord = await this.database.get(
      'appMeta',
      ACTIVE_CONTENT_CATALOG_META_KEY,
    );
    if (catalogRecord === undefined) return [];
    const catalog = ActiveContentCatalogSchema.parse(catalogRecord.value);
    const records = await Promise.all(
      catalog.activeCases.map(async ({ caseId, version }) => {
        const record = await this.database.get('caseVersions', [
          caseId,
          version,
        ]);
        if (record === undefined) {
          throw new Error(`Active case ${caseId}@${version} is not installed.`);
        }
        return record;
      }),
    );

    return records
      .filter(
        ({ content }) =>
          (query.level === undefined || content.level === query.level) &&
          (query.status === undefined || content.status === query.status) &&
          (query.domain === undefined ||
            content.domains.includes(query.domain)),
      )
      .sort((left, right) => left.caseId.localeCompare(right.caseId))
      .map(toSummary);
  }

  list(query: CaseQuery = {}): Promise<CaseSummary[]> {
    return this.listActive(query);
  }

  async getVersion(
    caseId: string,
    version?: number,
  ): Promise<FdeCase | undefined> {
    if (version !== undefined) {
      return (await this.database.get('caseVersions', [caseId, version]))
        ?.content;
    }

    return undefined;
  }

  seed(cases: readonly FdeCase[]): Promise<void> {
    return seedCaseVersions(this.database, cases);
  }
}
