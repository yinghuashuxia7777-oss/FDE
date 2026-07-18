import { createMinimalValidCase } from '../../tests/fixtures/cases';
import type {
  CaseNode,
  ChoiceNodeType,
  EvidenceConclusionCaseNode,
  MatchingCaseNode,
  MultipleChoiceCaseNode,
  OrderingCaseNode,
} from '../cases/types';
import { EvaluationDomainError, evaluateNode } from './evaluate-node';

describe('evaluateNode choice nodes', () => {
  it('marks only the exact option correct and uses an option-specific branch', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.scoring.criticalErrorOptionIds = [];
    node.consequences = [];
    node.branches = [
      { key: 'option:option-a', nextNodeId: null },
      { key: 'option:option-b', nextNodeId: null },
      { key: 'incorrect', nextNodeId: null },
    ];

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-a'],
      }),
    ).toEqual({
      isCorrect: true,
      scoreRatio: 1,
      errorTypes: [],
      criticalErrorIds: [],
      consequences: [],
      branchKey: 'option:option-a',
    });

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-b'],
      }),
    ).toEqual({
      isCorrect: false,
      scoreRatio: 0,
      errorTypes: ['unsupported-action'],
      criticalErrorIds: [],
      consequences: [],
      branchKey: 'option:option-b',
    });
  });

  it('lets critical decisions override an authored option branch', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.branches = [{ key: 'option:option-b', nextNodeId: null }];

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-b'],
      }),
    ).toMatchObject({
      isCorrect: false,
      criticalErrorIds: ['option-b'],
      branchKey: 'critical',
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
    'evaluates %s with choice semantics',
    (type) => {
      const node = createMinimalValidCase().nodes[0]!;
      node.type = type;

      expect(
        evaluateNode(node, {
          type: 'choice',
          selectedOptionIds: ['option-a'],
        }),
      ).toMatchObject({ isCorrect: true, scoreRatio: 1, branchKey: 'correct' });
    },
  );
});

describe('evaluateNode multiple-choice nodes', () => {
  it('penalizes wrong and missing selections and clamps similarity', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: MultipleChoiceCaseNode = {
      ...choiceNode,
      type: 'multiple-choice',
      options: [
        ...choiceNode.options,
        {
          id: 'option-c',
          label: 'Unsupported third choice',
          explanation: 'This option is incorrect.',
          errorType: 'unsupported-third-choice',
        },
      ],
      answer: { correctOptionIds: ['option-a', 'option-b'] },
      scoring: { ...choiceNode.scoring, criticalErrorOptionIds: [] },
      consequences: [],
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-a'],
      }),
    ).toMatchObject({ isCorrect: false, scoreRatio: 0.25 });

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-a', 'option-b', 'option-c'],
      }),
    ).toMatchObject({ isCorrect: false, scoreRatio: 0.5 });

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-b', 'option-a'],
      }),
    ).toMatchObject({ isCorrect: true, scoreRatio: 1 });
  });
});

describe('evaluateNode ordering nodes', () => {
  it('weights the first action, canonical pairs, and milestone positions', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: OrderingCaseNode = {
      ...choiceNode,
      type: 'ordering',
      options: [
        ...choiceNode.options,
        {
          id: 'option-c',
          label: 'Third action',
          explanation: 'Run third.',
        },
        {
          id: 'option-d',
          label: 'Fourth action',
          explanation: 'Run last.',
        },
      ],
      answer: {
        orderedOptionIds: ['option-a', 'option-b', 'option-c', 'option-d'],
        priorityOptionIds: ['option-b'],
        hazardousOptionIds: ['option-d'],
      },
      scoring: { ...choiceNode.scoring, criticalErrorOptionIds: [] },
      consequences: [],
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a', 'option-c', 'option-b', 'option-d'],
      }),
    ).toMatchObject({ isCorrect: false, scoreRatio: 0.825 });

    node.answer.priorityOptionIds = [];
    node.answer.hazardousOptionIds = [];
    expect(
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a', 'option-c', 'option-b', 'option-d'],
      }).scoreRatio,
    ).toBeCloseTo(0.925);

    expect(
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: node.answer.orderedOptionIds,
      }),
    ).toMatchObject({ isCorrect: true, scoreRatio: 1 });
  });

  it('rejects subsets and extra IDs instead of partially scoring them', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: OrderingCaseNode = {
      ...choiceNode,
      type: 'ordering',
      answer: { orderedOptionIds: ['option-a', 'option-b'] },
      branches: [],
    };

    expect(() =>
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a'],
      }),
    ).toThrow(/complete permutation/i);
    expect(() =>
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a', 'option-b', 'option-extra'],
      }),
    ).toThrow(EvaluationDomainError);
    expect(() =>
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a', 'option-a'],
      }),
    ).toThrow(/duplicate/i);
    expect(() =>
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a', 'option-unknown'],
      }),
    ).toThrow(/unknown option/i);
  });
});

