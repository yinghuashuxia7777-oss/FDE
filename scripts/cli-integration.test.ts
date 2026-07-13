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
  it('validates and audits the complete bundled content snapshot by default', () => {
    const validation = runCli('scripts/validate-content.ts', ['--dry-run']);
    expect(validation.status).toBe(0);
    expect(JSON.parse(validation.stdout)).toMatchObject({
      ok: true,
      validCases: 27,
      validDomains: 15,
      validSkills: 15,
    });

    const quality = runCli('scripts/audit-content-quality.ts', ['--dry-run']);
    expect(quality.status).toBe(0);
    expect(JSON.parse(quality.stdout)).toMatchObject({
      ok: true,
      casesChecked: 27,
      validationIssueCount: 0,
      qualityIssueCount: 0,
      issues: [],
    });

    const audit = runCli('scripts/audit-coverage.ts', ['--dry-run']);
    expect(audit.status).toBe(0);
    expect(JSON.parse(audit.stdout)).toMatchObject({
      ok: true,
      coverage: {
        schemaVersion: 1,
        targetCaseCount: 362,
        publishedCases: 24,
      },
    });
  });

  it('keeps bounded complete validation and index dry-runs internally consistent', () => {
    const validation = runCli('scripts/validate-content.ts', [
      '--dry-run',
      '--limit',
      '10',
    ]);
    expect(validation.status).toBe(0);
    expect(validation.stderr).toBe('');
    expect(JSON.parse(validation.stdout)).toMatchObject({
      ok: true,
      validCases: 10,
    });

    const index = runCli('scripts/build-case-index.ts', [
      '--dry-run',
      '--limit',
      '10',
    ]);
    expect(index.status).toBe(0);
    expect(index.stderr).toBe('');
    expect(JSON.parse(index.stdout)).toMatchObject({
      ok: true,
      sampledCases: 10,
    });
  });

  it('scopes quality limits and writes the structured report', () => {
    const root = temporaryDirectory();
    const output = resolve(root, 'quality-report.json');
    const dryRunOutput = resolve(root, 'dry-run-quality-report.json');

    const result = runCli('scripts/audit-content-quality.ts', [
      '--limit',
      '1',
      '--output',
      projectPath(output),
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      casesChecked: 1,
      validationIssueCount: 0,
      qualityIssueCount: 0,
      issues: [],
    });
    expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual(
      JSON.parse(result.stdout),
    );

    const dryRun = runCli('scripts/audit-content-quality.ts', [
      '--limit',
      '1',
      '--output',
      projectPath(dryRunOutput),
      '--dry-run',
    ]);
    expect(dryRun.status).toBe(0);
    expect(existsSync(dryRunOutput)).toBe(false);
  });

  it('combines selected-case reference and quality issues on stderr', () => {
    const root = temporaryDirectory();
    const input = resolve(root, 'cases');
    mkdirSync(input);
    const candidate = createMinimalValidCase();
    candidate.id = 'quality-gate-failure';
    candidate.slug = candidate.id;
    writeFileSync(
      resolve(input, 'quality-gate-failure.json'),
      JSON.stringify(candidate),
      'utf8',
    );

    const result = runCli('scripts/audit-content-quality.ts', [
      '--input',
      projectPath(input),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    const report = JSON.parse(result.stderr) as {
      validationIssueCount: number;
      qualityIssueCount: number;
      issues: { code: string }[];
    };
    expect(report.validationIssueCount).toBeGreaterThan(0);
    expect(report.qualityIssueCount).toBeGreaterThan(0);
    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'missing_domain_reference',
        'missing_skill_reference',
        'insufficient_decision_nodes',
        'insufficient_node_evidence',
      ]),
    );
  });

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

    const quality = runCli('scripts/audit-content-quality.ts', [
      '--input',
      projectPath(input),
    ]);
    expect(quality.status).toBe(1);
    expect(JSON.parse(quality.stderr)).toMatchObject({
      ok: false,
      casesChecked: 0,
      validationIssueCount: 1,
      qualityIssueCount: 0,
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
