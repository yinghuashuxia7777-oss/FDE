import { describe, expect, it } from 'vitest';

import type { CaseNode, NodeSubmission } from '../src/domain/cases/types';
import { evaluateNode } from '../src/domain/scoring/evaluate-node';
import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { validateCaseGraph } from './validate-graph';

function issueCodes(candidate: ReturnType<typeof createMinimalValidCase>) {
  return validateCaseGraph(candidate, 'case.json').map(({ code }) => code);
}

function addNode(
  candidate: ReturnType<typeof createMinimalValidCase>,
  id: string,
  branches: { key: string; nextNodeId: string | null }[],
) {
  const node = structuredClone(candidate.nodes[0]);
  node.id = id;
  node.branches = branches;
  candidate.nodes.push(node);
}

function makeNonCritical(candidate: ReturnType<typeof createMinimalValidCase>) {
  candidate.nodes.forEach((node) => {
    node.scoring.criticalErrorOptionIds = [];
  });
}

function evaluatedBranchKeys(
  node: CaseNode,
  submissions: readonly NodeSubmission[],
): string[] {
  return [
    ...new Set(
      submissions.map((submission) => evaluateNode(node, submission).branchKey),
    ),
  ].sort();
}

describe('validateCaseGraph', () => {
  it('accepts a reachable graph that terminates', () => {
    expect(validateCaseGraph(createMinimalValidCase(), 'case.json')).toEqual(
      [],
    );
  });

  it('reports unreachable nodes', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'correct', nextNodeId: null },
      { key: 'incorrect', nextNodeId: null },
    ];
    addNode(candidate, 'orphan', [
      { key: 'correct', nextNodeId: null },
      { key: 'incorrect', nextNodeId: null },
    ]);

    expect(issueCodes(candidate)).toContain('unreachable_node');
  });

  it('defensively reports missing branch targets', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'correct', nextNodeId: 'missing' },
      { key: 'incorrect', nextNodeId: null },
    ];

    expect(issueCodes(candidate)).toContain('missing_branch_target');
  });

  it('reports duplicate branch keys on a node', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'correct', nextNodeId: null },
      { key: 'correct', nextNodeId: null },
      { key: 'incorrect', nextNodeId: null },
    ];

    expect(issueCodes(candidate)).toContain('duplicate_branch_key');
  });

  it('defensively reports an empty branch key', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: '', nextNodeId: null },
      { key: 'correct', nextNodeId: null },
      { key: 'incorrect', nextNodeId: null },
    ];

    expect(issueCodes(candidate)).toContain('missing_branch_key');
  });

  it('reports a closed reachable cycle and nodes without terminal paths', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'correct', nextNodeId: 'node-2' },
      { key: 'incorrect', nextNodeId: 'node-2' },
    ];
    addNode(candidate, 'node-2', [
      { key: 'correct', nextNodeId: 'node-1' },
      { key: 'incorrect', nextNodeId: 'node-1' },
    ]);

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining([
        'closed_cycle',
        'no_terminal',
        'no_terminal_path',
      ]),
    );
  });

  it('allows a cycle with an exit that reaches a terminal', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'correct', nextNodeId: 'node-2' },
      { key: 'incorrect', nextNodeId: 'node-2' },
    ];
    addNode(candidate, 'node-2', [
      { key: 'correct', nextNodeId: 'node-1' },
      { key: 'incorrect', nextNodeId: null },
    ]);

    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('reports graphs with no terminal', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [];

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining(['missing_branch', 'no_terminal']),
    );
  });

  it.each(['correct', 'incorrect', 'critical'] as const)(
    'reports a missing %s evaluator result branch',
    (missingKey) => {
      const candidate = createMinimalValidCase();
      candidate.nodes[0].options.push({
        id: 'option-c',
        label: 'Wait without gathering evidence',
        explanation: 'This leaves the incident unresolved.',
      });
      candidate.nodes[0].branches = ['correct', 'incorrect', 'critical']
        .filter((key) => key !== missingKey)
        .map((key) => ({ key, nextNodeId: null }));

      expect(issueCodes(candidate)).toContain('missing_result_branch');
    },
  );

  it('rejects a branch key the evaluator never produces', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [
      { key: 'correct', nextNodeId: null },
      { key: 'critical', nextNodeId: null },
      { key: 'complete', nextNodeId: null },
    ];

    expect(issueCodes(candidate)).toContain('unsupported_branch_key');
  });

  it('rejects unknown and non-choice option branches', () => {
    const unknownOption = createMinimalValidCase();
    unknownOption.nodes[0].branches = [
      { key: 'correct', nextNodeId: null },
      { key: 'critical', nextNodeId: null },
      { key: 'option:missing', nextNodeId: null },
    ];

    const ordering = createMinimalValidCase();
    ordering.nodes[0] = {
      ...ordering.nodes[0],
      type: 'ordering',
      answer: { orderedOptionIds: ['option-a', 'option-b'] },
      scoring: {
        ...ordering.nodes[0].scoring,
        criticalErrorOptionIds: [],
      },
      consequences: [],
      branches: [
        { key: 'correct', nextNodeId: null },
        { key: 'incorrect', nextNodeId: null },
        { key: 'option:option-a', nextNodeId: null },
      ],
    };

    expect(issueCodes(unknownOption)).toContain('unsupported_branch_key');
    expect(issueCodes(ordering)).toContain('unsupported_branch_key');
  });

  it('accepts a reachable option branch on a choice node', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [
      { key: 'option:option-a', nextNodeId: null },
      { key: 'critical', nextNodeId: null },
    ];

    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('requires only authored option branches that a choice evaluator produces', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'option:option-a', nextNodeId: null },
      { key: 'option:option-b', nextNodeId: null },
    ];

    expect(
      evaluatedBranchKeys(candidate.nodes[0], [
        { type: 'choice', selectedOptionIds: ['option-a'] },
        { type: 'choice', selectedOptionIds: ['option-b'] },
      ]),
    ).toEqual(['option:option-a', 'option:option-b']);
    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('derives multiple-choice keys from every legal subset outcome', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0],
      type: 'multiple-choice',
      answer: { correctOptionIds: ['option-a'] },
      branches: [
        { key: 'correct', nextNodeId: null },
        { key: 'critical', nextNodeId: null },
      ],
    };

    expect(
      evaluatedBranchKeys(candidate.nodes[0], [
        { type: 'choice', selectedOptionIds: ['option-a'] },
        { type: 'choice', selectedOptionIds: ['option-b'] },
        { type: 'choice', selectedOptionIds: ['option-a', 'option-b'] },
      ]),
    ).toEqual(['correct', 'critical']);
    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('derives evidence-conclusion keys from conclusions and evidence sets', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0],
      type: 'evidence-conclusion',
      answer: {
        conclusionId: 'option-a',
        evidenceIds: ['evidence-1'],
      },
      branches: [
        { key: 'correct', nextNodeId: null },
        { key: 'critical', nextNodeId: null },
      ],
    };

    expect(
      evaluatedBranchKeys(candidate.nodes[0], [
        {
          type: 'evidence-conclusion',
          conclusionId: 'option-a',
          evidenceIds: ['evidence-1'],
        },
        {
          type: 'evidence-conclusion',
          conclusionId: 'option-b',
          evidenceIds: ['evidence-1'],
        },
      ]),
    ).toEqual(['correct', 'critical']);
    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('derives ordering keys from complete permutations', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0],
      type: 'ordering',
      answer: { orderedOptionIds: ['option-a', 'option-b'] },
      scoring: {
        ...candidate.nodes[0].scoring,
        criticalErrorOptionIds: [],
      },
      consequences: [],
      branches: [
        { key: 'correct', nextNodeId: null },
        { key: 'incorrect', nextNodeId: null },
      ],
    };

    expect(
      evaluatedBranchKeys(candidate.nodes[0], [
        { type: 'ordering', orderedOptionIds: ['option-a', 'option-b'] },
        { type: 'ordering', orderedOptionIds: ['option-b', 'option-a'] },
      ]),
    ).toEqual(['correct', 'incorrect']);
    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('does not require an impossible incorrect matching result', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0],
      type: 'matching',
      answer: { pairs: { 'option-a': 'option-b' } },
      scoring: {
        ...candidate.nodes[0].scoring,
        criticalErrorOptionIds: [],
      },
      consequences: [],
      branches: [{ key: 'correct', nextNodeId: null }],
    };

    expect(
      evaluatedBranchKeys(candidate.nodes[0], [
        { type: 'matching', pairs: { 'option-a': 'option-b' } },
      ]),
    ).toEqual(['correct']);
    expect(validateCaseGraph(candidate, 'case.json')).toEqual([]);
  });

  it('excludes evaluator-unreachable branches from graph reachability and terminals', () => {
    const candidate = createMinimalValidCase();
    makeNonCritical(candidate);
    candidate.nodes[0].branches = [
      { key: 'option:option-a', nextNodeId: 'node-1' },
      { key: 'option:option-b', nextNodeId: 'node-1' },
      { key: 'correct', nextNodeId: 'orphan' },
    ];
    addNode(candidate, 'orphan', [
      { key: 'correct', nextNodeId: null },
      { key: 'incorrect', nextNodeId: null },
    ]);

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining([
        'unsupported_branch_key',
        'unreachable_node',
        'no_terminal',
        'no_terminal_path',
        'closed_cycle',
      ]),
    );
  });

  it.each(['ordering', 'matching'] as const)(
    'rejects decision effects that the %s evaluator does not consume',
    (type) => {
      const candidate = createMinimalValidCase();
      candidate.nodes[0] = {
        ...candidate.nodes[0],
        type,
        answer:
          type === 'ordering'
            ? { orderedOptionIds: ['option-a', 'option-b'] }
            : { pairs: { 'option-a': 'option-b' } },
        branches: [
          { key: 'correct', nextNodeId: null },
          { key: 'incorrect', nextNodeId: null },
        ],
      } as never;

      expect(issueCodes(candidate)).toEqual(
        expect.arrayContaining([
          'unsupported_critical_error_config',
          'unsupported_consequence_config',
        ]),
      );
    },
  );
});
