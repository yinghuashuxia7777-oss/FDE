import { z } from 'zod';

import { NodeSubmissionSchema } from './case.schema';
import { normalizeRfc3339Timestamp } from '../storage/timestamps';

const StorageTimestampSchema = z.string().transform((value, context) => {
  try {
    return normalizeRfc3339Timestamp(value, 'portable data timestamp');
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid timestamp.',
    });
    return z.NEVER;
  }
});

const SemanticVersionSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
    'Expected a semantic version.',
  );

export function createExportEnvelopeSchema<PayloadSchema extends z.ZodType>(
  payloadSchema: PayloadSchema,
) {
  return z
    .object({
      formatVersion: z.literal(1),
      appVersion: SemanticVersionSchema,
      exportedAt: StorageTimestampSchema,
      payload: payloadSchema,
    })
    .strict();
}

export const EmptyExportPayloadSchema = z.object({}).strict();

export const EmptyExportEnvelopeSchema = createExportEnvelopeSchema(
  EmptyExportPayloadSchema,
);

export interface ExportEnvelope<Payload> {
  formatVersion: 1;
  appVersion: string;
  exportedAt: string;
  payload: Payload;
}

const NonEmptyStringSchema = z.string().min(1);
const IsoTimestampSchema = StorageTimestampSchema;
const ConsequenceDeltaSchema = z
  .object({
    timeDelta: z.number().optional(),
    costDelta: z.number().optional(),
    trustDelta: z.number().optional(),
    riskDelta: z.number().optional(),
    message: NonEmptyStringSchema.optional(),
  })
  .strict();
const EvaluationResultSchema = z
  .object({
    isCorrect: z.boolean(),
    scoreRatio: z.number().min(0).max(1),
    errorTypes: z.array(NonEmptyStringSchema),
    criticalErrorIds: z.array(NonEmptyStringSchema),
    consequences: z.array(ConsequenceDeltaSchema),
    branchKey: NonEmptyStringSchema,
  })
  .strict();
const AttemptRoundSchema = z
  .object({
    nodeId: NonEmptyStringSchema,
    attemptNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    submission: NodeSubmissionSchema,
    evaluation: EvaluationResultSchema,
    submittedAt: IsoTimestampSchema,
    revealed: z.boolean(),
  })
  .strict();
const AttemptBaseShape = {
  id: NonEmptyStringSchema,
  userId: z.literal('local-user'),
  caseId: NonEmptyStringSchema,
  caseVersion: z.number().int().positive(),
  startedAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  criticalErrorIds: z.array(NonEmptyStringSchema),
  visitedNodeIds: z.array(NonEmptyStringSchema).min(1),
  roundHistory: z.array(AttemptRoundSchema),
  consequences: z.array(ConsequenceDeltaSchema).optional(),
};
const AttemptRecordSchema = z.discriminatedUnion('status', [
  z
    .object({
      ...AttemptBaseShape,
      status: z.literal('in-progress'),
      currentNodeId: NonEmptyStringSchema,
    })
    .strict(),
  z
    .object({
      ...AttemptBaseShape,
      status: z.literal('completed'),
      currentNodeId: z.null(),
      completedAt: IsoTimestampSchema,
      score: z.number().min(0).max(100),
      verdict: z.enum([
        'excellent',
        'pass',
        'marginal',
        'fail',
        'critical-risk',
      ]),
    })
    .strict(),
  z
    .object({
      ...AttemptBaseShape,
      status: z.literal('abandoned'),
      currentNodeId: NonEmptyStringSchema.nullable(),
    })
    .strict(),
]);
const ProgressRecordSchema = z
  .object({
    userId: z.literal('local-user'),
    caseId: NonEmptyStringSchema,
    caseVersion: z.number().int().positive(),
    latestAttemptId: NonEmptyStringSchema,
    attemptCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    highestScore: z.number().min(0).max(100),
    latestScore: z.number().min(0).max(100),
    latestVerdict: z.enum([
      'excellent',
      'pass',
      'marginal',
      'fail',
      'critical-risk',
    ]),
    hasCriticalError: z.boolean(),
    updatedAt: IsoTimestampSchema,
  })
  .strict()
  .refine((record) => record.completedCount <= record.attemptCount, {
    message: 'Completed count cannot exceed attempt count.',
  });
const MasteryRecordSchema = z
  .object({
    userId: z.literal('local-user'),
    skillId: NonEmptyStringSchema,
    score: z.number().min(0).max(100),
    sampleCount: z.number().int().nonnegative(),
    updatedAt: IsoTimestampSchema,
  })
  .strict();
