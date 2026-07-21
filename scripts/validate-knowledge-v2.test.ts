import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import type { FdeCase } from '../src/domain/cases/types';
import type { ConceptKnowledge } from '../src/domain/concepts/types';
import type { FoundationKnowledge } from '../src/domain/foundation/types';
import { V2_PRESENTATION_TARGET_IDS } from '../src/domain/skills/types';
import { PROJECT_ROOT } from './files';
import { validateKnowledgeV2Sources } from './validate-knowledge-v2';

const legacySkillIds = [
  'agents.evaluation',
  'api.integration',
  'cloud.deployment',
  'customer.discovery',
  'data.engineering',
  'fde.adoption',
  'git.delivery',
  'llm.applications',
  'performance.scaling',
  'rag.search',
  'reliability.observability',
  'security.governance',
  'software.foundations',
  'systems.networking',
  'tuning.inference-deployment',
] as const;

const presentationTargetIds = V2_PRESENTATION_TARGET_IDS;

function publishedSidecarSources(
  targets: readonly string[] = presentationTargetIds,
) {
  const practices: { file: string; text: string }[] = [];
  const attributionMaps: { file: string; text: string }[] = [];
  const leaves = Array.from({ length: 70 }, (_, index) => ({
    schemaVersion: 1 as const,
    id: `leaf.skill-${index + 1}`,
    name: `Leaf skill ${index + 1}`,
    description: `Published leaf skill fixture ${index + 1}.`,
    parentSkillId: legacySkillIds[index % legacySkillIds.length],
    capabilityLevel: (index % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    status: 'active' as const,
    evidenceTypes: ['diagnosis'],
    activeRubricVersion: 1,
  }));
  const catalog = {
    schemaVersion: 1 as const,
    catalogVersion: '1.0.0',
    status: 'published' as const,
    expectedLeafCount: 70,
    presentationNodes: targets.map((id, index) => ({
      id,
      name: `Presentation ${index + 1}`,
      description: `Authoritative presentation target ${index + 1}.`,
    })),
    leaves,
    edges: [
      ...leaves.map((leaf, index) => ({
        id: `edge.leaf-${index + 1}-rollup`,
        type: 'rolls-up-to' as const,
        leafSkillId: leaf.id,
        legacySkillId: leaf.parentSkillId,
        canonical: true,
      })),
      ...legacySkillIds.map((legacySkillId, index) => ({
        id: `edge.legacy-${index + 1}-presentation`,
        type: 'presents-as' as const,
        legacySkillId,
        presentationSkillId: targets[index % targets.length],
        canonical: true,
      })),
    ],
  };
  const rubricCatalog = {
    schemaVersion: 1 as const,
    rubricSetVersion: '1.0.0',
    skillCatalogVersion: '1.0.0',
    status: 'published' as const,
    rubrics: leaves.map((leaf, index) => ({
      schemaVersion: 1 as const,
      id: `rubric.leaf.skill-${index + 1}`,
      skillId: leaf.id,
      version: 1,
      status: 'published' as const,
      title: `Leaf skill ${index + 1} evidence rubric`,
      evidenceTypes: ['diagnosis'],
      criteria: [
        {
          criterionId: `criterion.leaf.skill-${index + 1}`,
          description: `Evaluates evidence for leaf skill ${index + 1}.`,
          evidenceTypes: ['diagnosis'],
          weight: 1,
          critical: false,
        },
      ],
      thresholds: { learning: 1, competent: 70, proficient: 85 },
      metadata: {
        createdAt: '2026-07-17T00:00:00.000Z',
        reviewedAt: '2026-07-17T01:00:00.000Z',
        author: 'FDE Arena',
        reviewer: 'reviewer.one',
      },
    })),
  };

  return {
    legacySkills: legacySkillIds.map((id, index) => ({
      schemaVersion: 1 as const,
      id,
      domainId: `domain-${index + 1}`,
      label: `Legacy skill ${index + 1}`,
      description: `Legacy skill fixture ${index + 1}.`,
      status: 'active' as const,
    })),
    cases: [],
    foundations: [],
    concepts: [],
    skillCatalogs: [{ file: 'catalog.json', text: JSON.stringify(catalog) }],
    rubricCatalogs: [
      { file: 'rubrics.json', text: JSON.stringify(rubricCatalog) },
    ],
    practices,
    attributionMaps,
  };
}

function publishedPracticeFixture() {
  return {
    schemaVersion: 1,
    skillCatalogVersion: '1.0.0',
    rubricSetVersion: '1.0.0',
    id: 'practice.leaf-skill-one',
    version: 1,
    status: 'published',
    title: 'Diagnose the first leaf skill',
    summary: 'Produce bounded diagnostic evidence for the first leaf skill.',
    primaryConceptId: 'concept.fixture',
    foundationIds: ['foundation.fixture'],
    primaryLeafSkillId: 'leaf.skill-1',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    action: {
      id: 'action.diagnose-leaf-one',
      kind: 'diagnose',
      prompt: 'Choose the next diagnostic step.',
      stimulus: [
        {
          id: 'stimulus.fixture-log',
          type: 'log',
          content: 'request timed out after 3000ms',
        },
      ],
      responseContract: {
        type: 'single-choice',
        requiredFields: ['selectedOptionId'],
      },
      scored: true,
    },
    evaluation: {
      rubricRef: {
        rubricId: 'rubric.leaf.skill-1',
        skillId: 'leaf.skill-1',
        version: 1,
      },
      criterionIds: ['criterion.leaf.skill-1'],
      method: 'deterministic',
      answerContract: {
        expectedFields: { selectedOptionId: 'inspect-timeout' },
        scoring: { mode: 'exact-match', passingScore: 100 },
      },
    },
    evidenceOutputContract: {
      artifactType: 'diagnosis',
      requiredFields: ['selectedOptionId'],
      eligibilityRule: 'The answer must use the supplied timeout evidence.',
      sourceReferencePolicy: 'required',
      criticalFailurePolicy: 'Reject unsupported production mutation.',
    },
    feedback: {
      correct: 'The diagnostic step uses the observed evidence.',
      partial: 'The direction is useful but incomplete.',
      incorrect: 'The step does not diagnose the observed failure.',
      criticalFailure: 'Production mutation is not eligible evidence.',
    },
    metadata: {
      createdAt: '2026-07-17T00:00:00.000Z',
      reviewedAt: '2026-07-17T01:00:00.000Z',
      author: 'FDE Arena',
      reviewer: 'reviewer.one',
    },
  };
}

function approvedAttributionFixture() {
  return {
    schemaVersion: 1,
    skillCatalogVersion: '1.0.0',
    rubricSetVersion: '1.0.0',
    mapId: 'attribution.leaf-skill-one',
    mapVersion: 1,
    status: 'approved',
    entries: [
      {
        caseId: 'case.fixture',
        caseVersion: 1,
        nodeId: 'case.fixture-node-01',
        leafSkillId: 'leaf.skill-1',
        rubricVersion: 1,
        role: 'primary',
        evidenceType: 'diagnosis',
        rationale: 'The node evaluates diagnosis evidence.',
        reviewer: 'reviewer.one',
      },
    ],
  };
}

function withPublishedDownstream(
  sources: ReturnType<typeof publishedSidecarSources>,
) {
  return {
    ...sources,
    cases: [
      {
        id: 'case.fixture',
        metadata: { version: 1 },
        nodes: [{ id: 'case.fixture-node-01' }],
      } as FdeCase,
    ],
    foundations: [{ id: 'foundation.fixture' } as FoundationKnowledge],
    concepts: [{ id: 'concept.fixture' } as ConceptKnowledge],
    practices: [
      {
        file: 'practice.json',
        text: JSON.stringify(publishedPracticeFixture()),
      },
    ],
    attributionMaps: [
      {
        file: 'attribution.json',
        text: JSON.stringify(approvedAttributionFixture()),
      },
    ],
  };
}

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(resolve(PROJECT_ROOT, '.tmp-v2-validation-'));
  temporaryDirectories.push(directory);
  return directory;
}

