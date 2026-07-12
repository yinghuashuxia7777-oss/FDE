import { describe, expect, it } from 'vitest';

import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { validateContentSources } from './validate-content';

function source(file: string, value: unknown) {
  return { file, text: JSON.stringify(value) };
}

describe('validateContentSources', () => {
  it('parses valid JSON with the canonical FdeCaseSchema', () => {
    const result = validateContentSources([
      source('content/cases/valid.json', createMinimalValidCase()),
    ]);

    expect(result.filesChecked).toBe(1);
    expect(result.issues).toEqual([]);
    expect(result.cases).toHaveLength(1);
  });

  it('reports malformed JSON as a structured issue', () => {
    const result = validateContentSources([
      { file: 'content/cases/broken.json', text: '{"id":' },
    ]);

    expect(result.issues).toEqual([
      expect.objectContaining({
        file: 'content/cases/broken.json',
        path: [],
        code: 'invalid_json',
      }),
    ]);
  });

  it('reports incomplete schema paths', () => {
    const candidate = createMinimalValidCase() as unknown as Record<
      string,
      unknown
    >;
    Reflect.deleteProperty(candidate, 'summary');

    const result = validateContentSources([
      source('content/cases/incomplete.json', candidate),
    ]);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/cases/incomplete.json',
          path: ['summary'],
          code: 'schema_invalid',
        }),
      ]),
    );
  });

  it('reports duplicate case IDs and slugs across files', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();

    const result = validateContentSources([
      source('content/cases/z.json', second),
      source('content/cases/a.json', first),
    ]);

    expect(result.issues.map(({ code }) => code)).toEqual([
      'duplicate_case_id',
      'duplicate_case_slug',
    ]);
    expect(
      result.issues.every(({ file }) => file === 'content/cases/z.json'),
    ).toBe(true);
  });
});
