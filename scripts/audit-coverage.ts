import type { FdeCase } from '../src/domain/cases/types';
import type {
  ActiveCaseReference,
  CoveragePlan,
} from '../src/content/contracts';
import { caseIndex } from '../src/generated/case-index';

import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentBundleSources,
  readContentSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import {
  validateContentBundleSources,
  validateContentSources,
} from './validate-content';

export interface CoverageGap {
  code: string;
  severity: 'info' | 'error';
  message: string;
  caseIds: string[];
}

export interface CoverageReport {
  schemaVersion: 1;
  targetCaseCount: number | null;
  remainingCaseCount: number | null;
  plannedDomainCaseCounts: Record<string, number>;
  totalCases: number;
  publishedCases: number;
  empty: boolean;
  passed: boolean;
  counts: {
    domains: Record<string, number>;
    levels: Record<string, number>;
    statuses: Record<string, number>;
    criticalErrors: Record<string, number>;
  };
  crossDomain: {
    eligible: number;
    qualifying: number;
    ratio: number | null;
    minimumRatio: number;
    passes: boolean | null;
  };
  gaps: CoverageGap[];
}

function increment(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function toSortedRecord(counts: ReadonlyMap<string, number>) {
  return Object.fromEntries(
    [...counts].sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function auditCoverage(
  cases: readonly FdeCase[],
  indexedCaseIds: readonly string[] = [],
  options: {
    activeCases?: readonly ActiveCaseReference[];
    plan?: CoveragePlan;
  } = {},
): CoverageReport {
  const minimumRatio = 0.4;
  const activeKeys =
    options.activeCases === undefined
      ? null
      : new Set(
          options.activeCases.map(
            ({ caseId, version }) => `${caseId}@${version}`,
          ),
        );
  const published = cases.filter(
    (candidate) =>
      candidate.status === 'published' &&
      (activeKeys === null ||
        activeKeys.has(`${candidate.id}@${candidate.metadata.version}`)),
  );
  const domainCounts = new Map<string, number>();
  const levelCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const criticalErrorCounts = new Map<string, number>();

  cases.forEach((candidate) => increment(statusCounts, candidate.status));
  published.forEach((candidate) => {
    new Set(candidate.domains).forEach((domain) =>
      increment(domainCounts, domain),
    );
    increment(levelCounts, candidate.level);
    candidate.nodes.forEach((node) => {
      const optionsById = new Map(
        node.options.map((option) => [option.id, option]),
      );
      node.scoring.criticalErrorOptionIds?.forEach((optionId) => {
        const option = optionsById.get(optionId);
        increment(criticalErrorCounts, option?.errorType ?? optionId);
      });
    });
  });

  const eligible = published.filter(
    ({ level }) => level === 'intermediate' || level === 'advanced',
  );
  const qualifying = eligible.filter(
    ({ domains }) => new Set(domains).size >= 3,
  );
  const ratio =
    eligible.length === 0 ? null : qualifying.length / eligible.length;
  const ratioPasses = ratio === null ? null : ratio >= minimumRatio;
  const gaps: CoverageGap[] = [];

  if (published.length === 0) {
    gaps.push({
      code: 'no_published_cases',
      severity: 'info',
      message: 'No published content is available; coverage is empty.',
      caseIds: [],
    });
  }
  const remainingCaseCount =
    options.plan === undefined
      ? null
      : Math.max(0, options.plan.targetCaseCount - published.length);
  if (remainingCaseCount !== null && remainingCaseCount > 0) {
    gaps.push({
      code: 'coverage_plan_remaining',
      severity: 'info',
      message: `${remainingCaseCount} planned active cases remain to reach the coverage target.`,
      caseIds: [],
    });
  }
  if (ratioPasses === false) {
    gaps.push({
      code: 'insufficient_cross_domain_ratio',
      severity: 'error',
      message: `Cross-domain intermediate/advanced coverage is ${(ratio! * 100).toFixed(1)}%; at least 40.0% is required.`,
      caseIds: eligible
        .filter(({ domains }) => new Set(domains).size < 3)
        .map(({ id }) => id)
        .sort(),
    });
  }

  const deprecatedIds = new Set(
    cases.filter(({ status }) => status === 'deprecated').map(({ id }) => id),
  );
  const indexedDeprecatedIds = [...new Set(indexedCaseIds)]
    .filter((id) => deprecatedIds.has(id))
    .sort();
  if (indexedDeprecatedIds.length > 0) {
    gaps.push({
      code: 'deprecated_in_index',
      severity: 'error',
      message: `Deprecated cases appear in the index: ${indexedDeprecatedIds.join(', ')}.`,
      caseIds: indexedDeprecatedIds,
    });
  }

  gaps.sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      left.caseIds.join('\0').localeCompare(right.caseIds.join('\0')),
  );

  return {
    schemaVersion: 1,
    targetCaseCount: options.plan?.targetCaseCount ?? null,
    remainingCaseCount,
    plannedDomainCaseCounts:
      options.plan === undefined
        ? {}
        : Object.fromEntries(
            [...options.plan.domains]
              .sort((left, right) =>
                left.domainId.localeCompare(right.domainId),
              )
              .map(({ domainId, targetCaseCount }) => [
                domainId,
                targetCaseCount,
              ]),
          ),
    totalCases: cases.length,
    publishedCases: published.length,
    empty: published.length === 0,
    passed: !gaps.some(({ severity }) => severity === 'error'),
    counts: {
      domains: toSortedRecord(domainCounts),
      levels: toSortedRecord(levelCounts),
      statuses: toSortedRecord(statusCounts),
      criticalErrors: toSortedRecord(criticalErrorCounts),
    },
    crossDomain: {
      eligible: eligible.length,
      qualifying: qualifying.length,
      ratio,
      minimumRatio,
      passes: ratioPasses,
    },
    gaps,
  };
}

export function runAuditCoverageCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
    });
    const result =
      options.input === undefined
        ? (() => {
            const validation = validateContentBundleSources(
              readContentBundleSources(PROJECT_ROOT, {
                ...(options.limit === undefined
                  ? {}
                  : { limit: options.limit }),
              }),
            );
            return {
              validationIssues: validation.issues,
              coverage: auditCoverage(
                validation.cases.map(({ case: candidate }) => candidate),
                [],
                {
                  ...(validation.config === null
                    ? {}
                    : { activeCases: validation.config.activeCases }),
                  ...(validation.coverage === null
                    ? {}
                    : { plan: validation.coverage }),
                },
              ),
            };
          })()
        : (() => {
            const validation = validateContentSources(
              readContentSources(
                PROJECT_ROOT,
                options.input,
                options.limit === undefined ? {} : { limit: options.limit },
              ),
            );
            return {
              validationIssues: validation.issues,
              coverage: auditCoverage(
                validation.cases.map(({ case: candidate }) => candidate),
                caseIndex.map(({ id }) => id),
              ),
            };
          })();
    const report = {
      ok: result.validationIssues.length === 0 && result.coverage.passed,
      validationIssues: result.validationIssues,
      coverage: result.coverage,
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
  process.exitCode = runAuditCoverageCli(process.argv.slice(2));
}
