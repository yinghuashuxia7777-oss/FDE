import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { FdeCase } from '../src/domain/cases/types';
import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { PROJECT_ROOT } from './files';
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
    expect(generated).toContain(
      "import type { FdeCase } from '../domain/cases/types'",
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

  it('computes type and content imports relative to a custom output file', () => {
    const generated = generateCaseIndex(
      [
        {
          file: 'content/cases/a.json',
          case: withStatus('case-a', 'published'),
        },
      ],
      'reports\\generated\\case-index.ts',
    );

    expect(generated).toContain(
      "import type { FdeCase } from '../../src/domain/cases/types'",
    );
    expect(generated).toContain(
      "load: () => import('../../content/cases/a.json')",
    );
  });

  it('writes a non-empty custom index whose lazy loader resolves in Vitest', async () => {
    const temporaryRoot = mkdtempSync(
      resolve(PROJECT_ROOT, '.tmp-index-import-'),
    );
    try {
      const caseFile = resolve(temporaryRoot, 'content', 'case-a.json');
      const indexFile = resolve(
        temporaryRoot,
        'reports',
        'generated',
        'case-index.ts',
      );
      mkdirSync(resolve(caseFile, '..'), { recursive: true });
      mkdirSync(resolve(indexFile, '..'), { recursive: true });
      const candidate = withStatus('case-a', 'published');
      writeFileSync(caseFile, JSON.stringify(candidate), 'utf8');

      const projectFile = (file: string) =>
        relative(PROJECT_ROOT, file).split(sep).join('/');
      writeFileSync(
        indexFile,
        generateCaseIndex(
          [{ file: projectFile(caseFile), case: candidate }],
          projectFile(indexFile),
        ),
        'utf8',
      );

      const generatedModule = (await import(
        /* @vite-ignore */ `${pathToFileURL(indexFile).href}?test=${Date.now()}`
      )) as {
        caseIndex: readonly {
          id: string;
          load: () => Promise<{ default: FdeCase }>;
        }[];
      };
      expect(generatedModule.caseIndex.map(({ id }) => id)).toEqual(['case-a']);
      await expect(generatedModule.caseIndex[0].load()).resolves.toMatchObject({
        default: { id: 'case-a' },
      });
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
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

  it('refuses to build when cross-domain coverage is below 40%', () => {
    const candidate = withStatus('case-low-coverage', 'published');
    candidate.level = 'intermediate';
    candidate.domains = ['one-domain'];

    const result = buildValidatedCaseIndex([
      {
        file: 'content/cases/low-coverage.json',
        text: JSON.stringify(candidate),
      },
    ]);

    expect(result.content).toBeNull();
    expect(result.issues.map(({ code }) => code)).toContain(
      'insufficient_cross_domain_ratio',
    );
  });

  it('refuses to build when a deprecated case appears in indexed IDs', () => {
    const candidate = withStatus('case-deprecated', 'deprecated');

    const result = buildValidatedCaseIndex(
      [
        {
          file: 'content/cases/deprecated.json',
          text: JSON.stringify(candidate),
        },
      ],
      { indexedCaseIds: [candidate.id] },
    );

    expect(result.content).toBeNull();
    expect(result.issues.map(({ code }) => code)).toContain(
      'deprecated_in_index',
    );
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