function projectPath(path: string): string {
  return relative(PROJECT_ROOT, path).split(sep).join('/');
}

function runValidationCli(args: readonly string[] = []) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/validate-knowledge-v2.ts', ...args],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('Knowledge Architecture V2 validation CLI', () => {
  it('accepts one complete published sidecar through the aggregate validator', () => {
    const report = validateKnowledgeV2Sources(publishedSidecarSources());

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('rejects a published sidecar with a non-authoritative presentation target', () => {
    const wrongTargets: string[] = [...presentationTargetIds];
    wrongTargets[6] = 'capability.wrong-target';

    const report = validateKnowledgeV2Sources(
      publishedSidecarSources(wrongTargets),
    );

    expect(report.ok).toBe(false);
    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'invalid_presentation_node',
        'invalid_presentation_target_catalog',
      ]),
    );
  });

  it('does not borrow published rubric refs from another catalog release', () => {
    const sources = publishedSidecarSources();
    const rubricCatalog = JSON.parse(sources.rubricCatalogs[0].text) as {
      skillCatalogVersion: string;
    };
    rubricCatalog.skillCatalogVersion = '2.0.0';
    sources.rubricCatalogs[0].text = JSON.stringify(rubricCatalog);

    const report = validateKnowledgeV2Sources(sources);

    expect(report.issues.map(({ code }) => code)).toContain(
      'missing_published_rubric',
    );
  });

  it('does not assemble published rubric coverage across two rubric sets', () => {
    const sources = publishedSidecarSources();
    const firstSet = JSON.parse(sources.rubricCatalogs[0].text) as {
      rubricSetVersion: string;
      rubrics: unknown[];
    };
    const secondSet = structuredClone(firstSet);
    firstSet.rubrics = firstSet.rubrics.slice(0, 35);
    secondSet.rubricSetVersion = '1.0.1';
    secondSet.rubrics = secondSet.rubrics.slice(35);
    sources.rubricCatalogs[0].text = JSON.stringify(firstSet);
    sources.rubricCatalogs.push({
      file: 'rubrics-second-half.json',
      text: JSON.stringify(secondSet),
    });

    const report = validateKnowledgeV2Sources(sources);

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'ambiguous_published_rubric_catalog',
        'missing_published_rubric',
      ]),
    );
  });

  it('rejects duplicate catalogVersion and rubricSetVersion identities', () => {
    const sources = publishedSidecarSources();
    sources.skillCatalogs.push({
      file: 'catalog-duplicate.json',
      text: sources.skillCatalogs[0].text,
    });
    sources.rubricCatalogs.push({
      file: 'rubrics-duplicate.json',
      text: sources.rubricCatalogs[0].text,
    });

    const report = validateKnowledgeV2Sources(sources);

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'duplicate_skill_catalog_version',
        'duplicate_rubric_set_version',
      ]),
    );
  });

  it('rejects one rubric ID version reused by different skills globally', () => {
    const sources = publishedSidecarSources();
    const rubricCatalog = JSON.parse(sources.rubricCatalogs[0].text) as {
      rubrics: { id: string }[];
    };
    rubricCatalog.rubrics[1].id = rubricCatalog.rubrics[0].id;
    sources.rubricCatalogs[0].text = JSON.stringify(rubricCatalog);

    const report = validateKnowledgeV2Sources(sources);

    expect(report.issues.map(({ code }) => code)).toContain(
      'duplicate_rubric_id_version',
    );
  });

  it('reports duplicate skill identity across rubric sets for one exact catalog release', () => {
    const sources = publishedSidecarSources();
    const catalog = JSON.parse(sources.skillCatalogs[0].text) as {
      status: string;
    };
    catalog.status = 'draft';
    sources.skillCatalogs[0].text = JSON.stringify(catalog);
    const firstSet = JSON.parse(sources.rubricCatalogs[0].text) as {
      rubricSetVersion: string;
      status: string;
      rubrics: { id: string }[];
    };
    firstSet.status = 'draft';
    firstSet.rubrics = [firstSet.rubrics[0]];
    const secondSet = structuredClone(firstSet);
    secondSet.rubricSetVersion = '1.0.1';
    secondSet.rubrics[0].id = 'rubric.leaf.skill-1-alternate';
    sources.rubricCatalogs[0].text = JSON.stringify(firstSet);
    sources.rubricCatalogs.push({
      file: 'rubrics-alternate.json',
      text: JSON.stringify(secondSet),
    });

    const codes = validateKnowledgeV2Sources(sources).issues.map(
      ({ code }) => code,
    );

    expect(codes).toContain('duplicate_rubric_identity_across_sets');
    expect(codes).not.toContain('duplicate_rubric_id_version_across_sets');
  });

  it('reports duplicate rubric ID identity across sets for one exact catalog release', () => {
    const sources = publishedSidecarSources();
    const catalog = JSON.parse(sources.skillCatalogs[0].text) as {
      status: string;
    };
    catalog.status = 'draft';
    sources.skillCatalogs[0].text = JSON.stringify(catalog);
    const firstSet = JSON.parse(sources.rubricCatalogs[0].text) as {
      rubricSetVersion: string;
      status: string;
      rubrics: { id: string; skillId: string }[];
    };
    firstSet.status = 'draft';
    firstSet.rubrics = [firstSet.rubrics[0]];
    const secondSet = structuredClone(firstSet);
    secondSet.rubricSetVersion = '1.0.1';
    secondSet.rubrics[0].skillId = 'leaf.skill-2';
    sources.rubricCatalogs[0].text = JSON.stringify(firstSet);
    sources.rubricCatalogs.push({
      file: 'rubrics-reused-id.json',
      text: JSON.stringify(secondSet),
    });

    const codes = validateKnowledgeV2Sources(sources).issues.map(
      ({ code }) => code,
    );

    expect(codes).toContain('duplicate_rubric_id_version_across_sets');
    expect(codes).not.toContain('duplicate_rubric_identity_across_sets');
  });

  it('allows an unchanged rubric identity to be reused by a different catalog release', () => {
    const sources = publishedSidecarSources();
    const secondCatalog = JSON.parse(sources.skillCatalogs[0].text) as {
      catalogVersion: string;
    };
    secondCatalog.catalogVersion = '2.0.0';
    sources.skillCatalogs.push({
      file: 'catalog-v2.json',
      text: JSON.stringify(secondCatalog),
    });
    const secondRubricSet = JSON.parse(sources.rubricCatalogs[0].text) as {
      rubricSetVersion: string;
      skillCatalogVersion: string;
    };
    secondRubricSet.rubricSetVersion = '2.0.0';
    secondRubricSet.skillCatalogVersion = '2.0.0';
    sources.rubricCatalogs.push({
      file: 'rubrics-v2.json',
      text: JSON.stringify(secondRubricSet),
    });

    const codes = validateKnowledgeV2Sources(sources).issues.map(
      ({ code }) => code,
    );

    expect(codes).not.toContain('duplicate_rubric_identity_across_sets');
    expect(codes).not.toContain('duplicate_rubric_id_version_across_sets');
  });

  it('rejects a published rubric release bound to a draft skill catalog and blocks downstream reuse', () => {
    const sources = publishedSidecarSources();
    const catalog = JSON.parse(sources.skillCatalogs[0].text) as {
      status: string;
    };
    catalog.status = 'draft';
    sources.skillCatalogs[0].text = JSON.stringify(catalog);

    const report = validateKnowledgeV2Sources(withPublishedDownstream(sources));

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'rubrics.json',
          code: 'published_rubric_catalog_unpublished_skill_catalog',
        }),
        expect.objectContaining({
          file: 'practice.json',
          code: 'missing_rubric',
        }),
        expect.objectContaining({
          file: 'attribution.json',
          code: 'missing_rubric',
        }),
      ]),
    );
  });

  it.each([
    ['draft', 'draft'],
    ['draft', 'reviewed'],
    ['reviewed', 'draft'],
    ['reviewed', 'reviewed'],
  ] as const)(
    'does not supply published rubric items from a %s skill catalog and %s rubric catalog to published downstream content',
    (skillCatalogStatus, rubricCatalogStatus) => {
      const sources = publishedSidecarSources();
      const catalog = JSON.parse(sources.skillCatalogs[0].text) as {
        status: string;
      };
      catalog.status = skillCatalogStatus;
      sources.skillCatalogs[0].text = JSON.stringify(catalog);
      const rubricCatalog = JSON.parse(sources.rubricCatalogs[0].text) as {
        status: string;
      };
      rubricCatalog.status = rubricCatalogStatus;
      sources.rubricCatalogs[0].text = JSON.stringify(rubricCatalog);

      const report = validateKnowledgeV2Sources(
        withPublishedDownstream(sources),
      );

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            file: 'practice.json',
            code: 'missing_rubric',
          }),
          expect.objectContaining({
            file: 'attribution.json',
            code: 'missing_rubric',
          }),
        ]),
      );
    },
  );

  it('fails Practice and Attribution validation when releases are ambiguous', () => {
    const sources = publishedSidecarSources();
    const secondCatalog = JSON.parse(sources.skillCatalogs[0].text) as {
      catalogVersion: string;
    };
    secondCatalog.catalogVersion = '2.0.0';
    sources.skillCatalogs.push({
      file: 'catalog-v2.json',
      text: JSON.stringify(secondCatalog),
    });
    const secondRubrics = JSON.parse(sources.rubricCatalogs[0].text) as {
      rubricSetVersion: string;
      skillCatalogVersion: string;
    };
    secondRubrics.rubricSetVersion = '2.0.0';
    secondRubrics.skillCatalogVersion = '2.0.0';
    sources.rubricCatalogs.push({
      file: 'rubrics-v2.json',
      text: JSON.stringify(secondRubrics),
    });
    sources.practices.push({ file: 'practice.json', text: '{}' });
    sources.attributionMaps.push({
      file: 'attribution.json',
      text: JSON.stringify({
        schemaVersion: 1,
        mapId: 'attribution.empty-pilot',
        mapVersion: 1,
        status: 'draft',
        entries: [],
      }),
    });

    const report = validateKnowledgeV2Sources(sources);

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'ambiguous_practice_release_context',
        'ambiguous_attribution_release_context',
      ]),
    );
  });

  it('rejects an empty catalog input with a structured issue', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'empty-catalogs');
    mkdirSync(input);

    const result = runValidationCli(['--input', projectPath(input)]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stderr) as {
      ok: boolean;
      issues: { code: string }[];
    };
    expect(report.ok).toBe(false);
    expect(report.issues.map(({ code }) => code)).toContain(
      'missing_skill_catalog',
    );
  });

  it('rejects an explicit catalog path that does not exist', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'missing-catalogs');

    const result = runValidationCli(['--input', projectPath(input)]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stderr) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    expect(report.ok).toBe(false);
    expect(report.error.code).toBe('cli_error');
    expect(report.error.message).toContain('Input path does not exist');
  });

  it('ignores release sidecars in catalog directories and allows a direct catalog file', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'release');
    mkdirSync(input);
    const catalog = readFileSync(
      resolve(
        PROJECT_ROOT,
        'content/skill-graph/v2/releases/0.1.0/catalog.json',
      ),
      'utf8',
    );
    const catalogFile = resolve(input, 'catalog.json');
    writeFileSync(catalogFile, catalog, 'utf8');
    writeFileSync(
      resolve(input, 'release.json'),
      JSON.stringify({ schemaVersion: 1, kind: 'release-metadata' }),
      'utf8',
    );

    const directoryResult = runValidationCli(['--input', projectPath(input)]);
    const fileResult = runValidationCli(['--input', projectPath(catalogFile)]);

    expect(directoryResult.status).toBe(0);
    expect(JSON.parse(directoryResult.stdout)).toMatchObject({
      ok: true,
      checked: { skillCatalogs: 1 },
    });
    expect(fileResult.status).toBe(0);
  });

  it('validates the draft sidecar against the current v1 content snapshot', () => {
    const result = runValidationCli();
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      checked: {
        legacySkills: number;
        skillCatalogs: number;
        leafSkills: number;
        rubricCatalogs: number;
        practices: number;
        attributionMaps: number;
      };
      issues: unknown[];
    };

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(report).toMatchObject({
      ok: true,
      checked: {
        legacySkills: 15,
        skillCatalogs: 2,
        leafSkills: 47,
      },
      issues: [],
    });
    expect(report.checked.rubricCatalogs).toBeGreaterThanOrEqual(0);
    expect(report.checked.practices).toBeGreaterThanOrEqual(0);
    expect(report.checked.attributionMaps).toBeGreaterThanOrEqual(0);
  });

  it('returns deterministic structured issues and a non-zero exit', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'catalogs');
    mkdirSync(input);
    writeFileSync(resolve(input, 'catalog.json'), '{"schemaVersion":', 'utf8');

    const first = runValidationCli(['--input', projectPath(input)]);
    const second = runValidationCli(['--input', projectPath(input)]);

    expect(first.status).toBe(1);
    expect(first.stdout).toBe('');
    expect(second.stderr).toBe(first.stderr);
    const report = JSON.parse(first.stderr) as {
      ok: boolean;
      issues: { file: string; path: (string | number)[]; code: string }[];
    };
    expect(report.ok).toBe(false);
    expect(
      report.issues.some(
        (issue) =>
          issue.file.endsWith('catalog.json') &&
          issue.code === 'invalid_json' &&
          issue.path.length === 0,
      ),
    ).toBe(true);
  });

  it('supports a bounded catalog scan without weakening v1 cross-checks', () => {
    const result = runValidationCli(['--limit', '1']);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      checked: { legacySkills: 15, skillCatalogs: 1 },
    });
  });
});
