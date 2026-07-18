import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { relative, resolve, sep } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { SkillDefinition } from '../src/content/contracts';
import type { SkillRubricCatalog } from '../src/domain/skills/rubric-types';
import type { SkillGraphCatalog } from '../src/domain/skills/types';
import { PROJECT_ROOT } from './files';
import { createSkillGraphExplorerReport } from './explore-skill-graph';

const catalogFixture: SkillGraphCatalog = {
  schemaVersion: 1,
  catalogVersion: '1.0.0',
  status: 'draft',
  expectedLeafCount: 70,
  presentationNodes: [
    {
      id: 'capability.software',
      name: 'Software',
      description: 'Software capability.',
    },
  ],
  leaves: [
    {
      schemaVersion: 1,
      id: 'eng.runtime-debugging',
      name: 'Runtime debugging',
      description: 'Diagnose runtime failures.',
      parentSkillId: 'software.foundations',
      capabilityLevel: 0,
      status: 'active',
      evidenceTypes: ['diagnosis'],
      activeRubricVersion: 1,
    },
  ],
  edges: [
    {
      id: 'edge.runtime-rollup',
      type: 'rolls-up-to',
      leafSkillId: 'eng.runtime-debugging',
      legacySkillId: 'software.foundations',
      canonical: true,
    },
  ],
};

const legacySkillFixture: SkillDefinition = {
  schemaVersion: 1,
  id: 'software.foundations',
  domainId: 'software-engineering',
  label: 'Software foundations',
  description: 'Software foundations.',
  status: 'active',
};

const secondLegacySkillFixture: SkillDefinition = {
  schemaVersion: 1,
  id: 'api.integration',
  domainId: 'integration-engineering',
  label: 'API integration',
  description: 'API integration.',
  status: 'active',
};

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(resolve(PROJECT_ROOT, '.tmp-skill-explorer-'));
  temporaryDirectories.push(directory);
  return directory;
}

function projectPath(path: string): string {
  return relative(PROJECT_ROOT, path).split(sep).join('/');
}

function rubricCatalogFixture(
  rubricSetVersion: string,
  skillCatalogVersion: string,
  status: 'draft' | 'reviewed' | 'published',
): SkillRubricCatalog {
  return {
    schemaVersion: 1,
    rubricSetVersion,
    skillCatalogVersion,
    status,
    rubrics: [
      {
        schemaVersion: 1,
        id: 'rubric.eng.runtime-debugging',
        skillId: 'eng.runtime-debugging',
        version: 1,
        status,
        title: 'Runtime debugging rubric',
        evidenceTypes: ['diagnosis'],
        criteria: [
          {
            criterionId: 'criterion.runtime-debugging',
            description: 'Evaluates runtime debugging.',
            evidenceTypes: ['diagnosis'],
            weight: 1,
            critical: false,
          },
        ],
        thresholds: { learning: 1, competent: 70, proficient: 85 },
        metadata: {
          createdAt: '2026-07-17T00:00:00.000Z',
          reviewedAt: status === 'draft' ? null : '2026-07-17T01:00:00.000Z',
          author: 'FDE Arena',
          reviewer: status === 'draft' ? null : 'reviewer.one',
        },
      },
    ],
  };
}

