import type { SkillMasteryRecord } from './models';

export interface SkillRepository {
  get(userId: string, skillId: string): Promise<SkillMasteryRecord | undefined>;
  list(userId: string): Promise<SkillMasteryRecord[]>;
  save(mastery: SkillMasteryRecord): Promise<void>;
  saveMany(mastery: readonly SkillMasteryRecord[]): Promise<void>;
}
