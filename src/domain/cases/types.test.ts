import type { z } from 'zod';

import type { FdeCaseSchema } from '../../schemas/case.schema';
import type { EvaluationResult, FdeCase, NodeSubmission } from './types';

type Equal<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false;

type Expect<Value extends true> = Value;
type SchemaFdeCase = z.infer<typeof FdeCaseSchema>;
type ReviewedCase = Extract<FdeCase, { status: 'reviewed' | 'published' }>;
type ReviewedBranchExists = [ReviewedCase] extends [never] ? false : true;
type ReviewedMetadataIsRequired = ReviewedCase['metadata'] extends {
  reviewer: string;
  reviewedAt: string;
}
  ? true
  : false;

const schemaEqualContract: Expect<Equal<SchemaFdeCase, FdeCase>> = true;
const schemaToDomainContract: Expect<
  [SchemaFdeCase] extends [FdeCase] ? true : false
> = true;
const domainToSchemaContract: Expect<
  [FdeCase] extends [SchemaFdeCase] ? true : false
> = true;
const reviewedBranchContract: Expect<Equal<ReviewedBranchExists, true>> = true;
const reviewedMetadataContract: Expect<
  Equal<ReviewedMetadataIsRequired, true>
> = true;

const submissions = [
  { type: 'choice', selectedOptionIds: ['option-a'] },
  { type: 'ordering', orderedOptionIds: ['option-a', 'option-b'] },
  { type: 'matching', pairs: { 'option-a': 'option-b' } },
  {
    type: 'evidence-conclusion',
    conclusionId: 'option-a',
    evidenceIds: ['evidence-1'],
  },
] satisfies NodeSubmission[];

const result = {
  isCorrect: false,
  scoreRatio: 0.5,
  errorTypes: ['unsupported-action'],
  criticalErrorIds: ['option-b'],
  consequences: [{ timeDelta: 5, riskDelta: 1 }],
  branchKey: 'retry',
} satisfies EvaluationResult;

describe('domain case contracts', () => {
  it('keeps all submission discriminators available', () => {
    expect(submissions.map(({ type }) => type)).toEqual([
      'choice',
      'ordering',
      'matching',
      'evidence-conclusion',
    ]);
  });

  it('keeps the evaluator result fields stable', () => {
    expect(result.branchKey).toBe('retry');
  });

  it('keeps runtime and public case contracts exactly aligned', () => {
    expect([
      schemaEqualContract,
      schemaToDomainContract,
      domainToSchemaContract,
      reviewedBranchContract,
      reviewedMetadataContract,
    ]).toEqual([true, true, true, true, true]);
  });
});
