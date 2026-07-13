import { createMinimalValidCase } from '../../tests/fixtures/cases';
import type { CompletedAttemptRecord } from '../../repositories/contracts';
import {
  buildRecommendedPath,
  calculateCapabilityDimensions,
  calculateLevelPassRates,
  correctSubmissionForNode,
  describeSubmission,
  groupAttemptVisits,
  scoreVisit,
  submissionOptionExplanations,
  visitGroupingWarning,
} from './analysis';
import type { CaseNode, ChoiceNodeType } from '../../domain/cases/types';

function completedAttempt(
  id = 'attempt-one',
  visitedNodeIds = ['node-1'],
): CompletedAttemptRecord {
  return {
    id,
    userId: 'local-user',
    caseId: 'case-minimal',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 90,
    verdict: 'excellent',
    criticalErrorIds: [],
    visitedNodeIds,
    roundHistory: visitedNodeIds.map((nodeId, index) => ({
      nodeId,
      attemptNumber: 1,
      submission: { type: 'choice', selectedOptionIds: ['option-a'] },
      evaluation: {
        isCorrect: true,
        scoreRatio: 1,
        errorTypes: [],
        criticalErrorIds: [],
        consequences: [],
        branchKey: 'correct',
      },
      submittedAt: `2026-07-13T00:0${String(index + 1)}:00.000Z`,
      revealed: false,
    })),
  };
}

