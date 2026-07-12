import type {
  CaseNode,
  EvaluationResult,
  FdeCase,
  NodeSubmission,
} from './types';

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

  it('exposes FdeCase and CaseNode as concrete contracts', () => {
    const contractMarker: FdeCase | CaseNode | undefined = undefined;

    expect(contractMarker).toBeUndefined();
  });
});
