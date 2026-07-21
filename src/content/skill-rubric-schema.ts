import { z } from 'zod';

import type {
  RubricCriterion,
  SkillRubricCatalog,
  SkillRubricDefinition,
} from '../domain/skills/rubric-types';
import { SkillGraphIdentifierSchema } from './skill-graph-schema';

const MAX_AUTHORED_TEXT_LENGTH = 10_000;
const MAX_RUBRICS = 1_000;
const MAX_CRITERIA = 100;
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+$/;

export const INVALID_THRESHOLD_ORDER_MESSAGE =
  'Rubric thresholds must satisfy learning < competent < proficient.';

const AuthoredTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_AUTHORED_TEXT_LENGTH);

function uniqueIds(label: string, min = 1) {
  return z
    .array(SkillGraphIdentifierSchema)
    .min(min)
    .max(MAX_CRITERIA)
    .superRefine((ids, refinement) => {
      const seen = new Set<string>();
      ids.forEach((id, index) => {
        if (seen.has(id)) {
          refinement.addIssue({
            code: 'custom',
            path: [index],
            message: `Duplicate ${label}: ${id}.`,
          });
        }
        seen.add(id);
      });
    });
}

export const RubricCriterionSchema: z.ZodType<RubricCriterion> = z
  .object({
    criterionId: SkillGraphIdentifierSchema,
    description: AuthoredTextSchema,
    evidenceTypes: uniqueIds('criterion evidence type'),
    weight: z.number().finite().positive().max(1),
    critical: z.boolean(),
  })
  .strict();

export const SkillRubricThresholdsSchema = z
  .object({
    learning: z.number().finite().min(0).max(100),
    competent: z.number().finite().min(0).max(100),
    proficient: z.number().finite().min(0).max(100),
  })
  .strict()
  .superRefine((thresholds, refinement) => {
    if (!(
      thresholds.learning < thresholds.competent &&
      thresholds.competent < thresholds.proficient
    )) {
      refinement.addIssue({
        code: 'custom',
        path: ['proficient'],
        message: INVALID_THRESHOLD_ORDER_MESSAGE,
      });
    }
  });

export const SkillRubricDefinitionSchema: z.ZodType<SkillRubricDefinition> = z
  .object({
    schemaVersion: z.literal(1),
    id: SkillGraphIdentifierSchema,
    skillId: SkillGraphIdentifierSchema,
    version: z.number().int().positive(),
    status: z.enum(['draft', 'reviewed', 'published']),
    title: AuthoredTextSchema,
    evidenceTypes: uniqueIds('rubric evidence type'),
    criteria: z.array(RubricCriterionSchema).min(1).max(MAX_CRITERIA),
    thresholds: SkillRubricThresholdsSchema,
    metadata: z
      .object({
        createdAt: z.iso.datetime(),
        reviewedAt: z.iso.datetime().nullable(),
        author: AuthoredTextSchema,
        reviewer: AuthoredTextSchema.nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((rubric, refinement) => {
    const criterionIds = new Set<string>();
    const rubricEvidenceTypes = new Set(rubric.evidenceTypes);
    let totalWeight = 0;

    rubric.criteria.forEach((criterion, index) => {
      if (criterionIds.has(criterion.criterionId)) {
        refinement.addIssue({
          code: 'custom',
          path: ['criteria', index, 'criterionId'],
          message: `Duplicate criterion ID: ${criterion.criterionId}.`,
        });
      }
      criterionIds.add(criterion.criterionId);
      totalWeight += criterion.weight;

      criterion.evidenceTypes.forEach((evidenceType, evidenceIndex) => {
        if (!rubricEvidenceTypes.has(evidenceType)) {
          refinement.addIssue({
            code: 'custom',
            path: ['criteria', index, 'evidenceTypes', evidenceIndex],
            message: `Criterion evidence type ${evidenceType} is not declared by the rubric.`,
          });
        }
      });
    });

    if (Math.abs(totalWeight - 1) > 1e-9) {
      refinement.addIssue({
        code: 'custom',
        path: ['criteria'],
        message: 'Rubric criterion weights must total one.',
      });
    }

    const hasReview =
      rubric.metadata.reviewedAt !== null && rubric.metadata.reviewer !== null;
    const hasNoReview =
      rubric.metadata.reviewedAt === null && rubric.metadata.reviewer === null;
    if (rubric.status === 'draft' ? !hasNoReview : !hasReview) {
      refinement.addIssue({
        code: 'custom',
        path: ['metadata'],
        message:
          'Draft rubrics must be unreviewed; reviewed and published rubrics require reviewer metadata.',
      });
    }
  });

export const SkillRubricCatalogSchema: z.ZodType<SkillRubricCatalog> = z
  .object({
    schemaVersion: z.literal(1),
    rubricSetVersion: z
      .string()
      .regex(SEMANTIC_VERSION, 'Expected a semantic rubric set version.'),
    skillCatalogVersion: z
      .string()
      .regex(SEMANTIC_VERSION, 'Expected a semantic skill catalog version.'),
    status: z.enum(['draft', 'reviewed', 'published']),
    rubrics: z.array(SkillRubricDefinitionSchema).max(MAX_RUBRICS),
  })
  .strict();
