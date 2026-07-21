export const BETA_STORAGE_KEYS = {
  practice: 'fde-arena:beta:practice-completions:v1',
  project: 'fde-arena:beta:project-evidence:v1',
  feedback: 'fde-arena:beta:feedback:v1',
} as const;

export type ProjectMilestone = 'architecture' | 'evaluation' | 'deployment';
export type FeedbackCategory =
  | 'product-feedback'
  | 'content-issue'
  | 'difficulty'
  | 'case-difficulty'
  | 'feature-suggestion';

export interface PracticeCompletionRecord {
  id: string;
  practiceId: string;
  leafSkillId: string;
  completedAt: string;
  evaluationResult: { outcome: 'passed'; score: number };
  evidenceOutput: { artifactType: string; response: string };
  provenance: 'local-practice';
}

export interface ProjectEvidenceRecord {
  projectId: string;
  completedMilestones: readonly ProjectMilestone[];
  updatedAt: string;
}

export interface BetaFeedbackRecord {
  id: string;
  category: FeedbackCategory;
  message: string;
  contextPath: string;
  createdAt: string;
}

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

function readArray<T>(key: string, guard: (value: unknown) => value is T): T[] {
  try {
    const raw = storage()?.getItem(key);
    if (raw === null || raw === undefined) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(guard) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, records: readonly T[]): void {
  try {
    storage()?.setItem(key, JSON.stringify(records));
  } catch {
    // Storage can be unavailable or full. The provider still keeps session state.
  }
}

const isString = (value: unknown): value is string => typeof value === 'string';

function isPracticeRecord(value: unknown): value is PracticeCompletionRecord {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<PracticeCompletionRecord>;
  return (
    isString(item.id) &&
    isString(item.practiceId) &&
    isString(item.leafSkillId) &&
    isString(item.completedAt) &&
    item.provenance === 'local-practice' &&
    typeof item.evaluationResult?.score === 'number' &&
    item.evaluationResult.outcome === 'passed' &&
    isString(item.evidenceOutput?.artifactType) &&
    isString(item.evidenceOutput.response)
  );
}

const milestones: readonly ProjectMilestone[] = [
  'architecture',
  'evaluation',
  'deployment',
];
function isProjectRecord(value: unknown): value is ProjectEvidenceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<ProjectEvidenceRecord>;
  return (
    isString(item.projectId) &&
    isString(item.updatedAt) &&
    Array.isArray(item.completedMilestones) &&
    item.completedMilestones.every(
      (entry: unknown) =>
        isString(entry) && milestones.includes(entry as ProjectMilestone),
    )
  );
}

const categories: readonly FeedbackCategory[] = [
  'product-feedback',
  'content-issue',
  'difficulty',
  'case-difficulty',
  'feature-suggestion',
];
function isFeedbackRecord(value: unknown): value is BetaFeedbackRecord {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<BetaFeedbackRecord>;
  return (
    isString(item.id) &&
    item.category !== undefined &&
    categories.includes(item.category) &&
    isString(item.message) &&
    isString(item.contextPath) &&
    isString(item.createdAt)
  );
}

export const practiceCompletionStore = {
  read: () => readArray(BETA_STORAGE_KEYS.practice, isPracticeRecord),
  write: (records: readonly PracticeCompletionRecord[]) =>
    writeArray(BETA_STORAGE_KEYS.practice, records),
};
export const projectEvidenceStore = {
  read: () => readArray(BETA_STORAGE_KEYS.project, isProjectRecord),
  write: (records: readonly ProjectEvidenceRecord[]) =>
    writeArray(BETA_STORAGE_KEYS.project, records),
};
export const feedbackStore = {
  read: () => readArray(BETA_STORAGE_KEYS.feedback, isFeedbackRecord),
  write: (records: readonly BetaFeedbackRecord[]) =>
    writeArray(BETA_STORAGE_KEYS.feedback, records),
};
