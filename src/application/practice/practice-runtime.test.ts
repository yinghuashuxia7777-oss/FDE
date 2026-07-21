import { evaluatePracticeResponse } from './practice-runtime';

const rule = {
  practiceId: 'practice.rag.retrieval',
  minimumLength: 40,
  requiredKeywords: ['evidence', 'threshold'],
  passingKeywordCount: 2,
};

describe('Practice Runtime MVP', () => {
  it('passes a substantive response that satisfies the authored local rule', () => {
    expect(
      evaluatePracticeResponse(
        'Use retrieval evidence to set a threshold, then verify recall on the holdout queries.',
        rule,
      ),
    ).toMatchObject({ outcome: 'passed', score: 100 });
  });

  it('returns actionable feedback without calling an external model', () => {
    expect(evaluatePracticeResponse('Looks fine.', rule)).toMatchObject({
      outcome: 'needs-revision',
      score: 0,
      missingKeywords: ['evidence', 'threshold'],
    });
  });
});
