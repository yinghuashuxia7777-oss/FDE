import type { CoverageRecord } from './models';

export interface CoverageRepository {
  get(caseId: string): Promise<CoverageRecord | undefined>;
  list(): Promise<CoverageRecord[]>;
  saveMany(records: readonly CoverageRecord[]): Promise<void>;
}
