import { aggregateSkillScores } from './aggregate-skill-scores';

describe('aggregateSkillScores', () => {
  it('computes a per-skill weighted average across completed nodes', () => {
    expect(
      aggregateSkillScores([
        {
          score0to100: 80,
          skillWeights: { diagnosis: 1, communication: 0 },
        },
        {
          score0to100: 50,
          skillWeights: { diagnosis: 1, communication: 3 },
        },
        {
          score0to100: 100,
          skillWeights: { diagnosis: 0, communication: 1 },
        },
      ]),
    ).toEqual({ communication: 62.5, diagnosis: 65 });
    expect(aggregateSkillScores([])).toEqual({});
  });

  it('rejects invalid scores, weights, and weight maps', () => {
    expect(() =>
      aggregateSkillScores([
        { score0to100: Number.NaN, skillWeights: { diagnosis: 1 } },
      ]),
    ).toThrow(/score/i);
    expect(() =>
      aggregateSkillScores([
        { score0to100: 50, skillWeights: { diagnosis: -1 } },
      ]),
    ).toThrow(/weight/i);
    expect(() =>
      aggregateSkillScores([
        {
          score0to100: 50,
          skillWeights: null as unknown as Record<string, number>,
        },
      ]),
    ).toThrow(/skill weights/i);
    expect(
      aggregateSkillScores([
        { score0to100: 50, skillWeights: { diagnosis: 0 } },
      ]),
    ).toEqual({});
  });
});
