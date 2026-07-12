import type { FdeCase } from '../domain/cases/types';

export interface CaseIndexEntry {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly level: FdeCase['level'];
  readonly estimatedMinutes: number;
  readonly domains: readonly string[];
  readonly skills: readonly string[];
  readonly status: 'published';
  readonly version: number;
  readonly load: () => Promise<{ default: FdeCase }>;
}

export const caseIndex: readonly CaseIndexEntry[] = [];
