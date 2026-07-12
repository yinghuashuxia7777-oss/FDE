import {
  buildInvalidCase,
  createMinimalValidCase,
  minimalValidCase,
} from '../tests/fixtures/cases';

import {
  CaseNodeSchema,
  FdeCaseSchema,
  NodeSubmissionSchema,
} from './case.schema';

describe('FdeCaseSchema shared fields', () => {
  it('accepts a minimal case with a single choice-family node', () => {
    expect(FdeCaseSchema.parse(minimalValidCase)).toEqual(minimalValidCase);
  });
});

describe('node scoring percentages', () => {
  it.each(['firstTry', 'secondTry', 'thirdTry'] as const)(
    'accepts 0 and 100 for %s',
    (field) => {
      for (const percentage of [0, 100]) {
        const candidate = createMinimalValidCase();
        candidate.nodes[0]!.scoring[field] = percentage;

        expect(FdeCaseSchema.safeParse(candidate).success).toBe(true);
      }
    },
  );

  it.each(['firstTry', 'secondTry', 'thirdTry'] as const)(
    'rejects percentages outside 0..100 for %s',
    (field) => {
      for (const percentage of [-0.01, 100.01]) {
        const candidate = createMinimalValidCase();
        candidate.nodes[0]!.scoring[field] = percentage;

        expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
      }
    },
  );
});

describe('node skill weights', () => {
  const withSkillWeights = (skillWeights: Record<string, number>) => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0]!,
      skillWeights,
    };
    return candidate;
  };

  const expectSkillWeightsError = (
    candidate: ReturnType<typeof createMinimalValidCase>,
  ) => {
    const result = FdeCaseSchema.safeParse(candidate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          ({ path }) =>
            path[0] === 'nodes' && path[1] === 0 && path[2] === 'skillWeights',
        ),
      ).toBe(true);
    }
  };

  it('requires skill weights on every node', () => {
    const candidate = createMinimalValidCase();
    Reflect.deleteProperty(candidate.nodes[0]!, 'skillWeights');

    expectSkillWeightsError(candidate);
  });

  it.each([
    ['empty', {}],
    ['zero', { 'evidence-assessment': 0 }],
    ['negative', { 'evidence-assessment': -1 }],
    ['non-finite', { 'evidence-assessment': Number.POSITIVE_INFINITY }],
    ['sum-not-one', { 'evidence-assessment': 0.9 }],
    ['unknown-skill', { 'unknown-skill': 1 }],
  ])('rejects %s skill weights', (_kind, skillWeights) => {
    expectSkillWeightsError(withSkillWeights(skillWeights));
  });

  it('accepts positive finite weights totaling one', () => {
    expect(
      FdeCaseSchema.safeParse(withSkillWeights({ 'evidence-assessment': 1 }))
        .success,
    ).toBe(true);
  });

  it('accepts totals within the 1e-9 tolerance', () => {
    const candidate = withSkillWeights({
      'evidence-assessment': 0.4,
      triage: 0.6000000005,
    });
    candidate.skills.push('triage');

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(true);
  });
});

describe('CaseNodeSchema answer shapes', () => {
  const sharedNode = minimalValidCase.nodes[0];

  it.each([
    'single-choice',
    'true-false',
    'log-analysis',
    'command-choice',
    'diff-review',
    'configuration-review',
    'architecture-tradeoff',
    'customer-response',
  ])('accepts the %s choice-family shape', (type) => {
    const node = {
      ...sharedNode,
      type,
      answer: { correctOptionId: 'option-a' },
    };

    expect(CaseNodeSchema.parse(node)).toEqual(node);
  });

  it.each([
    ['multiple-choice', { correctOptionIds: ['option-a', 'option-b'] }],
    [
      'ordering',
      {
        orderedOptionIds: ['option-a', 'option-b'],
        priorityOptionIds: ['option-a'],
        hazardousOptionIds: ['option-b'],
      },
    ],
    ['matching', { pairs: { 'option-a': 'option-b' } }],
    [
      'evidence-conclusion',
      { conclusionId: 'option-a', evidenceIds: ['evidence-1'] },
    ],
  ])('accepts the %s answer shape', (type, answer) => {
    const node = { ...sharedNode, type, answer };

    expect(CaseNodeSchema.parse(node)).toEqual(node);
  });
});

describe('NodeSubmissionSchema', () => {
  it.each([
    { type: 'choice', selectedOptionIds: ['option-a'] },
    { type: 'choice', selectedOptionIds: ['option-a', 'option-b'] },
    { type: 'ordering', orderedOptionIds: ['option-a', 'option-b'] },
    { type: 'matching', pairs: { 'option-a': 'option-b' } },
    {
      type: 'evidence-conclusion',
      conclusionId: 'option-a',
      evidenceIds: ['evidence-1'],
    },
  ])('accepts $type submissions', (submission) => {
    expect(NodeSubmissionSchema.parse(submission)).toEqual(submission);
  });
});

