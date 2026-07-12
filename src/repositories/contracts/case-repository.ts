import type { FdeCase } from '../../domain/cases/types';
import type { CaseQuery, CaseSummary } from './models';

export interface CaseRepository {
  list(query?: CaseQuery): Promise<CaseSummary[]>;
  getVersion(caseId: string, version?: number): Promise<FdeCase | undefined>;
  seed(cases: readonly FdeCase[]): Promise<void>;
}
