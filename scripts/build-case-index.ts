import { posix } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';

import { parseCliArgs } from './cli';
import type { CaseSource } from './detect-duplicate-ids';
import { detectDuplicateIds } from './detect-duplicate-ids';
import {
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
} from './files';
import type { ContentTextSource } from './validate-content';
import { validateContentSources } from './validate-content';
import type { ContentIssue } from './validate-graph';
import { validateCaseGraph } from './validate-graph';

const indexDirectory = 'src/generated';

function singleQuote(value: string): string {
  return `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')}'`;
}

function normalizedImportPath(file: string): string {
  const normalized = file.replaceAll('\\', '/').replace(/^\.\//, '');
  const relative = posix.relative(indexDirectory, normalized);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function header(): string {
  return `import type { FdeCase } from '../domain/cases/types';

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

export function generateCaseIndex(sources: readonly CaseSource[]): string {
  const published = sources
    .filter(({ case: candidate }) => candidate.status === 'published')
    .sort(
      (left, right) =>
        left.case.id.localeCompare(right.case.id) ||
        left.file.localeCompare(right.file),
    );

  const entries = published.map(({ file, case: candidate }) => {
    const importPath = normalizedImportPath(file);
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

  return `${header()}export const caseIndex: readonly CaseIndexEntry[] = [${
    entries.length === 0 ? '' : `\n${entries.join(',\n')},\n`
  }];\n`;
}

export interface ValidatedIndexResult {
  content: string | null;
  issues: ContentIssue[];
}

export function buildValidatedCaseIndex(
  sources: readonly ContentTextSource[],
  options: { limit?: number } = {},
): ValidatedIndexResult {
  const validation = validateContentSources(sources, options);
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
  const issues = [
    ...validation.issues,
    ...graphIssues,
    ...duplicateIssues,
  ].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.path.join('.').localeCompare(right.path.join('.')) ||
      left.code.localeCompare(right.code),
  );
  return {
    content: issues.length === 0 ? generateCaseIndex(validation.cases) : null,
    issues,
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
    const result = buildValidatedCaseIndex(
      readContentSources(PROJECT_ROOT, options.input ?? 'content/cases'),
      options.limit === undefined ? {} : { limit: options.limit },
    );
    if (result.content === null) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, issues: result.issues }, null, 2)}\n`,
      );
      return 1;
    }
    const output = resolveSafeProjectPath(
      PROJECT_ROOT,
      options.output ?? 'src/generated/case-index.ts',
    );
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
