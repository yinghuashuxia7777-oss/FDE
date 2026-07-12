import type { CaseProgressRecord, ProgressSnapshot } from './models';

export interface ProgressRepository {
  get(userId: string, caseId: string): Promise<CaseProgressRecord | undefined>;
  list(userId: string): Promise<CaseProgressRecord[]>;
  save(progress: CaseProgressRecord): Promise<void>;
  saveSnapshot(snapshot: ProgressSnapshot): Promise<void>;
  clear(userId: string): Promise<void>;
}
