import { describe, expect, it } from 'vitest';

import { parseCliArgs } from './cli';

describe('parseCliArgs', () => {
  it('parses the supported bounded batch options deterministically', () => {
    expect(
      parseCliArgs(
        [
          '--dry-run',
          '--limit',
          '3',
          '--input',
          'content/cases',
          '--output',
          'report.json',
          '--skip-existing',
        ],
        {
          dryRun: true,
          limit: true,
          input: true,
          output: true,
          skipExisting: true,
        },
      ),
    ).toEqual({
      dryRun: true,
      input: 'content/cases',
      limit: 3,
      output: 'report.json',
      skipExisting: true,
    });
  });

  it.each([
    [['--wat'], 'Unknown option: --wat'],
    [['--limit', '-1'], '--limit must be a non-negative integer'],
    [['--limit', '1.5'], '--limit must be a non-negative integer'],
    [['--limit'], '--limit requires a value'],
    [['--skip-existing'], 'Unsupported option: --skip-existing'],
  ])('rejects invalid arguments %#', (args, message) => {
    expect(() =>
      parseCliArgs(args, {
        dryRun: true,
        limit: true,
        input: true,
        output: true,
      }),
    ).toThrow(message);
  });
});
