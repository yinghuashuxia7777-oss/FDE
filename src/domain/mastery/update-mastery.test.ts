import { updateMastery } from './update-mastery';

describe('updateMastery', () => {
  it('uses the first score then blends later scores 70/30', () => {
    expect(updateMastery(undefined, 80, false)).toBe(80);
    expect(updateMastery(80, 100, false)).toBe(86);
  });

  it('caps the current contribution at 40 for a critical case', () => {
    expect(updateMastery(undefined, 100, true)).toBe(40);
    expect(updateMastery(80, 100, true)).toBe(68);
  });

  it.each([
    [undefined, -1],
    [undefined, 101],
    [undefined, Number.NaN],
    [undefined, Number.POSITIVE_INFINITY],
    [-1, 50],
    [101, 50],
  ] as const)('rejects previous %s and current %s', (previous, current) => {
    expect(() => updateMastery(previous, current, false)).toThrow(/between/i);
  });
});
