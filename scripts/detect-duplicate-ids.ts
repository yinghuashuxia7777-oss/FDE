import type { FdeCase } from '../src/domain/cases/types';

import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
} from './files';
import { validateContentSources } from './validate-content';

export type DuplicateIdKind = 'case' | 'node' | 'option' | 'evidence';

export interface CaseSource {
  file: string;
  case: FdeCase;
}

export interface DuplicateIdIssue {
  kind: DuplicateIdKind;
  id: string;
  files: string[];
  message: string;
}

interface IdOccurrence {
  id: string;
  file: string;
}

export function detectDuplicateIds(
  sources: readonly CaseSource[],
): DuplicateIdIssue[] {
  const occurrences: Record<DuplicateIdKind, IdOccurrence[]> = {
    case: [],
    node: [],
    option: [],
    evidence: [],
  };

  for (const source of sources) {
    occurrences.case.push({ id: source.case.id, file: source.file });
    for (const node of source.case.nodes) {
      occurrences.node.push({ id: node.id, file: source.file });
      node.options.forEach(({ id }) => {
        occurrences.option.push({ id, file: source.file });
      });
      node.evidence.forEach(({ id }) => {
        occurrences.evidence.push({ id, file: source.file });
      });
    }
  }

  const issues: DuplicateIdIssue[] = [];
  (Object.keys(occurrences) as DuplicateIdKind[]).forEach((kind) => {
    const filesById = new Map<string, Set<string>>();
    occurrences[kind].forEach(({ id, file }) => {
      const files = filesById.get(id) ?? new Set<string>();
      files.add(file);
      filesById.set(id, files);
    });
    filesById.forEach((fileSet, id) => {
      if (fileSet.size < 2) return;
      const files = [...fileSet].sort();
      issues.push({
        kind,
        id,
        files,
        message: `Duplicate ${kind} ID ${id} appears in ${files.join(', ')}.`,
      });
    });
  });

  return issues.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.id.localeCompare(right.id) ||
      left.files.join('\0').localeCompare(right.files.join('\0')),
  );
}

export function runDetectDuplicateIdsCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
    });
    const validation = validateContentSources(
      readContentSources(PROJECT_ROOT, options.input ?? 'content/cases'),
      options.limit === undefined ? {} : { limit: options.limit },
    );
    const duplicates = detectDuplicateIds(validation.cases);
    const report = {
      ok: validation.issues.length === 0 && duplicates.length === 0,
      casesChecked: validation.cases.length,
      validationIssues: validation.issues,
      duplicateIssues: duplicates,
    };
    const output =
      options.output === undefined
        ? undefined
        : resolveSafeProjectPath(PROJECT_ROOT, options.output);
    process.stdout.write(
      emitJsonReport(report, { dryRun: options.dryRun, output }),
    );
    return report.ok ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runDetectDuplicateIdsCli(process.argv.slice(2));
}