describe('FdeCaseSchema reference integrity', () => {
  it.each([
    [
      'node',
      buildInvalidCase((draft) => {
        draft.nodes.push(structuredClone(draft.nodes[0]!));
      }),
    ],
    [
      'option',
      buildInvalidCase((draft) => {
        const node = draft.nodes[0]!;
        node.options.push(structuredClone(node.options[0]!));
      }),
    ],
    [
      'evidence',
      buildInvalidCase((draft) => {
        const node = draft.nodes[0]!;
        node.evidence.push(structuredClone(node.evidence[0]!));
      }),
    ],
  ])('rejects duplicate %s IDs', (_kind, candidate) => {
    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects a start node that does not exist', () => {
    const candidate = buildInvalidCase((draft) => {
      draft.startNodeId = 'missing-node';
    });

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it.each([
    ['choice option', 'single-choice', { correctOptionId: 'missing-option' }],
    [
      'multiple-choice option',
      'multiple-choice',
      { correctOptionIds: ['option-a', 'missing-option'] },
    ],
    [
      'ordering option',
      'ordering',
      { orderedOptionIds: ['option-a', 'missing-option'] },
    ],
    [
      'ordering priority option',
      'ordering',
      {
        orderedOptionIds: ['option-a', 'option-b'],
        priorityOptionIds: ['missing-option'],
      },
    ],
    [
      'ordering hazardous option',
      'ordering',
      {
        orderedOptionIds: ['option-a', 'option-b'],
        hazardousOptionIds: ['missing-option'],
      },
    ],
    [
      'matching option',
      'matching',
      { pairs: { 'option-a': 'missing-option' } },
    ],
    [
      'matching left option',
      'matching',
      { pairs: { 'missing-option': 'option-b' } },
    ],
    [
      'evidence conclusion option',
      'evidence-conclusion',
      { conclusionId: 'missing-option', evidenceIds: ['evidence-1'] },
    ],
    [
      'supporting evidence',
      'evidence-conclusion',
      { conclusionId: 'option-a', evidenceIds: ['missing-evidence'] },
    ],
  ])('rejects a missing %s answer reference', (_kind, type, answer) => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0]!,
      type,
      answer,
    } as never;

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it.each([
    [
      'critical error option',
      buildInvalidCase((draft) => {
        draft.nodes[0]!.scoring.criticalErrorOptionIds = ['missing-option'];
      }),
    ],
    [
      'consequence option',
      buildInvalidCase((draft) => {
        draft.nodes[0]!.consequences = [{ optionId: 'missing-option' }];
      }),
    ],
    [
      'branch node',
      buildInvalidCase((draft) => {
        draft.nodes[0]!.branches = [
          { key: 'missing-node-branch', nextNodeId: 'missing-node' },
        ];
      }),
    ],
  ])('rejects a missing %s reference', (_kind, candidate) => {
    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });
});

describe('answer ID set semantics', () => {
  const sharedNode = minimalValidCase.nodes[0]!;

  it.each([
    ['multiple-choice', { correctOptionIds: ['option-a', 'option-a'] }],
    ['ordering', { orderedOptionIds: ['option-a', 'option-a'] }],
    [
      'evidence-conclusion',
      { conclusionId: 'option-a', evidenceIds: ['evidence-1', 'evidence-1'] },
    ],
  ])('rejects duplicate IDs in a %s answer', (type, answer) => {
    expect(
      FdeCaseSchema.safeParse({
        ...minimalValidCase,
        nodes: [{ ...sharedNode, type, answer }],
      }).success,
    ).toBe(false);
  });

  it.each([
    { type: 'choice', selectedOptionIds: ['option-a', 'option-a'] },
    { type: 'ordering', orderedOptionIds: ['option-a', 'option-a'] },
    {
      type: 'evidence-conclusion',
      conclusionId: 'option-a',
      evidenceIds: ['evidence-1', 'evidence-1'],
    },
  ])('rejects duplicate IDs in $type submissions', (submission) => {
    expect(NodeSubmissionSchema.safeParse(submission).success).toBe(false);
  });
});

describe('complete ordering and matching answers', () => {
  const sharedNode = minimalValidCase.nodes[0]!;
  const createOption = (id: string) => ({
    ...sharedNode.options[0]!,
    id,
    label: id,
  });

  it.each([
    ['omits an option', ['option-a']],
    ['adds an unknown option', ['option-a', 'option-b', 'option-extra']],
  ])('rejects ordering that %s', (_reason, orderedOptionIds) => {
    expect(
      FdeCaseSchema.safeParse({
        ...minimalValidCase,
        nodes: [
          {
            ...sharedNode,
            type: 'ordering',
            answer: { orderedOptionIds },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it.each([
    [
      'reuses a right-side option',
      ['option-a', 'option-b', 'option-c'],
      { 'option-a': 'option-c', 'option-b': 'option-c' },
    ],
    [
      'omits an option',
      ['option-a', 'option-b', 'option-c'],
      { 'option-a': 'option-b' },
    ],
    [
      'reuses options across both sides',
      ['option-a', 'option-b'],
      { 'option-a': 'option-b', 'option-b': 'option-a' },
    ],
  ])('rejects matching that %s', (_reason, optionIds, pairs) => {
    expect(
      FdeCaseSchema.safeParse({
        ...minimalValidCase,
        nodes: [
          {
            ...sharedNode,
            type: 'matching',
            options: optionIds.map(createOption),
            answer: { pairs },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('accepts matching where each option participates exactly once', () => {
    expect(
      FdeCaseSchema.safeParse({
        ...minimalValidCase,
        nodes: [
          {
            ...sharedNode,
            type: 'matching',
            options: ['option-a', 'option-b', 'option-c', 'option-d'].map(
              createOption,
            ),
            answer: {
              pairs: { 'option-a': 'option-b', 'option-c': 'option-d' },
            },
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('optional answer and scoring ID sets', () => {
  const sharedNode = minimalValidCase.nodes[0]!;

  it.each([
    ['priority', { priorityOptionIds: ['option-a', 'option-a'] }],
    ['hazardous', { hazardousOptionIds: ['option-b', 'option-b'] }],
  ])('rejects duplicate %s option IDs', (_kind, optionalAnswer) => {
    expect(
      FdeCaseSchema.safeParse({
        ...minimalValidCase,
        nodes: [
          {
            ...sharedNode,
            type: 'ordering',
            answer: {
              orderedOptionIds: ['option-a', 'option-b'],
              ...optionalAnswer,
            },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate critical-error option IDs', () => {
    expect(
      FdeCaseSchema.safeParse({
        ...minimalValidCase,
        nodes: [
          {
            ...sharedNode,
            scoring: {
              ...sharedNode.scoring,
              criticalErrorOptionIds: ['option-b', 'option-b'],
            },
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('FdeCaseSchema review metadata', () => {
  it.each(['reviewed', 'published'])(
    'rejects %s cases without reviewer metadata',
    (status) => {
      const candidate = createMinimalValidCase();
      candidate.status = status as 'reviewed' | 'published';

      expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
    },
  );

  it.each([
    ['reviewer', { reviewer: 'Reviewer' }],
    ['reviewedAt', { reviewedAt: '2026-07-13T01:00:00.000Z' }],
  ])('rejects a reviewed case with only %s', (_field, metadata) => {
    const candidate = createMinimalValidCase();
    candidate.status = 'reviewed';
    Object.assign(candidate.metadata, metadata);

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it.each(['reviewed', 'published'])(
    'accepts %s cases with complete reviewer metadata',
    (status) => {
      const candidate = createMinimalValidCase();
      candidate.status = status as 'reviewed' | 'published';
      candidate.metadata.reviewer = 'Reviewer';
      candidate.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';

      expect(FdeCaseSchema.safeParse(candidate).success).toBe(true);
    },
  );

  it('keeps expert level and planned status available for future content', () => {
    const candidate = createMinimalValidCase();
    candidate.level = 'expert';
    candidate.status = 'planned';

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(true);
  });
});

describe('CaseNodeSchema non-empty answers', () => {
  const sharedNode = minimalValidCase.nodes[0]!;

  it.each([
    ['single-choice', { correctOptionId: '' }],
    ['multiple-choice', { correctOptionIds: [] }],
    ['ordering', { orderedOptionIds: [] }],
    ['matching', { pairs: {} }],
    ['evidence-conclusion', { conclusionId: 'option-a', evidenceIds: [] }],
  ])('rejects an empty %s answer', (type, answer) => {
    const node = { ...sharedNode, type, answer };

    expect(CaseNodeSchema.safeParse(node).success).toBe(false);
  });
});

describe('DebriefSchema', () => {
  it('rejects the legacy partial debrief shape', () => {
    const candidate = createMinimalValidCase();
    candidate.debrief = {
      summary: 'Summary',
      keyLessons: ['Lesson'],
      remediation: ['Remediation'],
      verification: ['Verification'],
    } as never;

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it.each([
    ['summary', ''],
    ['rootCause', ''],
    ['correctApproach', []],
    ['keyLessons', []],
    ['interviewerPerspective', ''],
    ['customerRiskPerspective', ''],
    ['remediation', []],
    ['verification', []],
    ['knowledgePoints', []],
  ])('rejects an empty required %s field', (field, value) => {
    const candidate = createMinimalValidCase();
    Object.assign(candidate.debrief, { [field]: value });

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects an empty recommended case list when provided', () => {
    const candidate = createMinimalValidCase();
    candidate.debrief.recommendedCaseIds = [];

    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });
});
