import { z } from 'zod';

import type {
  PracticeAction,
  PracticeDeterministicAnswerContract,
  PracticeDefinition,
  PracticeEvaluation,
  PracticeEvidenceOutputContract,
  PracticeFeedback,
  PracticeResponseContract,
  PracticeStimulus,
} from '../domain/practices/types';
import { SkillGraphIdentifierSchema } from './skill-graph-schema';

const MAX_AUTHORED_TEXT_LENGTH = 10_000;
const MAX_STIMULI = 20;
const MAX_REQUIRED_FIELDS = 100;

const AuthoredTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_AUTHORED_TEXT_LENGTH);

const ResponseFieldNameSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    'Expected a JSON-compatible response field name.',
  );

function uniqueIdentifiers(label: string, maximum = MAX_REQUIRED_FIELDS) {
  return z
    .array(SkillGraphIdentifierSchema)
    .min(1)
    .max(maximum)
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

function uniqueResponseFields(label: string) {
  return z
    .array(ResponseFieldNameSchema)
    .min(1)
    .max(MAX_REQUIRED_FIELDS)
    .superRefine((fields, refinement) => {
      const seen = new Set<string>();
      fields.forEach((field, index) => {
        if (seen.has(field)) {
          refinement.addIssue({
            code: 'custom',
            path: [index],
            message: `Duplicate ${label}: ${field}.`,
          });
        }
        seen.add(field);
      });
    });
}

export const PracticeStimulusSchema: z.ZodType<PracticeStimulus> = z
  .object({
    id: SkillGraphIdentifierSchema,
    type: SkillGraphIdentifierSchema,
    content: AuthoredTextSchema,
  })
  .strict();

export const PracticeResponseContractSchema: z.ZodType<PracticeResponseContract> =
  z
    .object({
      type: z.enum([
        'single-choice',
        'multiple-choice',
        'text',
        'json',
        'configuration',
      ]),
      requiredFields: uniqueResponseFields('response field'),
    })
    .strict();

export const PracticeActionSchema: z.ZodType<PracticeAction> = z
  .object({
    id: SkillGraphIdentifierSchema,
    kind: z.enum([
      'decision',
      'diagnose',
      'construct',
      'evaluate',
      'configure',
    ]),
    prompt: AuthoredTextSchema,
    stimulus: z.array(PracticeStimulusSchema).min(1).max(MAX_STIMULI),
    responseContract: PracticeResponseContractSchema,
    scored: z.literal(true),
  })
  .strict();

const PracticeExpectedValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.array(z.string()).min(1).max(MAX_REQUIRED_FIELDS),
]);

export const PracticeDeterministicAnswerContractSchema: z.ZodType<PracticeDeterministicAnswerContract> =
  z
    .object({
      expectedFields: z
        .record(ResponseFieldNameSchema, PracticeExpectedValueSchema)
        .refine((fields) => Object.keys(fields).length > 0, {
          message: 'Deterministic evaluation requires expected fields.',
        }),
      scoring: z
        .object({
          mode: z.enum(['exact-match', 'required-field-match']),
          passingScore: z.number().int().min(1).max(100),
        })
        .strict(),
    })
    .strict();

const SharedPracticeEvaluationShape = {
  rubricRef: z
    .object({
      rubricId: SkillGraphIdentifierSchema,
      skillId: SkillGraphIdentifierSchema,
      version: z.number().int().positive(),
    })
    .strict(),
  criterionIds: uniqueIdentifiers('criterion ID'),
};

export const PracticeEvaluationSchema: z.ZodType<PracticeEvaluation> =
  z.discriminatedUnion('method', [
    z
      .object({
        ...SharedPracticeEvaluationShape,
        method: z.literal('deterministic'),
        answerContract: PracticeDeterministicAnswerContractSchema,
      })
      .strict(),
    z
      .object({
        ...SharedPracticeEvaluationShape,
        method: z.literal('reviewed'),
        answerContract: PracticeDeterministicAnswerContractSchema.optional(),
      })
      .strict(),
  ]);

export const PracticeEvidenceOutputContractSchema: z.ZodType<PracticeEvidenceOutputContract> =
  z
    .object({
      artifactType: SkillGraphIdentifierSchema,
      requiredFields: uniqueResponseFields('evidence output field'),
      eligibilityRule: AuthoredTextSchema,
      sourceReferencePolicy: z.enum(['required', 'optional', 'forbidden']),
      criticalFailurePolicy: AuthoredTextSchema,
    })
    .strict();

export const PracticeFeedbackSchema: z.ZodType<PracticeFeedback> = z
  .object({
    correct: AuthoredTextSchema,
    partial: AuthoredTextSchema,
    incorrect: AuthoredTextSchema,
    criticalFailure: AuthoredTextSchema,
  })
  .strict();

export const PracticeDefinitionSchema: z.ZodType<PracticeDefinition> = z
  .object({
    schemaVersion: z.literal(1),
    skillCatalogVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    rubricSetVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    id: SkillGraphIdentifierSchema,
    version: z.number().int().positive(),
    status: z.enum(['planned', 'draft', 'reviewed', 'published', 'deprecated']),
    title: AuthoredTextSchema,
    summary: AuthoredTextSchema,
    primaryConceptId: SkillGraphIdentifierSchema,
    foundationIds: uniqueIdentifiers('Foundation ID', 3).max(3),
    primaryLeafSkillId: SkillGraphIdentifierSchema,
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedMinutes: z.number().int().min(3).max(8),
    action: PracticeActionSchema,
    evaluation: PracticeEvaluationSchema,
    evidenceOutputContract: PracticeEvidenceOutputContractSchema,
    feedback: PracticeFeedbackSchema,
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
  .superRefine((practice, refinement) => {
    const hasReview =
      practice.metadata.reviewedAt !== null &&
      practice.metadata.reviewer !== null;
    const hasNoReview =
      practice.metadata.reviewedAt === null &&
      practice.metadata.reviewer === null;
    const requiresReview = ['reviewed', 'published', 'deprecated'].includes(
      practice.status,
    );
    if (requiresReview ? !hasReview : !hasNoReview) {
      refinement.addIssue({
        code: 'custom',
        path: ['metadata'],
        message:
          'Planned and draft practices must be unreviewed; later lifecycle states require reviewer metadata.',
      });
    }
  });
