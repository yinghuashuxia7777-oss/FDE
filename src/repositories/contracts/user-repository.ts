import type { LocalUser } from './models';

export interface UserRepository {
  getLocal(): Promise<LocalUser | undefined>;
  ensureLocalUser(): Promise<LocalUser>;
}
