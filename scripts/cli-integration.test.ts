import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { PROJECT_ROOT } from './files';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(resolve(PROJECT_ROOT, '.tmp-cli-integration-'));
  temporaryDirectories.push(directory);
  return directory;
}

function projectPath(file: string): string {
  return relative(PROJECT_ROOT, file).split(sep).join('/');
}

function runCli(script: string, args: readonly string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('content CLI entrypoints', () => {
  it('returns structured stderr and a non-zero exit for invalid arguments', () => {
    const result = runCli('scripts/validate-content.ts', ['--unknown']);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^\{/);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: 'cli_error', message: 'Unknown option: --unknown' },
    });
  });

  it('returns a structured invalid_json issue on stderr', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'cases');
    mkdirSync(input);
    writeFileSync(resolve(input, 'broken.json'), '{"id":', 'utf8');

    const result = runCli('scripts/validate-content.ts', [
      '--input',
      projectPath(input),
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^\{/);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      issues: [expect.objectContaining({ code: 'invalid_json' })],
    });
  });

  it('keeps index dry-run non-writing and skip-existing non-overwriting', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'cases');
    const dryRunOutput = resolve(root, 'generated', 'dry-run-index.ts');
    const existingOutput = resolve(root, 'generated', 'existing-index.ts');
    mkdirSync(input);
    mkdirSync(resolve(root, 'generated'));

    const dryRun = runCli('scripts/build-case-index.ts', [
      '--input',
      projectPath(input),
      '--output',
      projectPath(dryRunOutput),
      '--dry-run',
    ]);
    expect(dryRun.status).toBe(0);
    expect(existsSync(dryRunOutput)).toBe(false);

    writeFileSync(existingOutput, 'sentinel', 'utf8');
    const skipExisting = runCli('scripts/build-case-index.ts', [
      '--input',
      projectPath(input),
      '--output',
      projectPath(existingOutput),
      '--skip-existing',
    ]);
    expect(skipExisting.status).toBe(0);
    expect(readFileSync(existingOutput, 'utf8')).toBe('sentinel');
  });

  it('does not create an index when coverage validation fails', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'cases');
    const output = resolve(root, 'generated', 'case-index.ts');
    mkdirSync(input);
    mkdirSync(resolve(root, 'generated'));
    const candidate = createMinimalValidCase();
    candidate.id = 'case-low-coverage';
    candidate.slug = 'case-low-coverage';
    candidate.status = 'published';
    candidate.level = 'intermediate';
    candidate.domains = ['one-domain'];
    candidate.metadata.reviewer = 'Reviewer';
    candidate.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';
    writeFileSync(
      resolve(input, 'case.json'),
      JSON.stringify(candidate),
      'utf8',
    );

    const result = runCli('scripts/build-case-index.ts', [
      '--input',
      projectPath(input),
      '--output',
      projectPath(output),
    ]);

    expect(result.status).toBe(1);
    expect(existsSync(output)).toBe(false);
    expect(result.stderr).toMatch(/^\{/);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      issues: [
        expect.objectContaining({ code: 'insufficient_cross_domain_ratio' }),
      ],
    });
  });
});
