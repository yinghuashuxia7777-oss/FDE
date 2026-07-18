import { getVerdict, scoreCase } from './case-score';

describe('scoreCase', () => {
  it('normalizes earned points by possible points on the visited path', () => {
    expect(
      scoreCase([
        { earnedPoints: 10, possiblePoints: 20 },
        { earnedPoints: 15, possiblePoints: 30 },
      ]),
    ).toBe(50);
    expect(scoreCase([])).toBe(0);
    expect(scoreCase([{ earnedPoints: 0, possiblePoints: 0 }])).toBe(0);
  });

  it('clamps over-earning and rejects invalid or overflowing totals', () => {
    expect(scoreCase([{ earnedPoints: 20, possiblePoints: 10 }])).toBe(100);

    for (const entry of [
      { earnedPoints: -1, possiblePoints: 1 },
      { earnedPoints: 1, possiblePoints: -1 },
      { earnedPoints: Number.NaN, possiblePoints: 1 },
      { earnedPoints: 1, possiblePoints: Number.POSITIVE_INFINITY },
    ]) {
      expect(() => scoreCase([entry])).toThrow(/finite non-negative/i);
    }

    expect(() =>
      scoreCase([
        { earnedPoints: Number.MAX_VALUE, possiblePoints: Number.MAX_VALUE },
        { earnedPoints: Number.MAX_VALUE, possiblePoints: Number.MAX_VALUE },
      ]),
    ).toThrow(/total/i);
  });
});

describe('getVerdict', () => {
  it.each([
    [100, 'excellent'],
    [85, 'excellent'],
    [84.99, 'pass'],
    [70, 'pass'],
    [69.99, 'marginal'],
    [55, 'marginal'],
    [54.99, 'fail'],
  ] as const)('maps score %s to %s', (score, expected) => {
    expect(getVerdict(score, [])).toBe(expected);
  });

  it('lets any critical error override the score', () => {
    expect(getVerdict(100, ['option-critical'])).toBe('critical-risk');
  });

  it.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid normalized score %s',
    (score) => {
      expect(() => getVerdict(score, [])).toThrow(/between/i);
    },
  );
});
