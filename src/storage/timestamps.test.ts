import {
  compareRfc3339Timestamps,
  normalizeRfc3339Timestamp,
} from './timestamps';

describe('RFC3339 timestamps', () => {
  it('normalizes an offset while preserving arbitrary fractional precision', () => {
    expect(
      normalizeRfc3339Timestamp(
        '2026-07-13T10:00:00.123456789+02:00',
        'timestamp',
      ),
    ).toBe('2026-07-13T08:00:00.123456789Z');
  });

  it('compares fractions exactly beyond JavaScript millisecond precision', () => {
    expect(
      compareRfc3339Timestamps(
        '2026-07-13T08:00:00.0009Z',
        '2026-07-13T08:00:00.0001Z',
      ),
    ).toBeGreaterThan(0);
  });

  it.each(['9999-12-31T23:59:59-23:59', '0000-01-01T00:00:00+23:59'])(
    'rejects an offset whose canonical UTC year is out of range: %s',
    (value) => {
      expect(() => normalizeRfc3339Timestamp(value, 'timestamp')).toThrow(
        /timestamp/i,
      );
    },
  );
});
