import type { MistakeQuery, MistakeRecord } from './models';

export interface MistakeRepository {
  get(id: string): Promise<MistakeRecord | undefined>;
  list(query?: MistakeQuery): Promise<MistakeRecord[]>;
  save(mistake: MistakeRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
