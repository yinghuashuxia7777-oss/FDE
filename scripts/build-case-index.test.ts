import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';

import { describe, expect, it } from 'vitest';

import type { FdeCase } from '../src/domain/cases/types';
import type { FoundationKnowledge } from '../src/domain/foundation/types';
import type { ContentPack } from '../src/content/contracts';
import { FoundationKnowledgeSchema } from '../src/content/foundation-schema';
import { ContentManifestSchema } from '../src/content/schemas';
import { validateAndNormalizeContentPack } from '../src/content/validate-content-pack';
import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { PROJECT_ROOT, readContentBundleSources } from './files';
import {
  buildValidatedContentArtifacts,
  buildValidatedCaseIndex,
  emitCaseIndex,
  findContentArtifactDrift,
  generateCaseIndex,
  generateFoundationJsonSchema,
} from './build-case-index';

function withStatus(
  id: string,
  status: FdeCase['status'],
): ReturnType<typeof createMinimalValidCase> {
  const candidate = createMinimalValidCase();
  candidate.id = id;
  candidate.slug = id;
  candidate.status = status;
  if (
    status === 'reviewed' ||
    status === 'published' ||
    status === 'deprecated'
  ) {
    candidate.metadata.reviewer = 'Reviewer';
    candidate.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';
  }
  return candidate;
}

const foundationFixture: FoundationKnowledge = {
  schemaVersion: 1,
  id: 'http-request-basics',
  type: 'foundation',
  title: 'HTTP request basics',
  domain: 'network',
  track: 'network-api',
  skills: ['evidence-assessment'],
  level: 'beginner',
  order: 1,
  estimatedMinutes: 8,
  content: {
    simpleExplanation: 'An HTTP request asks a server for a resource.',
    analogy: 'It is like ordering an item from a catalog.',
    technicalExplanation: 'A request carries a method, target, and headers.',
    example: 'GET /health asks for the health resource.',
    commonMistakes: 'Do not assume every successful transport is HTTP 200.',
  },
  relatedCases: ['case-active'],
};

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

