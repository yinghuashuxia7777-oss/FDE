import type { IDBPDatabase } from 'idb';

import type { FdeCase } from '../../domain/cases/types';
import type {
  CaseQuery,
  CaseRepository,
  CaseSummary,
  CaseVersionRecord,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';
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
  };
}

export class IndexedDbCaseRepository implements CaseRepository {
  constructor(private readonly database: IDBPDatabase<FdeArenaDatabase>) {}

  async list(query: CaseQuery = {}): Promise<CaseSummary[]> {
    const records = await this.database.getAll('caseVersions');
    const latestByCase = new Map<string, CaseVersionRecord>();
    for (const record of records) {
      const previous = latestByCase.get(record.caseId);
      if (previous === undefined || previous.version < record.version) {
        latestByCase.set(record.caseId, record);
      }
    }

    return [...latestByCase.values()]
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

  async getVersion(
    caseId: string,
    version?: number,
  ): Promise<FdeCase | undefined> {
    if (version !== undefined) {
      return (await this.database.get('caseVersions', [caseId, version]))
        ?.content;
    }

    const versions = await this.database.getAllFromIndex(
      'caseVersions',
      'by-case',
      caseId,
    );
    return versions.reduce<CaseVersionRecord | undefined>(
      (latest, current) =>
        latest === undefined || current.version > latest.version
          ? current
          : latest,
      undefined,
    )?.content;
  }

  seed(cases: readonly FdeCase[]): Promise<void> {
    return seedCaseVersions(this.database, cases);
  }
}
