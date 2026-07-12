import { describe, expect, it } from 'vitest';

import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { detectDuplicateIds } from './detect-duplicate-ids';

describe('detectDuplicateIds', () => {
  it('detects case, node, option, and evidence IDs reused across cases', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();
    second.slug = 'second-case';

    const issues = detectDuplicateIds([
      { file: 'content/cases/z.json', case: second },
      { file: 'content/cases/a.json', case: first },
    ]);

    expect(issues.map(({ kind }) => kind)).toEqual([
      'case',
      'evidence',
      'node',
      'option',
      'option',
    ]);
    expect(
      issues.every(({ files }) => files[0] === 'content/cases/a.json'),
    ).toBe(true);
  });

  it('does not report IDs that are only reused within one case category set', () => {
    const candidate = createMinimalValidCase();

    expect(
      detectDuplicateIds([
        { file: 'content/cases/only.json', case: candidate },
      ]),
    ).toEqual([]);
  });
});
