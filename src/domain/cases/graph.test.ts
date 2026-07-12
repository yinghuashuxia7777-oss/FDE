import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { resolveNextNode } from './graph';

describe('resolveNextNode', () => {
  it('resolves an exact branch key including explicit termination', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.branches = [
      { key: 'correct', nextNodeId: 'node-2' },
      { key: 'incorrect', nextNodeId: null },
    ];

    expect(resolveNextNode(node, 'correct')).toBe('node-2');
    expect(resolveNextNode(node, 'incorrect')).toBeNull();
  });

  it('rejects missing and duplicate branch keys as malformed graphs', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.branches = [
      { key: 'correct', nextNodeId: null },
      { key: 'correct', nextNodeId: 'node-2' },
    ];

    expect(() => resolveNextNode(node, 'correct')).toThrow(/duplicate/i);
    expect(() => resolveNextNode(node, 'missing')).toThrow(/missing/i);
  });
});
