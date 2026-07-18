import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_ROOT } from './files';
import {
  generateKnowledgeV2SchemaArtifacts,
  runBuildKnowledgeV2SchemasCli,
} from './build-knowledge-v2-schemas';

const schemaFiles = [
  'content/schemas/case-leaf-attribution.schema.json',
  'content/schemas/practice.schema.json',
  'content/schemas/skill-catalog.schema.json',
  'content/schemas/skill-rubric.schema.json',
] as const;

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(resolve(PROJECT_ROOT, '.tmp-v2-schemas-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  vi.restoreAllMocks();
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function runSchemaCli(args: readonly string[]) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/build-knowledge-v2-schemas.ts', ...args],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
}

describe('Knowledge Architecture V2 JSON Schema artifacts', () => {
  it('produces identical artifact bytes across independent generations', () => {
    const first = generateKnowledgeV2SchemaArtifacts();
    const second = generateKnowledgeV2SchemaArtifacts();

    expect(Object.keys(first).sort()).toEqual(schemaFiles);
    schemaFiles.forEach((file) => {
      expect(Buffer.from(first[file])).toEqual(Buffer.from(second[file]));
    });
  });

  it('returns non-zero --check for missing and outdated artifacts', () => {
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const missingRoot = temporaryDirectory();

    expect(runBuildKnowledgeV2SchemasCli(['--check'], missingRoot)).toBe(1);
    expect(stderr).toHaveBeenCalled();

    const outdatedRoot = temporaryDirectory();
    const artifacts = generateKnowledgeV2SchemaArtifacts();
    Object.entries(artifacts).forEach(([file, content]) => {
      const path = resolve(outdatedRoot, file);
      mkdirSync(resolve(path, '..'), { recursive: true });
      writeFileSync(path, content, 'utf8');
    });
    writeFileSync(
      resolve(outdatedRoot, schemaFiles[0]),
      '{"outdated":true}\n',
      'utf8',
    );

    expect(runBuildKnowledgeV2SchemasCli(['--check'], outdatedRoot)).toBe(1);
    const reports = stderr.mock.calls.map(([value]) => String(value));
    expect(reports.some((report) => report.includes('missing_artifact'))).toBe(
      true,
    );
    expect(reports.some((report) => report.includes('outdated_artifact'))).toBe(
      true,
    );
  });

  it('exposes bounded developer commands and gates the production build', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'knowledge:v2:validate':
        'node --import tsx scripts/validate-knowledge-v2.ts',
      'knowledge:v2:schemas':
        'node --import tsx scripts/build-knowledge-v2-schemas.ts',
      'knowledge:v2:check':
        'node --import tsx scripts/build-knowledge-v2-schemas.ts --check',
      'skill-graph:explore': 'node --import tsx scripts/explore-skill-graph.ts',
    });
    expect(packageJson.scripts.build).toContain(
      'npm run knowledge:v2:validate',
    );
    expect(packageJson.scripts.build).toContain('npm run knowledge:v2:check');
  });

  it('generates a deterministic dry-run without mutating artifacts', () => {
    const first = runSchemaCli(['--dry-run']);
    const second = runSchemaCli(['--dry-run']);

    expect(first.status).toBe(0);
    expect(first.stderr).toBe('');
    expect(second.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    expect(JSON.parse(first.stdout)).toMatchObject({
      ok: true,
      mode: 'dry-run',
      files: schemaFiles,
    });
  });

  it('keeps all four checked-in sidecar schemas in sync', () => {
    const result = runSchemaCli(['--check']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      mode: 'check',
      files: schemaFiles,
      issues: [],
    });
  });

  it.each([
    ['skill-catalog.schema.json', 'catalogVersion'],
    ['skill-rubric.schema.json', 'rubricSetVersion'],
    ['practice.schema.json', 'primaryConceptId'],
    ['case-leaf-attribution.schema.json', 'entries'],
  ])('emits %s from the canonical Zod contract', (fileName, property) => {
    const path = `content/schemas/${fileName}`;

    expect(existsSync(path)).toBe(true);
    const schema = JSON.parse(readFileSync(path, 'utf8')) as {
      $id?: string;
      $schema?: string;
      properties?: Record<string, unknown>;
    };
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.$id).toBe(`https://fde-arena.local/schemas/${fileName}`);
    expect(schema.properties).toHaveProperty(property);
  });
});