function runExplorer(args: readonly string[]) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/explore-skill-graph.ts', ...args],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('read-only Skill Graph Explorer CLI', () => {
  it('rejects duplicate catalogVersion candidates instead of selecting by file name', () => {
    const input = temporaryDirectory();
    const firstRelease = resolve(input, 'release-a');
    const secondRelease = resolve(input, 'release-b');
    mkdirSync(firstRelease);
    mkdirSync(secondRelease);
    const catalog = JSON.stringify(catalogFixture);
    writeFileSync(resolve(firstRelease, 'catalog.json'), catalog, 'utf8');
    writeFileSync(resolve(secondRelease, 'catalog.json'), catalog, 'utf8');

    const result = runExplorer([
      '--input',
      projectPath(input),
      '--format',
      'json',
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    const report = JSON.parse(result.stderr) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    expect(report).toMatchObject({
      ok: false,
      error: {
        code: 'cli_error',
      },
    });
    expect(report.error.message).toContain(
      'Duplicate skill catalog version: 1.0.0',
    );
  });

  it('rejects multiple canonical roll-up parents before building the tree', () => {
    const catalog = structuredClone(catalogFixture);
    catalog.edges.push({
      id: 'edge.runtime-second-rollup',
      type: 'rolls-up-to',
      leafSkillId: 'eng.runtime-debugging',
      legacySkillId: 'api.integration',
      canonical: true,
    });

    expect(() =>
      createSkillGraphExplorerReport(
        catalog,
        [legacySkillFixture, secondLegacySkillFixture],
        [rubricCatalogFixture('1.0.0', '1.0.0', 'draft')],
      ),
    ).toThrow('multiple_canonical_parents');
  });

  it('rejects multiple canonical presentation targets before building the tree', () => {
    const catalog = structuredClone(catalogFixture);
    catalog.presentationNodes.push({
      id: 'capability.integration',
      name: 'Integration',
      description: 'Integration capability.',
    });
    catalog.edges.push(
      {
        id: 'edge.software-presentation',
        type: 'presents-as',
        legacySkillId: 'software.foundations',
        presentationSkillId: 'capability.software',
        canonical: true,
      },
      {
        id: 'edge.integration-presentation',
        type: 'presents-as',
        legacySkillId: 'software.foundations',
        presentationSkillId: 'capability.integration',
        canonical: true,
      },
    );

    expect(() =>
      createSkillGraphExplorerReport(
        catalog,
        [legacySkillFixture],
        [rubricCatalogFixture('1.0.0', '1.0.0', 'draft')],
      ),
    ).toThrow('multiple_canonical_presentation_targets');
  });

  it('rejects prerequisite cycles before building the tree', () => {
    const catalog = structuredClone(catalogFixture);
    catalog.leaves.push({
      schemaVersion: 1,
      id: 'eng.testing-fundamentals',
      name: 'Testing fundamentals',
      description: 'Build reliable automated tests.',
      parentSkillId: 'software.foundations',
      capabilityLevel: 1,
      status: 'active',
      evidenceTypes: ['test-report'],
      activeRubricVersion: null,
    });
    catalog.edges.push(
      {
        id: 'edge.testing-rollup',
        type: 'rolls-up-to',
        leafSkillId: 'eng.testing-fundamentals',
        legacySkillId: 'software.foundations',
        canonical: true,
      },
      {
        id: 'edge.runtime-before-testing',
        type: 'prerequisite',
        prerequisiteSkillId: 'eng.runtime-debugging',
        dependentSkillId: 'eng.testing-fundamentals',
      },
      {
        id: 'edge.testing-before-runtime',
        type: 'prerequisite',
        prerequisiteSkillId: 'eng.testing-fundamentals',
        dependentSkillId: 'eng.runtime-debugging',
      },
    );

    expect(() =>
      createSkillGraphExplorerReport(
        catalog,
        [legacySkillFixture],
        [rubricCatalogFixture('1.0.0', '1.0.0', 'draft')],
      ),
    ).toThrow('prerequisite_cycle');
  });

  it('rejects missing edge references before building the tree', () => {
    const catalog = structuredClone(catalogFixture);
    catalog.edges.push({
      id: 'edge.missing-before-runtime',
      type: 'prerequisite',
      prerequisiteSkillId: 'eng.missing-skill',
      dependentSkillId: 'eng.runtime-debugging',
    });

    expect(() =>
      createSkillGraphExplorerReport(
        catalog,
        [legacySkillFixture],
        [rubricCatalogFixture('1.0.0', '1.0.0', 'draft')],
      ),
    ).toThrow('missing_edge_target');
  });

  it('uses rubrics only from the selected catalog release', () => {
    const report = createSkillGraphExplorerReport(
      catalogFixture,
      [legacySkillFixture],
      [
        rubricCatalogFixture('2.0.0', '2.0.0', 'published'),
        rubricCatalogFixture('1.0.0', '1.0.0', 'draft'),
      ],
    );

    expect(report.legacySkills[0].leaves[0].rubric).toEqual({
      version: 1,
      status: 'draft',
    });
  });

  it('fails when multiple rubric sets target the selected catalog', () => {
    expect(() =>
      createSkillGraphExplorerReport(
        catalogFixture,
        [legacySkillFixture],
        [
          rubricCatalogFixture('1.0.0', '1.0.0', 'draft'),
          rubricCatalogFixture('1.0.1', '1.0.0', 'reviewed'),
        ],
      ),
    ).toThrow('Multiple rubric catalogs match selected skill catalog: 1.0.0');
  });

  it('does not combine disjoint rubric sets into one Explorer view', () => {
    const first = rubricCatalogFixture('1.0.0', '1.0.0', 'draft');
    const second = rubricCatalogFixture('1.0.1', '1.0.0', 'reviewed');
    second.rubrics = [];

    expect(() =>
      createSkillGraphExplorerReport(
        catalogFixture,
        [legacySkillFixture],
        [first, second],
      ),
    ).toThrow('Multiple rubric catalogs match selected skill catalog: 1.0.0');
  });

  it('renders a deterministic JSON tree from explicit graph edges', () => {
    const first = runExplorer(['--format', 'json']);
    const second = runExplorer(['--format', 'json']);

    expect(first.status).toBe(0);
    expect(first.stderr).toBe('');
    expect(second.stdout).toBe(first.stdout);

    const report = JSON.parse(first.stdout) as {
      ok: boolean;
      catalog: {
        version: string;
        status: string;
        definedLeafCount: number;
        expectedLeafCount: number;
      };
      legacySkills: {
        id: string;
        leaves: {
          id: string;
          prerequisites: string[];
          rubric: { status: string };
        }[];
      }[];
    };
    expect(report).toMatchObject({
      ok: true,
      catalog: {
        version: '0.2.0',
        status: 'reviewed',
        definedLeafCount: 40,
        expectedLeafCount: 40,
      },
    });
    expect(
      report.legacySkills
        .find(({ id }) => id === 'agents.evaluation')
        ?.leaves.find(({ id }) => id === 'ai.llm-evaluation'),
    ).toMatchObject({ rubric: { status: 'draft' } });
    expect(
      report.legacySkills
        .find(({ id }) => id === 'rag.search')
        ?.leaves.find(({ id }) => id === 'rag.retrieval')?.prerequisites,
    ).toEqual([]);
  });

  it('renders the required Legacy -> Leaf -> prerequisite -> rubric tree', () => {
    const result = runExplorer(['--format', 'text']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('agents.evaluation');
    expect(result.stdout).toContain('ai.llm-evaluation [L2, reviewed]');
    expect(result.stdout).toContain('rubric: draft v1');
    expect(result.stdout).toContain('rag.retrieval [L3, reviewed]');
  });

  it('rejects unsupported arguments without reading or writing user data', () => {
    const result = runExplorer(['--format', 'html']);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: {
        code: 'cli_error',
        message: 'Unsupported format: html',
      },
    });
  });
});