describe('evaluateNode matching nodes', () => {
  it('scores correct pairs and requires an exact bijection', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: MatchingCaseNode = {
      ...choiceNode,
      type: 'matching',
      options: [
        ...choiceNode.options,
        {
          id: 'option-c',
          label: 'Second left item',
          explanation: 'Match this item.',
        },
        {
          id: 'option-d',
          label: 'Second right item',
          explanation: 'This is its match.',
        },
      ],
      answer: {
        pairs: { 'option-a': 'option-b', 'option-c': 'option-d' },
      },
      scoring: { ...choiceNode.scoring, criticalErrorOptionIds: [] },
      consequences: [],
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'matching',
        pairs: { 'option-a': 'option-b', 'option-c': 'option-b' },
      }),
    ).toMatchObject({ isCorrect: false, scoreRatio: 0.5 });

    expect(
      evaluateNode(node, {
        type: 'matching',
        pairs: { 'option-a': 'option-b', 'option-c': 'option-d' },
      }),
    ).toMatchObject({ isCorrect: true, scoreRatio: 1 });
  });
});

describe('evaluateNode evidence-conclusion nodes', () => {
  it('combines conclusion accuracy with evidence-set similarity', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: EvidenceConclusionCaseNode = {
      ...choiceNode,
      type: 'evidence-conclusion',
      evidence: [
        ...choiceNode.evidence,
        { id: 'evidence-2', type: 'log', content: 'Supporting log line.' },
        { id: 'evidence-3', type: 'text', content: 'Irrelevant detail.' },
      ],
      answer: {
        conclusionId: 'option-a',
        evidenceIds: ['evidence-1', 'evidence-2'],
      },
      scoring: { ...choiceNode.scoring, criticalErrorOptionIds: [] },
      consequences: [],
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-a',
        evidenceIds: ['evidence-1'],
      }),
    ).toMatchObject({ isCorrect: false, scoreRatio: 0.75 });

    expect(
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-b',
        evidenceIds: ['evidence-1', 'evidence-2'],
      }),
    ).toMatchObject({ isCorrect: false, scoreRatio: 0.5 });

    expect(
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-a',
        evidenceIds: ['evidence-1', 'evidence-2', 'evidence-3'],
      }).scoreRatio,
    ).toBeCloseTo(5 / 6);

    expect(
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-a',
        evidenceIds: ['evidence-2', 'evidence-1'],
      }),
    ).toMatchObject({ isCorrect: true, scoreRatio: 1 });
  });
});

