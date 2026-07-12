import type { AttemptQuery, AttemptRecord } from './models';

export interface AttemptRepository {
  get(id: string): Promise<AttemptRecord | undefined>;
  list(query?: AttemptQuery): Promise<AttemptRecord[]>;
  save(attempt: AttemptRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
