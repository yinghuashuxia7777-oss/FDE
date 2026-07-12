import { describe, expect, it } from 'vitest';

import type { FdeCase } from '../src/domain/cases/types';
import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import {
  buildValidatedCaseIndex,
  emitCaseIndex,
  generateCaseIndex,
} from './build-case-index';

function withStatus(
  id: string,
  status: FdeCase['status'],
): ReturnType<typeof createMinimalValidCase> {
  const candidate = createMinimalValidCase();
  candidate.id = id;
  candidate.slug = id;
  candidate.status = status;
  if (status === 'published') {
    candidate.metadata.reviewer = 'Reviewer';
    candidate.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';
  }
  return candidate;
}

describe('generateCaseIndex', () => {
  it('generates a deterministic published-only index sorted by case ID', () => {
    const generated = generateCaseIndex([
      {
        file: 'content\\cases\\z.json',
        case: withStatus('case-z', 'published'),
      },
      {
        file: 'content/cases/draft.json',
        case: withStatus('case-draft', 'draft'),
      },
      {
        file: 'content/cases/a.json',
        case: withStatus('case-a', 'published'),
      },
      {
        file: 'content/cases/old.json',
        case: withStatus('case-old', 'deprecated'),
      },
    ]);

    expect(generated).not.toContain('case-draft');
    expect(generated).not.toContain('case-old');
    expect(generated.indexOf('case-a')).toBeLessThan(
      generated.indexOf('case-z'),
    );
    expect(generated).toContain(
      "load: () => import('../../content/cases/a.json')",
    );
    expect(generated).toContain(
      "load: () => import('../../content/cases/z.json')",
    );
    expect(generateCaseIndex([])).toMatchInlineSnapshot(`
      "import type { FdeCase } from '../domain/cases/types';

      export interface CaseIndexEntry {
        readonly id: string;
        readonly slug: string;
        readonly title: string;
        readonly summary: string;
        readonly level: FdeCase['level'];
        readonly estimatedMinutes: number;
        readonly domains: readonly string[];
        readonly skills: readonly string[];
        readonly status: 'published';
        readonly version: number;
        readonly load: () => Promise<{ default: FdeCase }>;
      }

      export const caseIndex: readonly CaseIndexEntry[] = [];
      "
    `);
  });

  it('refuses to build when content or graph checks fail', () => {
    const invalid = withStatus('case-invalid', 'published');
    invalid.nodes[0].branches = [
      { key: 'missing', nextNodeId: 'missing-node' },
    ];

    const result = buildValidatedCaseIndex([
      { file: 'content/cases/invalid.json', text: JSON.stringify(invalid) },
    ]);

    expect(result.content).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('does not write during dry-run or when skip-existing finds output', () => {
    const writes: string[] = [];
    const adapter = {
      exists: () => true,
      write: (_output: string, content: string) => writes.push(content),
    };

    expect(
      emitCaseIndex(
        'generated',
        {
          output: 'src/generated/case-index.ts',
          dryRun: true,
          skipExisting: false,
        },
        adapter,
      ),
    ).toMatchObject({
      written: false,
      reason: 'dry-run',
      content: 'generated',
    });
    expect(
      emitCaseIndex(
        'generated',
        {
          output: 'src/generated/case-index.ts',
          dryRun: false,
          skipExisting: true,
        },
        adapter,
      ),
    ).toMatchObject({ written: false, reason: 'exists', content: 'generated' });
    expect(writes).toEqual([]);
  });
});
