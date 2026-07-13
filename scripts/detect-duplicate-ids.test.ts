import { describe, expect, it } from 'vitest';

import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { detectDuplicateIds } from './detect-duplicate-ids';

describe('detectDuplicateIds', () => {
  it('detects node, option, and evidence IDs reused by different cases', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();
    second.id = 'second-case';
    second.slug = 'second-case';

    const issues = detectDuplicateIds([
      { file: 'content/cases/z.json', case: second },
      { file: 'content/cases/a.json', case: first },
    ]);

    expect(issues.map(({ kind }) => kind)).toEqual([
      'evidence',
      'node',
      'option',
      'option',
    ]);
    expect(
      issues.every(({ files }) => files[0] === 'content/cases/a.json'),
    ).toBe(true);
  });

  it('allows one case to retain stable entity IDs across content versions', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();
    second.metadata.version = 2;
    second.title = 'Updated copy';

    expect(
      detectDuplicateIds([
        { file: 'content/cases/case-minimal.v1.json', case: first },
        { file: 'content/cases/case-minimal.v2.json', case: second },
      ]),
    ).toEqual([]);
  });

  it('rejects duplicate case ID and version pairs', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();

    expect(
      detectDuplicateIds([
        { file: 'content/cases/a.json', case: first },
        { file: 'content/cases/b.json', case: second },
      ]),
    ).toEqual([
      expect.objectContaining({
        kind: 'case',
        id: `${first.id}@${first.metadata.version}`,
      }),
    ]);
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
