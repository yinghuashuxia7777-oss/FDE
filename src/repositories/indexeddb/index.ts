import type { IDBPDatabase } from 'idb';

import type {
  AttemptRepository,
  CaseRepository,
  ContentRepository,
  CoverageRepository,
  MistakeRepository,
  ProgressRepository,
  SettingsRepository,
  SkillRepository,
  UserRepository,
} from '../contracts';
import type { FdeArenaDatabase } from '../../storage/database';
import { IndexedDbAttemptRepository } from './attempt-repository';
import { IndexedDbCaseRepository } from './case-repository';
import { IndexedDbContentRepository } from './content-repository';
import { IndexedDbCoverageRepository } from './coverage-repository';
import { IndexedDbMistakeRepository } from './mistake-repository';
import { IndexedDbProgressRepository } from './progress-repository';
import { IndexedDbSettingsRepository } from './settings-repository';
import { IndexedDbSkillRepository } from './skill-repository';
import { IndexedDbUserRepository } from './user-repository';

export interface IndexedDbRepositories {
  cases: CaseRepository;
  content: ContentRepository;
  attempts: AttemptRepository;
  progress: ProgressRepository;
  skills: SkillRepository;
  settings: SettingsRepository;
  users: UserRepository;
  coverage: CoverageRepository;
  mistakes: MistakeRepository;
}

export function createIndexedDbRepositories(
  database: IDBPDatabase<FdeArenaDatabase>,
): IndexedDbRepositories {
  return {
    cases: new IndexedDbCaseRepository(database),
    content: new IndexedDbContentRepository(database),
    attempts: new IndexedDbAttemptRepository(database),
    progress: new IndexedDbProgressRepository(database),
    skills: new IndexedDbSkillRepository(database),
    settings: new IndexedDbSettingsRepository(database),
    users: new IndexedDbUserRepository(database),
    coverage: new IndexedDbCoverageRepository(database),
    mistakes: new IndexedDbMistakeRepository(database),
  };
}

export { IndexedDbAttemptRepository } from './attempt-repository';
export { IndexedDbCaseRepository } from './case-repository';
export { IndexedDbContentRepository } from './content-repository';
export { IndexedDbCoverageRepository } from './coverage-repository';
export { IndexedDbMistakeRepository } from './mistake-repository';
export { IndexedDbProgressRepository } from './progress-repository';
export { IndexedDbSettingsRepository } from './settings-repository';
export { IndexedDbSkillRepository } from './skill-repository';
export { IndexedDbUserRepository } from './user-repository';
