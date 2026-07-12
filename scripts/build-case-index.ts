import { posix, relative, sep } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';

import { caseIndex } from '../src/generated/case-index';
import type { CoverageReport } from './audit-coverage';
import { auditCoverage } from './audit-coverage';
import { parseCliArgs } from './cli';
import type { CaseSource } from './detect-duplicate-ids';
import { detectDuplicateIds } from './detect-duplicate-ids';
import {
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import type { ContentTextSource } from './validate-content';
import { validateContentSources } from './validate-content';
import type { ContentIssue } from './validate-graph';
import { validateCaseGraph } from './validate-graph';

const defaultIndexFile = 'src/generated/case-index.ts';

function singleQuote(value: string): string {
  return `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')}'`;
}

function normalizeProjectFile(file: string): string {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

function relativeModuleSpecifier(
  outputFile: string,
  targetFile: string,
): string {
  const outputDirectory = posix.dirname(normalizeProjectFile(outputFile));
  const modulePath = posix.relative(
    outputDirectory,
    normalizeProjectFile(targetFile),
  );
  return modulePath.startsWith('.') ? modulePath : `./${modulePath}`;
}

function header(outputFile: string): string {
  const typesImport = relativeModuleSpecifier(
    outputFile,
    'src/domain/cases/types',
  );
  return `import type { FdeCase } from ${singleQuote(typesImport)};

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

`;
}

export function generateCaseIndex(
  sources: readonly CaseSource[],
  outputFile = defaultIndexFile,
): string {
  const published = sources
    .filter(({ case: candidate }) => candidate.status === 'published')
    .sort(
      (left, right) =>
        left.case.id.localeCompare(right.case.id) ||
        left.file.localeCompare(right.file),
    );

  const entries = published.map(({ file, case: candidate }) => {
    const importPath = relativeModuleSpecifier(outputFile, file);
    return `  {
    id: ${singleQuote(candidate.id)},
    slug: ${singleQuote(candidate.slug)},
    title: ${singleQuote(candidate.title)},
    summary: ${singleQuote(candidate.summary)},
    level: ${singleQuote(candidate.level)},
    estimatedMinutes: ${candidate.estimatedMinutes},
    domains: ${JSON.stringify(candidate.domains)},
    skills: ${JSON.stringify(candidate.skills)},
    status: 'published',
    version: ${candidate.metadata.version},
    load: () => import(${singleQuote(importPath)}) as Promise<{ default: FdeCase }>,
  }`;
  });

  return `${header(outputFile)}export const caseIndex: readonly CaseIndexEntry[] = [${
    entries.length === 0 ? '' : `\n${entries.join(',\n')},\n`
  }];\n`;
}

export interface ValidatedIndexResult {
  content: string | null;
  issues: ContentIssue[];
  coverage: CoverageReport;
}

export function buildValidatedCaseIndex(
  sources: readonly ContentTextSource[],
  options: {
    outputFile?: string;
    indexedCaseIds?: readonly string[];
  } = {},
): ValidatedIndexResult {
  const validation = validateContentSources(sources);
  const graphIssues = validation.cases.flatMap(({ file, case: candidate }) =>
    validateCaseGraph(candidate, file),
  );
  const duplicateIssues = detectDuplicateIds(validation.cases).map(
    (issue): ContentIssue => ({
      file: issue.files.join(', '),
      path: [issue.kind, issue.id],
      code: `duplicate_${issue.kind}_id`,
      message: issue.message,
    }),
  );
  const parsedCases = validation.cases.map(({ case: candidate }) => candidate);
  const intendedIndexIds = validation.cases
    .filter(({ case: candidate }) => candidate.status === 'published')
    .map(({ case: candidate }) => candidate.id);
  const coverage = auditCoverage(
    parsedCases,
    options.indexedCaseIds ?? intendedIndexIds,
  );
  const coverageIssues = coverage.gaps
    .filter(({ severity }) => severity === 'error')
    .map((gap): ContentIssue => ({
      file: '<coverage>',
      path: ['coverage'],
      code: gap.code,
      message: gap.message,
    }));
  const issues = [
    ...validation.issues,
    ...graphIssues,
    ...duplicateIssues,
    ...coverageIssues,
  ].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.path.join('.').localeCompare(right.path.join('.')) ||
      left.code.localeCompare(right.code),
  );
  return {
    content:
      issues.length === 0
        ? generateCaseIndex(validation.cases, options.outputFile)
        : null,
    issues,
    coverage,
  };
}

export interface IndexOutputAdapter {
  exists(output: string): boolean;
  write(output: string, content: string): void;
}

export interface IndexEmitResult {
  content: string;
  written: boolean;
  reason: 'written' | 'dry-run' | 'exists';
}

export function emitCaseIndex(
  content: string,
  options: { output: string; dryRun: boolean; skipExisting: boolean },
  adapter: IndexOutputAdapter,
): IndexEmitResult {
  if (options.dryRun) {
    return { content, written: false, reason: 'dry-run' };
  }
  if (options.skipExisting && adapter.exists(options.output)) {
    return { content, written: false, reason: 'exists' };
  }
  adapter.write(options.output, content);
  return { content, written: true, reason: 'written' };
}

export function runBuildCaseIndexCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
      skipExisting: true,
    });
    const output = resolveSafeProjectPath(
      PROJECT_ROOT,
      options.output ?? defaultIndexFile,
    );
    const outputFile = relative(PROJECT_ROOT, output).split(sep).join('/');
    const result = buildValidatedCaseIndex(
      readContentSources(
        PROJECT_ROOT,
        options.input ?? 'content/cases',
        options.limit === undefined ? {} : { limit: options.limit },
      ),
      { outputFile, indexedCaseIds: caseIndex.map(({ id }) => id) },
    );
    if (result.content === null) {
      writeCliReport(
        `${JSON.stringify({ ok: false, issues: result.issues }, null, 2)}\n`,
        false,
      );
      return 1;
    }
    const emitted = emitCaseIndex(
      result.content,
      {
        output,
        dryRun: options.dryRun,
        skipExisting: options.skipExisting,
      },
      {
        exists: existsSync,
        write: (file, content) => writeFileSync(file, content, 'utf8'),
      },
    );
    if (options.dryRun) {
      process.stdout.write(emitted.content);
    } else {
      process.stdout.write(
        `${JSON.stringify({ ok: true, written: emitted.written, reason: emitted.reason })}\n`,
      );
    }
    return 0;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runBuildCaseIndexCli(process.argv.slice(2));
}
