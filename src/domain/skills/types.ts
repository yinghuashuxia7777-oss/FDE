export type CapabilityLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const V2_PRESENTATION_TARGET_IDS = [
  'capability.software',
  'capability.integration',
  'capability.data-ai',
  'capability.delivery',
  'capability.operations',
  'capability.security',
  'capability.customer-outcomes',
] as const;

export const REQUIRED_PUBLISHED_LEAF_COUNT = 70 as const;
export const REQUIRED_LEGACY_SKILL_COUNT = 15 as const;
export const REQUIRED_PRESENTATION_TARGET_COUNT =
  V2_PRESENTATION_TARGET_IDS.length;

export type LeafSkillStatus = 'draft' | 'reviewed' | 'active' | 'deprecated';

export type SkillGraphCatalogStatus =
  'draft' | 'reviewed' | 'published' | 'deprecated';

/**
 * Evidence outputs use stable lowercase identifiers so the vocabulary can
 * evolve with later rubric releases without changing the graph contract.
 */
export type EvidenceOutputType = string;

export interface LeafSkillDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  parentSkillId: string;
  capabilityLevel: CapabilityLevel;
  status: LeafSkillStatus;
  evidenceTypes: EvidenceOutputType[];
  activeRubricVersion: number | null;
}

export interface CapabilityPresentationNode {
  id: string;
  name: string;
  description: string;
}

export interface RollsUpToSkillGraphEdge {
  id: string;
  type: 'rolls-up-to';
  leafSkillId: string;
  legacySkillId: string;
  canonical: boolean;
}

export interface PrerequisiteSkillGraphEdge {
  id: string;
  type: 'prerequisite';
  prerequisiteSkillId: string;
  dependentSkillId: string;
}

export interface PresentsAsSkillGraphEdge {
  id: string;
  type: 'presents-as';
  legacySkillId: string;
  presentationSkillId: string;
  canonical: boolean;
}

export type SkillGraphEdge =
  | RollsUpToSkillGraphEdge
  | PrerequisiteSkillGraphEdge
  | PresentsAsSkillGraphEdge;

export interface SkillGraphCatalog {
  schemaVersion: 1;
  catalogVersion: string;
  status: SkillGraphCatalogStatus;
  expectedLeafCount: number;
  presentationNodes: CapabilityPresentationNode[];
  leaves: LeafSkillDefinition[];
  edges: SkillGraphEdge[];
}

export interface PublishedRubricRef {
  skillId: string;
  version: number;
}