const MistakeRecordSchema = z
  .object({
    id: NonEmptyStringSchema,
    userId: z.literal('local-user'),
    attemptId: NonEmptyStringSchema,
    caseId: NonEmptyStringSchema,
    caseVersion: z.number().int().positive(),
    nodeId: NonEmptyStringSchema,
    submission: NodeSubmissionSchema,
    correctSubmission: NodeSubmissionSchema,
    errorTypes: z.array(NonEmptyStringSchema).min(1),
    evidenceIds: z.array(NonEmptyStringSchema),
    skillIds: z.array(NonEmptyStringSchema).min(1),
    critical: z.boolean(),
    createdAt: IsoTimestampSchema,
    redoScores: z.array(z.number().min(0).max(100)),
  })
  .strict();
const SettingsSchema = z
  .object({
    userId: z.literal('local-user'),
    theme: z.enum(['light', 'dark', 'system']),
    updatedAt: IsoTimestampSchema,
  })
  .strict();

function addUniqueIssues(
  values: readonly string[],
  path: string,
  context: z.RefinementCtx,
) {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: 'custom',
      message: `${path} must be unique.`,
      path: [path],
    });
  }
}

export const LocalDataBundleSchema = z
  .object({
    userId: z.literal('local-user'),
    attempts: z.array(AttemptRecordSchema),
    progress: z.array(ProgressRecordSchema),
    mastery: z.array(MasteryRecordSchema),
    mistakes: z.array(MistakeRecordSchema),
    settings: SettingsSchema.nullable(),
  })
  .strict()
  .superRefine((bundle, context) => {
    addUniqueIssues(
      bundle.attempts.map(({ id }) => id),
      'attempts',
      context,
    );
    addUniqueIssues(
      bundle.progress.map(({ caseId }) => caseId),
      'progress',
      context,
    );
    addUniqueIssues(
      bundle.mastery.map(({ skillId }) => skillId),
      'mastery',
      context,
    );
    addUniqueIssues(
      bundle.mistakes.map(({ id }) => id),
      'mistakes',
      context,
    );
    const attempts = new Map(
      bundle.attempts.map((attempt) => [attempt.id, attempt]),
    );
    const completedCaseIds = new Set(
      bundle.attempts
        .filter(({ status }) => status === 'completed')
        .map(({ caseId }) => caseId),
    );
    const progressCaseIds = new Set(
      bundle.progress.map(({ caseId }) => caseId),
    );
    completedCaseIds.forEach((caseId) => {
      if (!progressCaseIds.has(caseId)) {
        context.addIssue({
          code: 'custom',
          message:
            'Every case with completed attempts requires one progress aggregate.',
          path: ['progress'],
        });
      }
    });
    bundle.progress.forEach((progress, index) => {
      const attempt = attempts.get(progress.latestAttemptId);
      if (
        attempt?.caseId !== progress.caseId ||
        attempt.caseVersion !== progress.caseVersion ||
        attempt.status !== 'completed'
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Progress must reference its latest completed attempt and case version.',
          path: ['progress', index, 'latestAttemptId'],
        });
      }
      if (attempt?.status === 'completed') {
        const completedScores = bundle.attempts.flatMap((candidate) =>
          candidate.caseId === progress.caseId &&
          candidate.status === 'completed'
            ? [candidate.score]
            : [],
        );
        const highestScore = Math.max(0, ...completedScores);
        if (
          progress.attemptCount !== completedScores.length ||
          progress.completedCount !== completedScores.length ||
          progress.highestScore !== highestScore ||
          progress.latestScore !== attempt.score ||
          progress.latestVerdict !== attempt.verdict ||
          progress.hasCriticalError !==
            bundle.attempts.some(
              (candidate) =>
                candidate.caseId === progress.caseId &&
                candidate.status === 'completed' &&
                candidate.criticalErrorIds.length > 0,
            ) ||
          progress.updatedAt !== attempt.completedAt
        ) {
          context.addIssue({
            code: 'custom',
            message:
              'Progress aggregates must match completed attempt history.',
            path: ['progress', index],
          });
        }
      }
    });
    bundle.mistakes.forEach((mistake, index) => {
      const attempt = attempts.get(mistake.attemptId);
      if (
        attempt?.caseId !== mistake.caseId ||
        attempt.caseVersion !== mistake.caseVersion ||
        !attempt.roundHistory.some(({ nodeId }) => nodeId === mistake.nodeId)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Mistake must reference an attempt round with the same case version.',
          path: ['mistakes', index, 'attemptId'],
        });
      }
    });
  });

export const LocalDataExportEnvelopeSchema = createExportEnvelopeSchema(
  LocalDataBundleSchema,
);

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