describe('product history analysis', () => {
  it('preserves repeated-node visits as separate ordinals', () => {
    expect(
      groupAttemptVisits(completedAttempt('cycle', ['node-1', 'node-1'])).map(
        ({ ordinal, nodeId, rounds }) => [ordinal, nodeId, rounds.length],
      ),
    ).toEqual([
      [1, 'node-1', 1],
      [2, 'node-1', 1],
    ]);
  });

  it('reports unconsumed or unresolved visit history', () => {
    const incomplete = completedAttempt();
    incomplete.roundHistory = [];
    const visits = groupAttemptVisits(incomplete);
    expect(visitGroupingWarning(incomplete, visits)).toMatch(
      /no resolved round/i,
    );
  });

  it('derives the recommended path by evaluating trusted correct submissions', () => {
    const content = createMinimalValidCase();
    expect(buildRecommendedPath(content)).toEqual({
      nodeIds: ['node-1'],
      stopped: 'terminal',
    });
  });

  it('guards a correct-path cycle instead of looping forever', () => {
    const content = createMinimalValidCase();
    content.nodes[0]!.branches[0]!.nextNodeId = 'node-1';
    expect(buildRecommendedPath(content, 4)).toEqual({
      nodeIds: ['node-1'],
      stopped: 'cycle',
    });
  });

  it('contains an invalid recommended branch as a local path result', () => {
    const content = createMinimalValidCase();
    content.nodes[0]!.branches = [];
    expect(buildRecommendedPath(content)).toEqual({
      nodeIds: ['node-1'],
      stopped: 'invalid-branch',
    });
  });

  it.each([
    'single-choice',
    'true-false',
    'log-analysis',
    'command-choice',
    'diff-review',
    'configuration-review',
    'architecture-tradeoff',
    'customer-response',
  ] satisfies ChoiceNodeType[])(
    'builds the shared correct submission for %s',
    (type) => {
      const node = { ...createMinimalValidCase().nodes[0]!, type } as CaseNode;
      expect(correctSubmissionForNode(node)).toEqual({
        type: 'choice',
        selectedOptionIds: ['option-a'],
      });
    },
  );

  it('builds correct submissions for the four structured answer families', () => {
    const base = createMinimalValidCase().nodes[0]!;
    const nodes = [
      {
        ...base,
        type: 'multiple-choice',
        answer: { correctOptionIds: ['option-a', 'option-b'] },
      },
      {
        ...base,
        type: 'ordering',
        answer: { orderedOptionIds: ['option-b', 'option-a'] },
      },
      {
        ...base,
        type: 'matching',
        answer: { pairs: { 'option-a': 'option-b' } },
      },
      {
        ...base,
        type: 'evidence-conclusion',
        answer: { conclusionId: 'option-a', evidenceIds: ['evidence-1'] },
      },
    ] as CaseNode[];

    expect(nodes.map(correctSubmissionForNode)).toEqual([
      { type: 'choice', selectedOptionIds: ['option-a', 'option-b'] },
      { type: 'ordering', orderedOptionIds: ['option-b', 'option-a'] },
      { type: 'matching', pairs: { 'option-a': 'option-b' } },
      {
        type: 'evidence-conclusion',
        conclusionId: 'option-a',
        evidenceIds: ['evidence-1'],
      },
    ]);
  });

  it('renders every submission shape with raw fallbacks for unknown labels', () => {
    expect(
      [
        { type: 'choice' as const, selectedOptionIds: ['unknown-choice'] },
        { type: 'ordering' as const, orderedOptionIds: ['unknown-order'] },
        { type: 'matching' as const, pairs: { left: 'right' } },
        {
          type: 'evidence-conclusion' as const,
          conclusionId: 'unknown-conclusion',
          evidenceIds: ['unknown-evidence'],
        },
      ].map((submission) => describeSubmission(submission)),
    ).toEqual([
      'unknown-choice',
      'unknown-order',
      'left → right',
      'unknown-conclusion; evidence: unknown-evidence',
    ]);
  });

  it('renders known labels for every structured submission shape', () => {
    const node = createMinimalValidCase().nodes[0]!;
    expect([
      describeSubmission(
        { type: 'choice', selectedOptionIds: ['option-a'] },
        node,
      ),
      describeSubmission(
        { type: 'ordering', orderedOptionIds: ['option-b', 'option-a'] },
        node,
      ),
      describeSubmission(
        { type: 'matching', pairs: { 'option-a': 'option-b' } },
        node,
      ),
      describeSubmission(
        {
          type: 'evidence-conclusion',
          conclusionId: 'option-a',
          evidenceIds: ['evidence-1'],
        },
        node,
      ),
    ]).toEqual([
      'Inspect the failing dependency',
      'Change unrelated configuration → Inspect the failing dependency',
      'Inspect the failing dependency → Change unrelated configuration',
      'Inspect the failing dependency; evidence: Health check',
    ]);
  });

  it('marks unknown IDs explicitly when an exact node is available', () => {
    const node = createMinimalValidCase().nodes[0]!;
    expect(
      describeSubmission(
        { type: 'choice', selectedOptionIds: ['missing-option'] },
        node,
      ),
    ).toBe('Unknown option (missing-option)');
    expect(
      describeSubmission(
        {
          type: 'evidence-conclusion',
          conclusionId: 'missing-option',
          evidenceIds: ['missing-evidence'],
        },
        node,
      ),
    ).toBe(
      'Unknown option (missing-option); evidence: Unknown evidence (missing-evidence)',
    );
  });

  it('distinguishes untitled authored evidence from an unknown evidence ID', () => {
    const node = createMinimalValidCase().nodes[0]!;
    const untitledEvidence = { ...node.evidence[0]! };
    delete untitledEvidence.title;
    node.evidence[0] = untitledEvidence;
    expect(
      describeSubmission(
        {
          type: 'evidence-conclusion',
          conclusionId: 'option-a',
          evidenceIds: ['evidence-1'],
        },
        node,
      ),
    ).toBe(
      'Inspect the failing dependency; evidence: text evidence (evidence-1)',
    );
  });

  it('returns authored explanations for choice and structured submissions', () => {
    const node = createMinimalValidCase().nodes[0]!;
    expect(
      submissionOptionExplanations(
        { type: 'choice', selectedOptionIds: ['option-b'] },
        node,
      ).map(({ id }) => id),
    ).toEqual(['option-b']);
    expect(
      submissionOptionExplanations(
        { type: 'ordering', orderedOptionIds: ['option-b', 'option-a'] },
        node,
      ).map(({ id }) => id),
    ).toEqual(['option-b', 'option-a']);
  });

  it('computes exact-version level rates and transparent capability samples', () => {
    const beginner = createMinimalValidCase();
    beginner.nodes[0]!.skillWeights = { 'evidence-assessment': 1 };
    const intermediate = createMinimalValidCase();
    intermediate.id = 'case-intermediate';
    intermediate.level = 'intermediate';
    intermediate.nodes[0]!.type = 'customer-response';
    intermediate.nodes[0]!.skillWeights = { 'customer-communication': 1 };
    const attempts = [
      { attempt: completedAttempt('a'), caseContent: beginner },
      {
        attempt: {
          ...completedAttempt('b'),
          caseId: intermediate.id,
          score: 50,
          verdict: 'fail' as const,
        },
        caseContent: intermediate,
      },
    ];

    expect(calculateLevelPassRates(attempts)).toEqual([
      { level: 'beginner', passed: 1, samples: 1, rate: 100 },
      { level: 'intermediate', passed: 0, samples: 1, rate: 0 },
      { level: 'advanced', passed: 0, samples: 0, rate: undefined },
    ]);
    expect(calculateCapabilityDimensions(attempts)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'evidence', samples: 1, score: 100 }),
        expect.objectContaining({
          id: 'communication',
          samples: 1,
          score: 100,
        }),
        expect.objectContaining({
          id: 'priority',
          samples: 0,
          score: undefined,
        }),
      ]),
    );
  });

  it('counts a three-wrong revealed critical visit once and scores it zero', () => {
    const content = createMinimalValidCase();
    const record = completedAttempt('critical-reveal');
    record.score = 0;
    record.verdict = 'critical-risk';
    record.criticalErrorIds = ['critical-option'];
    record.roundHistory = ([1, 2, 3] as const).map((attemptNumber) => ({
      nodeId: 'node-1',
      attemptNumber,
      submission: { type: 'choice', selectedOptionIds: ['option-b'] },
      evaluation: {
        isCorrect: false,
        scoreRatio: 0,
        errorTypes: ['risk-awareness'],
        criticalErrorIds: attemptNumber === 3 ? ['critical-option'] : [],
        consequences: [],
        branchKey: attemptNumber === 3 ? 'critical' : 'incorrect',
      },
      submittedAt: `2026-07-13T00:0${String(attemptNumber)}:00.000Z`,
      revealed: attemptNumber === 3,
    }));

    expect(
      calculateCapabilityDimensions([
        { attempt: record, caseContent: content },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'evidence', samples: 1, score: 0 }),
        expect.objectContaining({ id: 'risk', samples: 1, score: 0 }),
      ]),
    );
  });

  it('keeps dimension membership authored even when outcome error types differ', () => {
    const content = createMinimalValidCase();
    const correct = completedAttempt('correct-membership');
    const wrong = completedAttempt('wrong-membership');
    wrong.score = 0;
    wrong.verdict = 'fail';
    wrong.roundHistory = ([1, 2, 3] as const).map((attemptNumber) => ({
      nodeId: 'node-1',
      attemptNumber,
      submission: { type: 'choice', selectedOptionIds: ['option-b'] },
      evaluation: {
        isCorrect: false,
        scoreRatio: 0,
        errorTypes: ['customer-communication'],
        criticalErrorIds: [],
        consequences: [],
        branchKey: 'incorrect',
      },
      submittedAt: `2026-07-13T00:0${String(attemptNumber)}:00.000Z`,
      revealed: attemptNumber === 3,
    }));
    const membership = (record: CompletedAttemptRecord) =>
      calculateCapabilityDimensions([{ attempt: record, caseContent: content }])
        .filter(({ samples }) => samples > 0)
        .map(({ id }) => id);

    expect(membership(wrong)).toEqual(membership(correct));
    expect(membership(wrong)).not.toContain('communication');
  });

  it('caps a second-round 60 score at 40 after an earlier critical round', () => {
    const content = createMinimalValidCase();
    const firstWrong = {
      ...completedAttempt().roundHistory[0]!,
      evaluation: {
        ...completedAttempt().roundHistory[0]!.evaluation,
        isCorrect: false,
        scoreRatio: 0,
        branchKey: 'critical',
        criticalErrorIds: ['critical-option'],
      },
    };
    const secondCorrect = completedAttempt().roundHistory[0]!;
    secondCorrect.attemptNumber = 2;
    secondCorrect.submission = {
      type: 'choice',
      selectedOptionIds: ['option-a'],
    };
    secondCorrect.evaluation = {
      ...secondCorrect.evaluation,
      isCorrect: true,
      criticalErrorIds: [],
      errorTypes: [],
    };

    expect(scoreVisit(content.nodes[0]!, [firstWrong])).toEqual({
      score: 0,
      criticalCapped: true,
    });
    expect(scoreVisit(content.nodes[0]!, [secondCorrect])).toEqual({
      score: 60,
      criticalCapped: false,
    });
    expect(scoreVisit(content.nodes[0]!, [firstWrong, secondCorrect])).toEqual({
      score: 40,
      criticalCapped: true,
    });
  });
});
