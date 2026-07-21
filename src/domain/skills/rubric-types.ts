import type { EvidenceOutputType } from './types';

export type SkillRubricStatus = 'draft' | 'reviewed' | 'published';

export interface RubricCriterion {
  criterionId: string;
  description: string;
  evidenceTypes: EvidenceOutputType[];
  weight: number;
  critical: boolean;
}

export interface SkillRubricThresholds {
  learning: number;
  competent: number;
  proficient: number;
}

export interface SkillRubricMetadata {
  createdAt: string;
  reviewedAt: string | null;
  author: string;
  reviewer: string | null;
}

export interface SkillRubricDefinition {
  schemaVersion: 1;
  id: string;
  skillId: string;
  version: number;
  status: SkillRubricStatus;
  title: string;
  evidenceTypes: EvidenceOutputType[];
  criteria: RubricCriterion[];
  thresholds: SkillRubricThresholds;
  metadata: SkillRubricMetadata;
}

/**
 * A sidecar rubric set is versioned independently from Content Pack v1. It
 * binds authored rubrics to one exact draft/reviewed skill catalog version.
 */
export interface SkillRubricCatalog {
  schemaVersion: 1;
  rubricSetVersion: string;
  skillCatalogVersion: string;
  status: SkillRubricStatus;
  rubrics: SkillRubricDefinition[];
}
