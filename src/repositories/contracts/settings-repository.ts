import type { UserSettings } from './models';

export interface SettingsRepository {
  get(userId: string): Promise<UserSettings | undefined>;
  save(settings: UserSettings): Promise<void>;
}
