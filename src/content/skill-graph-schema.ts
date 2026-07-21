import { z } from 'zod';

import type {
  CapabilityPresentationNode,
  LeafSkillDefinition,
  PresentsAsSkillGraphEdge,
  PrerequisiteSkillGraphEdge,
  RollsUpToSkillGraphEdge,
  SkillGraphCatalog,
  SkillGraphEdge,
} from '../domain/skills/types';

const MAX_IDENTIFIER_LENGTH = 160;
const MAX_AUTHORED_TEXT_LENGTH = 10_000;
const MAX_CATALOG_ITEMS = 1_000;
const LOWERCASE_DOT_DASH_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+$/;

export const STABLE_SKILL_GRAPH_ID_MESSAGE =
  'Expected a lowercase identifier containing only dots and dashes.';

export const SkillGraphIdentifierSchema = z
  .string()
  .min(1)
  .max(MAX_IDENTIFIER_LENGTH)
  .regex(LOWERCASE_DOT_DASH_ID, STABLE_SKILL_GRAPH_ID_MESSAGE);

function authoredText() {
  return z.string().trim().min(1).max(MAX_AUTHORED_TEXT_LENGTH);
}

function uniqueEvidenceTypes() {
  return z
    .array(SkillGraphIdentifierSchema)
    .min(1)
    .max(MAX_CATALOG_ITEMS)
    .superRefine((evidenceTypes, refinement) => {
      const seen = new Set<string>();
      evidenceTypes.forEach((evidenceType, index) => {
        if (seen.has(evidenceType)) {
          refinement.addIssue({
            code: 'custom',
            path: [index],
            message: `Duplicate evidence type: ${evidenceType}.`,
          });
        }
        seen.add(evidenceType);
      });
    });
}

export const LeafSkillDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: SkillGraphIdentifierSchema,
    name: authoredText(),
    description: authoredText(),
    parentSkillId: SkillGraphIdentifierSchema,
    capabilityLevel: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    status: z.enum(['draft', 'reviewed', 'active', 'deprecated']),
    evidenceTypes: uniqueEvidenceTypes(),
    activeRubricVersion: z.number().int().positive().nullable(),
  })
  .strict() satisfies z.ZodType<LeafSkillDefinition>;

export const CapabilityPresentationNodeSchema = z
  .object({
    id: SkillGraphIdentifierSchema,
    name: authoredText(),
    description: authoredText(),
  })
  .strict() satisfies z.ZodType<CapabilityPresentationNode>;

export const RollsUpToSkillGraphEdgeSchema = z
  .object({
    id: SkillGraphIdentifierSchema,
    type: z.literal('rolls-up-to'),
    leafSkillId: SkillGraphIdentifierSchema,
    legacySkillId: SkillGraphIdentifierSchema,
    canonical: z.boolean(),
  })
  .strict() satisfies z.ZodType<RollsUpToSkillGraphEdge>;

export const PrerequisiteSkillGraphEdgeSchema = z
  .object({
    id: SkillGraphIdentifierSchema,
    type: z.literal('prerequisite'),
    prerequisiteSkillId: SkillGraphIdentifierSchema,
    dependentSkillId: SkillGraphIdentifierSchema,
  })
  .strict() satisfies z.ZodType<PrerequisiteSkillGraphEdge>;

export const PresentsAsSkillGraphEdgeSchema = z
  .object({
    id: SkillGraphIdentifierSchema,
    type: z.literal('presents-as'),
    legacySkillId: SkillGraphIdentifierSchema,
    presentationSkillId: SkillGraphIdentifierSchema,
    canonical: z.boolean(),
  })
  .strict() satisfies z.ZodType<PresentsAsSkillGraphEdge>;

export const SkillGraphEdgeSchema = z.discriminatedUnion('type', [
  RollsUpToSkillGraphEdgeSchema,
  PrerequisiteSkillGraphEdgeSchema,
  PresentsAsSkillGraphEdgeSchema,
]) satisfies z.ZodType<SkillGraphEdge>;

export const SkillGraphCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogVersion: z
      .string()
      .regex(SEMANTIC_VERSION, 'Expected a semantic catalog version.'),
    status: z.enum(['draft', 'reviewed', 'published', 'deprecated']),
    expectedLeafCount: z.number().int().positive(),
    presentationNodes: z
      .array(CapabilityPresentationNodeSchema)
      .max(MAX_CATALOG_ITEMS),
    leaves: z.array(LeafSkillDefinitionSchema).max(MAX_CATALOG_ITEMS),
    edges: z.array(SkillGraphEdgeSchema).max(MAX_CATALOG_ITEMS),
  })
  .strict() satisfies z.ZodType<SkillGraphCatalog>;
