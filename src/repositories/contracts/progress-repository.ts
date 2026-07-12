import type {
  CaseProgressRecord,
  CompletedAttemptRecord,
  MistakeRecord,
  ProgressSnapshot,
  SkillMasteryRecord,
} from './models';

export interface CompletionMergeContext {
  previousProgress: CaseProgressRecord | undefined;
  previousMastery: readonly SkillMasteryRecord[];
}

export interface CompletionMergeResult {
  progress: CaseProgressRecord;
  mastery: readonly SkillMasteryRecord[];
  mistakes: readonly MistakeRecord[];
}

export type CompletionMerge = (
  context: CompletionMergeContext,
) => CompletionMergeResult;

export interface ProgressRepository {
  get(userId: string, caseId: string): Promise<CaseProgressRecord | undefined>;
  list(userId: string): Promise<CaseProgressRecord[]>;
  save(progress: CaseProgressRecord): Promise<void>;
  saveSnapshot(snapshot: ProgressSnapshot): Promise<void>;
  commitCompletion(
    attempt: CompletedAttemptRecord,
    merge: CompletionMerge,
  ): Promise<CompletedAttemptRecord>;
  clear(userId: string): Promise<void>;
}
