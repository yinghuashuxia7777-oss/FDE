import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import { validateContentSources } from './validate-content';
import { detectDuplicateIds } from '../src/content/detect-duplicate-ids';

export type {
  CaseSource,
  DuplicateIdIssue,
  DuplicateIdKind,
} from '../src/content/detect-duplicate-ids';
export { detectDuplicateIds } from '../src/content/detect-duplicate-ids';

export function runDetectDuplicateIdsCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
    });
    const validation = validateContentSources(
      readContentSources(
        PROJECT_ROOT,
        options.input ?? 'content/cases',
        options.limit === undefined ? {} : { limit: options.limit },
      ),
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
    writeCliReport(
      emitJsonReport(report, { dryRun: options.dryRun, output }),
      report.ok,
    );
    return report.ok ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runDetectDuplicateIdsCli(process.argv.slice(2));
}