describe('deterministic content artifacts', () => {
  it('generates a deterministic Foundation index ordered by learning order and ID', async () => {
    const { generateFoundationIndex } = await import('./build-case-index');
    const later = {
      file: 'content\\foundation\\network\\later.json',
      foundation: {
        ...foundationFixture,
        id: 'later-foundation',
        order: 2,
      },
    };
    const sameOrderLaterId = {
      file: 'content/foundation/network/z.json',
      foundation: {
        ...foundationFixture,
        id: 'z-foundation',
      },
    };
    const first = {
      file: 'content/foundation/network/a.json',
      foundation: {
        ...foundationFixture,
        id: 'a-foundation',
      },
    };

    const generated = generateFoundationIndex([later, sameOrderLaterId, first]);

    expect(generated.indexOf("id: 'a-foundation'")).toBeLessThan(
      generated.indexOf("id: 'z-foundation'"),
    );
    expect(generated.indexOf("id: 'z-foundation'")).toBeLessThan(
      generated.indexOf("id: 'later-foundation'"),
    );
    expect(generated).toContain(
      "path: 'content/foundation/network/later.json'",
    );
    expect(generated).toContain(
      "load: () => import('../../content/foundation/network/later.json')",
    );
    expect(generated).toContain(
      "import type { FoundationKnowledge, FoundationTrack } from '../domain/foundation/types'",
    );
  });

  it('keeps representable Foundation authoring constraints aligned with runtime validation', () => {
    const artifact = generateFoundationJsonSchema();
    const validatorArtifact = structuredClone(artifact);
    delete validatorArtifact.$schema;
    const validateAuthoring = new Ajv({
      allErrors: true,
      schemaId: 'auto',
      validateSchema: false,
    }).compile(validatorArtifact);
    const properties = (
      artifact as {
        properties: {
          title: { pattern?: string };
          skills: { uniqueItems?: boolean };
          relatedCases: { uniqueItems?: boolean };
          content: {
            properties: Record<string, { pattern?: string }>;
          };
        };
      }
    ).properties;
    const invalidCandidates = [
      {
        ...foundationFixture,
        content: {
          ...foundationFixture.content,
          simpleExplanation: '   \n\t',
        },
      },
      {
        ...foundationFixture,
        title: '[Run](JaVaScRiPt:alert(document.cookie))',
      },
      {
        ...foundationFixture,
        skills: ['evidence-assessment', 'evidence-assessment'],
      },
      {
        ...foundationFixture,
        relatedCases: ['case-active', 'case-active'],
      },
    ];

    expect(properties.title.pattern).toBeTruthy();
    expect(
      Object.values(properties.content.properties).every(
        ({ pattern }) => pattern === properties.title.pattern,
      ),
    ).toBe(true);
    expect(properties.skills.uniqueItems).toBe(true);
    expect(properties.relatedCases.uniqueItems).toBe(true);
    for (const candidate of invalidCandidates) {
      expect(FoundationKnowledgeSchema.safeParse(candidate).success).toBe(
        false,
      );
      expect(validateAuthoring(candidate)).toBe(false);
    }
    expect(validateAuthoring(foundationFixture)).toBe(true);
  });

  it('generates a manifest, loader map, coverage report, hashes, and schemas deterministically', async () => {
    const module = await import('./build-case-index');
    expect(module).toHaveProperty('generateContentArtifacts');
    const generateContentArtifacts = Reflect.get(
      module,
      'generateContentArtifacts',
    ) as (input: unknown) => {
      files: Record<string, string>;
      manifest: {
        activePublishedCaseCount: number;
        caseVersionCount: number;
        activeCaseIds: string[];
        cases: { contentHash: string }[];
        checksum: string;
      };
    };
    const domain = {
      schemaVersion: 1 as const,
      id: 'diagnostics',
      label: 'Diagnostics',
      description: 'Evidence-led diagnosis.',
      status: 'active' as const,
    };
    const skill = {
      schemaVersion: 1 as const,
      id: 'evidence-assessment',
      domainId: domain.id,
      label: 'Evidence assessment',
      description: 'Assess available evidence.',
      status: 'active' as const,
    };
    const deprecatedDomain = {
      ...domain,
      id: 'legacy-diagnostics',
      label: 'Legacy diagnostics',
      status: 'deprecated' as const,
    };
    const candidate = withStatus('case-active', 'published');
    candidate.domains = [domain.id];
    candidate.skills = [skill.id];
    candidate.nodes[0].skillWeights = { [skill.id]: 1 };
    const input = {
      config: {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [{ caseId: candidate.id, version: 1 }],
      },
      cases: [
        { file: 'content/cases/beginner/case-active.json', case: candidate },
      ],
      domains: [
        { file: 'content/domains/diagnostics.json', value: domain },
        {
          file: 'content/domains/legacy-diagnostics.json',
          value: deprecatedDomain,
        },
      ],
      skills: [
        { file: 'content/skills/evidence-assessment.json', value: skill },
      ],
      foundations: [
        {
          file: 'content/foundation/network/http-request-basics.json',
          foundation: foundationFixture,
        },
      ],
      coverage: {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      },
    };

    const first = generateContentArtifacts(input);
    const second = generateContentArtifacts({
      ...input,
      config: { ...input.config },
      cases: [...input.cases],
      domains: [...input.domains],
      skills: [...input.skills],
      foundations: [...input.foundations],
    });

    const withoutFoundation = generateContentArtifacts({
      ...input,
      foundations: [],
    });

    expect(second.files).toEqual(first.files);
    expect(second.manifest).toEqual(first.manifest);
    expect(first.manifest).toEqual(withoutFoundation.manifest);
    expect(first.manifest.checksum).toBe(withoutFoundation.manifest.checksum);
    expect(first.files['content/manifests/content-manifest.json']).toBe(
      withoutFoundation.files['content/manifests/content-manifest.json'],
    );
    expect(first.manifest).toMatchObject({
      activePublishedCaseCount: 1,
      caseVersionCount: 1,
      activeCaseIds: [candidate.id],
      domainCaseCounts: {
        [domain.id]: 1,
        [deprecatedDomain.id]: 0,
      },
    });
    expect(first.manifest.cases[0].contentHash).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(first.manifest.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(Object.keys(first.files).sort()).toEqual([
      'content/manifests/content-manifest.json',
      'content/manifests/coverage-report.json',
      'content/schemas/content-manifest.schema.json',
      'content/schemas/content-pack.schema.json',
      'content/schemas/coverage.schema.json',
      'content/schemas/domain.schema.json',
      'content/schemas/fde-case.schema.json',
      'content/schemas/foundation.schema.json',
      'content/schemas/skill.schema.json',
      'src/generated/content-index.ts',
      'src/generated/foundation-index.ts',
    ]);
    expect(first.files['src/generated/content-index.ts']).toContain(
      "import('../../content/cases/beginner/case-active.json')",
    );
    expect(first.files['src/generated/foundation-index.ts']).toContain(
      "import('../../content/foundation/network/http-request-basics.json')",
    );
    expect(
      JSON.parse(first.files['content/schemas/foundation.schema.json'] ?? ''),
    ).toMatchObject({
      $id: 'https://fde-arena.local/schemas/foundation.schema.json',
      title: 'FDE Arena Foundation Knowledge',
    });
    expect(
      findContentArtifactDrift(first.files, (path) =>
        path === 'content/schemas/foundation.schema.json' ||
        path === 'src/generated/foundation-index.ts'
          ? null
          : (first.files[path] ?? null),
      ),
    ).toEqual([
      'content/schemas/foundation.schema.json',
      'src/generated/foundation-index.ts',
    ]);

    await expect(
      validateAndNormalizeContentPack({
        formatVersion: 1,
        manifest: first.manifest,
        cases: input.cases.map(({ case: content }) => content),
        domains: input.domains.map(({ value }) => value),
        skills: input.skills.map(({ value }) => value),
        coverage: input.coverage,
      } as ContentPack),
    ).resolves.toMatchObject({
      manifest: {
        domainCaseCounts: {
          [domain.id]: 1,
          [deprecatedDomain.id]: 0,
        },
      },
    });

    const versionTwo = structuredClone(candidate);
    versionTwo.metadata.version = 2;
    expect(() =>
      generateContentArtifacts({
        ...input,
        config: {
          ...input.config,
          activeCases: [
            { caseId: candidate.id, version: 1 },
            { caseId: candidate.id, version: 2 },
          ],
        },
        cases: [
          ...input.cases,
          {
            file: 'content/cases/beginner/case-active.v2.json',
            case: versionTwo,
          },
        ],
      }),
    ).toThrow(/activeCaseIds|unique/i);
  });

  it('reports byte drift without writing generated artifacts', async () => {
    const module = await import('./build-case-index');
    expect(module).toHaveProperty('findContentArtifactDrift');
    const { findContentArtifactDrift } = module;

    expect(
      findContentArtifactDrift(
        { 'a.json': 'expected', 'b.json': 'same' },
        (path) => (path === 'a.json' ? 'changed' : 'same'),
      ),
    ).toEqual(['a.json']);
  });

  it('keeps the committed manifest identical to the actual content case set', () => {
    const result = buildValidatedContentArtifacts(
      readContentBundleSources(PROJECT_ROOT),
    );
    expect(result.issues).toEqual([]);
    expect(result.artifacts).not.toBeNull();

    const committedManifest = ContentManifestSchema.parse(
      JSON.parse(
        readFileSync(
          resolve(PROJECT_ROOT, 'content/manifests/content-manifest.json'),
          'utf8',
        ),
      ) as unknown,
    );
    const actualManifest = result.artifacts!.manifest;
    expect(committedManifest.cases).toEqual(actualManifest.cases);
    expect(committedManifest.allCaseIds).toEqual(actualManifest.allCaseIds);
    expect(committedManifest.caseVersionCount).toBe(
      actualManifest.cases.length,
    );
  });
});
