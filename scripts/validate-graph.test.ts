import { describe, expect, it } from 'vitest';

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

describe('validateCaseGraph', () => {
  it('accepts a reachable graph that terminates', () => {
    expect(validateCaseGraph(createMinimalValidCase(), 'case.json')).toEqual(
      [],
    );
  });

  it('reports unreachable nodes', () => {
    const candidate = createMinimalValidCase();
    addNode(candidate, 'orphan', [{ key: 'done', nextNodeId: null }]);

    expect(issueCodes(candidate)).toContain('unreachable_node');
  });

  it('defensively reports missing branch targets', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [{ key: 'continue', nextNodeId: 'missing' }];

    expect(issueCodes(candidate)).toContain('missing_branch_target');
  });

  it('reports duplicate branch keys on a node', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [
      { key: 'same', nextNodeId: null },
      { key: 'same', nextNodeId: null },
    ];

    expect(issueCodes(candidate)).toContain('duplicate_branch_key');
  });

  it('defensively reports an empty branch key', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [{ key: '', nextNodeId: null }];

    expect(issueCodes(candidate)).toContain('missing_branch_key');
  });

  it('reports a closed reachable cycle and nodes without terminal paths', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0].branches = [{ key: 'loop', nextNodeId: 'node-2' }];
    addNode(candidate, 'node-2', [{ key: 'loop', nextNodeId: 'node-1' }]);

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
    candidate.nodes[0].branches = [{ key: 'next', nextNodeId: 'node-2' }];
    addNode(candidate, 'node-2', [
      { key: 'retry', nextNodeId: 'node-1' },
      { key: 'done', nextNodeId: null },
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
});
