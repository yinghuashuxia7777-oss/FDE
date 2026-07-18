import {
  compareContentIssues,
  validateCaseGraph,
} from '../src/content/validate-case-graph';

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

export type { ContentIssue } from '../src/content/validate-case-graph';
export { validateCaseGraph } from '../src/content/validate-case-graph';

export function runValidateGraphCli(args: readonly string[]): number {
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
      options.limit === undefined ? {} : { limit: options.limit },
    );
    const validation = validateContentSources(sources);
    const issues = [
      ...validation.issues,
      ...validation.cases.flatMap(({ file, case: candidate }) =>
        validateCaseGraph(candidate, file),
      ),
    ].sort(compareContentIssues);
    const report = {
      ok: issues.length === 0,
      casesChecked: validation.cases.length,
      issues,
    };
    const output =
      options.output === undefined
        ? undefined
        : resolveSafeProjectPath(PROJECT_ROOT, options.output);
    writeCliReport(
      emitJsonReport(report, {
        dryRun: options.dryRun,
        ...(output === undefined ? {} : { output }),
      }),
      report.ok,
    );
    return issues.length === 0 ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateGraphCli(process.argv.slice(2));
}
