import type { EvaluationResult } from '../cases/types';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { scoreNode } from './score-node';

const exactResult: EvaluationResult = {
  isCorrect: true,
  scoreRatio: 1,
  errorTypes: [],
  criticalErrorIds: [],
  consequences: [],
  branchKey: 'correct',
};

describe('scoreNode', () => {
  it('uses the authored percentage for the successful attempt', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.scoring = {
      firstTry: 100,
      secondTry: 60,
      thirdTry: 30,
      weight: 20,
    };

    expect(scoreNode(node, exactResult, 1, false)).toBe(20);
    expect(scoreNode(node, exactResult, 2, false)).toBe(12);
    expect(scoreNode(node, exactResult, 3, false)).toBe(6);
    expect(
      scoreNode(node, { ...exactResult, isCorrect: false }, 1, false),
    ).toBe(0);
    expect(scoreNode(node, exactResult, 1, true)).toBe(0);
  });

  it('clamps authored percentages and rejects an invalid runtime attempt', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.scoring = {
      firstTry: 150,
      secondTry: -20,
      thirdTry: 30,
      weight: 10,
    };

    expect(scoreNode(node, exactResult, 1, false)).toBe(10);
    expect(scoreNode(node, exactResult, 2, false)).toBe(0);
    expect(() => scoreNode(node, exactResult, 4 as 1, false)).toThrow(
      /attempt/i,
    );
  });

  it('rejects invalid weights and non-finite authored percentages', () => {
    const node = createMinimalValidCase().nodes[0]!;
    node.scoring.weight = -1;
    expect(() => scoreNode(node, exactResult, 1, false)).toThrow(/weight/i);

    node.scoring.weight = 1;
    node.scoring.firstTry = Number.NaN;
    expect(() => scoreNode(node, exactResult, 1, false)).toThrow(/finite/i);
  });
});
