export type GrowthGoal =
  'become-ai-engineer' | 'improve-ai-engineering-skills' | 'prepare-fde-career';
export type ExperienceLevel = 'beginner' | 'developer' | 'experienced';

export interface LearnerPreferenceRecord {
  schemaVersion: 1;
  goal: GrowthGoal;
  experienceLevel: ExperienceLevel;
  updatedAt: string;
}

export const LEARNER_PREFERENCE_STORAGE_KEY =
  'fde-arena:growth-loop:learner-preference:v1';

const goals: readonly GrowthGoal[] = [
  'become-ai-engineer',
  'improve-ai-engineering-skills',
  'prepare-fde-career',
];
const levels: readonly ExperienceLevel[] = [
  'beginner',
  'developer',
  'experienced',
];

function isRecord(value: unknown): value is LearnerPreferenceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<LearnerPreferenceRecord>;
  return (
    item.schemaVersion === 1 &&
    item.goal !== undefined &&
    goals.includes(item.goal) &&
    item.experienceLevel !== undefined &&
    levels.includes(item.experienceLevel) &&
    typeof item.updatedAt === 'string'
  );
}

export const learnerPreferenceStore = {
  read(): LearnerPreferenceRecord | undefined {
    try {
      const raw = window.localStorage.getItem(LEARNER_PREFERENCE_STORAGE_KEY);
      if (raw === null) return undefined;
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  },
  write(input: Pick<LearnerPreferenceRecord, 'goal' | 'experienceLevel'>) {
    const record: LearnerPreferenceRecord = {
      schemaVersion: 1,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(
        LEARNER_PREFERENCE_STORAGE_KEY,
        JSON.stringify(record),
      );
    } catch {
      // The provider retains session state when storage is unavailable.
    }
    return record;
  },
};