describe('evaluateNode decision effects', () => {
  it('derives critical errors, consequences, and stable error types from selected decisions', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: MultipleChoiceCaseNode = {
      ...choiceNode,
      type: 'multiple-choice',
      options: [
        ...choiceNode.options,
        {
          id: 'option-c',
          label: 'Untyped wrong option',
          explanation: 'This option is also wrong.',
        },
        {
          id: 'option-d',
          label: 'Repeated error type',
          explanation: 'This has a distinct later error category.',
          errorType: 'late-authored-error',
        },
      ],
      answer: { correctOptionIds: ['option-a'] },
      scoring: {
        ...choiceNode.scoring,
        criticalErrorOptionIds: ['option-b'],
      },
      consequences: [
        { optionId: 'option-b', timeDelta: 5, message: 'Delayed recovery.' },
        { optionId: 'option-c', riskDelta: 2 },
      ],
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-d', 'option-c', 'option-b'],
      }),
    ).toEqual({
      isCorrect: false,
      scoreRatio: 0,
      errorTypes: [
        'unsupported-action',
        'incorrect-option',
        'late-authored-error',
      ],
      criticalErrorIds: ['option-b'],
      consequences: [
        { timeDelta: 5, message: 'Delayed recovery.' },
        { riskDelta: 2 },
      ],
      branchKey: 'critical',
    });
  });

  it('does not treat ordering participation as a selected decision', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: OrderingCaseNode = {
      ...choiceNode,
      type: 'ordering',
      answer: { orderedOptionIds: ['option-a', 'option-b'] },
      scoring: {
        ...choiceNode.scoring,
        criticalErrorOptionIds: ['option-b'],
      },
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-b', 'option-a'],
      }),
    ).toMatchObject({ criticalErrorIds: [], consequences: [] });
  });

  it('does not treat matching participation as a selected decision', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: MatchingCaseNode = {
      ...choiceNode,
      type: 'matching',
      answer: { pairs: { 'option-a': 'option-b' } },
      scoring: {
        ...choiceNode.scoring,
        criticalErrorOptionIds: ['option-b'],
      },
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'matching',
        pairs: { 'option-a': 'option-b' },
      }),
    ).toMatchObject({ criticalErrorIds: [], consequences: [] });
  });

  it('applies decision effects to the submitted conclusion only', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: EvidenceConclusionCaseNode = {
      ...choiceNode,
      type: 'evidence-conclusion',
      answer: { conclusionId: 'option-a', evidenceIds: ['evidence-1'] },
      branches: [],
    };

    expect(
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-b',
        evidenceIds: ['evidence-1'],
      }),
    ).toMatchObject({
      criticalErrorIds: ['option-b'],
      consequences: [{ timeDelta: 5, riskDelta: 1 }],
      branchKey: 'critical',
    });
  });
});

describe('evaluateNode submission boundaries', () => {
  it('rejects empty, duplicate, unknown, and mismatched choice submissions', () => {
    const node = createMinimalValidCase().nodes[0]!;

    expect(() =>
      evaluateNode(node, { type: 'choice', selectedOptionIds: [] }),
    ).toThrow(/empty/i);
    expect(() =>
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-a', 'option-a'],
      }),
    ).toThrow(/duplicate/i);
    expect(() =>
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['unknown-option'],
      }),
    ).toThrow(/unknown option/i);
    expect(() =>
      evaluateNode(node, {
        type: 'ordering',
        orderedOptionIds: ['option-a', 'option-b'],
      }),
    ).toThrow(/does not match/i);
  });

  it('rejects duplicate or unknown evidence IDs', () => {
    const choiceNode = createMinimalValidCase().nodes[0]!;
    const node: EvidenceConclusionCaseNode = {
      ...choiceNode,
      type: 'evidence-conclusion',
      answer: { conclusionId: 'option-a', evidenceIds: ['evidence-1'] },
      branches: [],
    };

    expect(() =>
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-a',
        evidenceIds: ['evidence-1', 'evidence-1'],
      }),
    ).toThrow(/duplicate/i);
    expect(() =>
      evaluateNode(node, {
        type: 'evidence-conclusion',
        conclusionId: 'option-a',
        evidenceIds: ['unknown-evidence'],
      }),
    ).toThrow(/unknown evidence/i);
  });

  it('rejects an unknown runtime node discriminator', () => {
    const node = {
      ...createMinimalValidCase().nodes[0]!,
      type: 'unknown-runtime-node',
    } as unknown as CaseNode;

    expect(() =>
      evaluateNode(node, {
        type: 'choice',
        selectedOptionIds: ['option-a'],
      }),
    ).toThrow(EvaluationDomainError);
  });
});
