import type { FdeCase } from '../src/domain/cases/types';
import { FdeCaseSchema } from '../src/schemas/case.schema';

import type { ContentIssue } from './validate-graph';
import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
} from './files';

export interface ContentTextSource {
  file: string;
  text: string;
}

export interface ValidatedCaseSource {
  file: string;
  case: FdeCase;
}

export interface ContentValidationResult {
  filesChecked: number;
  cases: ValidatedCaseSource[];
  issues: ContentIssue[];
}

function compareIssues(left: ContentIssue, right: ContentIssue): number {
  return (
    left.file.localeCompare(right.file) ||
    left.path.join('.').localeCompare(right.path.join('.')) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

export function validateContentSources(
  sources: readonly ContentTextSource[],
  options: { limit?: number } = {},
): ContentValidationResult {
  const selectedSources = [...sources]
    .sort((left, right) => left.file.localeCompare(right.file))
    .slice(0, options.limit);
  const cases: ValidatedCaseSource[] = [];
  const issues: ContentIssue[] = [];

  for (const source of selectedSources) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source.text) as unknown;
    } catch (error) {
      issues.push({
        file: source.file,
        path: [],
        code: 'invalid_json',
        message: `Invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
      });
      continue;
    }

    const result = FdeCaseSchema.safeParse(parsed);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        issues.push({
          file: source.file,
          path: issue.path.map((part) =>
            typeof part === 'number' ? part : String(part),
          ),
          code: 'schema_invalid',
          message: issue.message,
        });
      });
      continue;
    }
    cases.push({ file: source.file, case: result.data });
  }

  const firstIdFile = new Map<string, string>();
  const firstSlugFile = new Map<string, string>();
  for (const source of cases) {
    const firstFileForId = firstIdFile.get(source.case.id);
    if (firstFileForId !== undefined) {
      issues.push({
        file: source.file,
        path: ['id'],
        code: 'duplicate_case_id',
        message: `Case ID ${source.case.id} duplicates ${firstFileForId}.`,
      });
    } else {
      firstIdFile.set(source.case.id, source.file);
    }

    const firstFileForSlug = firstSlugFile.get(source.case.slug);
    if (firstFileForSlug !== undefined) {
      issues.push({
        file: source.file,
        path: ['slug'],
        code: 'duplicate_case_slug',
        message: `Case slug ${source.case.slug} duplicates ${firstFileForSlug}.`,
      });
    } else {
      firstSlugFile.set(source.case.slug, source.file);
    }
  }

  return {
    filesChecked: selectedSources.length,
    cases,
    issues: issues.sort(compareIssues),
  };
}

export function runValidateContentCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
    });
    const sources = readContentSources(
      PROJECT_ROOT,
      options.input ?? 'content/cases',
    );
    const validation = validateContentSources(
      sources,
      options.limit === undefined ? {} : { limit: options.limit },
    );
    const report = {
      ok: validation.issues.length === 0,
      filesChecked: validation.filesChecked,
      validCases: validation.cases.length,
      issues: validation.issues,
    };
    const output =
      options.output === undefined
        ? undefined
        : resolveSafeProjectPath(PROJECT_ROOT, options.output);
    const content = emitJsonReport(report, { dryRun: options.dryRun, output });
    process.stdout.write(content);
    return validation.issues.length === 0 ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateContentCli(process.argv.slice(2));
}
