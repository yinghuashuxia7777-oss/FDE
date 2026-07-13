import type { FdeCase } from '../src/domain/cases/types';
import type { FoundationKnowledge } from '../src/domain/foundation/types';
import { ZodError } from 'zod';
import { FoundationKnowledgeSchema } from '../src/content/foundation-schema';
import { parseCaseContent } from '../src/content/parse-content';
import type {
  ContentConfig,
  CoveragePlan,
  DomainDefinition,
  SkillDefinition,
} from '../src/content/contracts';
import {
  ContentConfigSchema,
  CoveragePlanSchema,
  DomainDefinitionSchema,
  SkillDefinitionSchema,
} from '../src/content/schemas';
import { validateCaseSafetyAndLimits } from '../src/content/validate-content-pack';

import type { ContentIssue } from './validate-graph';
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

export interface ContentBundleTextSources {
  partial?: boolean;
  config: ContentTextSource;
  cases: readonly ContentTextSource[];
  domains: readonly ContentTextSource[];
  skills: readonly ContentTextSource[];
  foundation?: readonly ContentTextSource[];
  coverage: ContentTextSource;
}

export interface ValidatedDefinitionSource<T> {
  file: string;
  value: T;
}

export interface ValidatedFoundationSource {
  file: string;
  foundation: FoundationKnowledge;
}

export interface ContentBundleValidationResult {
  config: ContentConfig | null;
  cases: ValidatedCaseSource[];
  domains: ValidatedDefinitionSource<DomainDefinition>[];
  skills: ValidatedDefinitionSource<SkillDefinition>[];
  foundations: ValidatedFoundationSource[];
  coverage: CoveragePlan | null;
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
): ContentValidationResult {
  const selectedSources = [...sources].sort((left, right) =>
    left.file.localeCompare(right.file),
  );
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

    try {
      const content = parseCaseContent(parsed);
      validateCaseSafetyAndLimits(content);
      cases.push({ file: source.file, case: content });
    } catch (error) {
      const parseIssues = error instanceof ZodError ? error.issues : [];
      if (parseIssues.length === 0) {
        issues.push({
          file: source.file,
          path: ['schemaVersion'],
          code: 'schema_invalid',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      parseIssues.forEach((issue) => {
        issues.push({
          file: source.file,
          path: issue.path.map((part: PropertyKey) =>
            typeof part === 'number' ? part : String(part),
          ),
          code: 'schema_invalid',
          message: issue.message,
        });
      });
      continue;
    }
  }

  const firstIdFile = new Map<string, string>();
  const firstSlugSource = new Map<
    string,
    { file: string; caseId: string; version: number }
  >();
  for (const source of cases) {
    const contentKey = `${source.case.id}@${source.case.metadata.version}`;
    const firstFileForId = firstIdFile.get(contentKey);
    if (firstFileForId !== undefined) {
      issues.push({
        file: source.file,
        path: ['id'],
        code: 'duplicate_case_id',
        message: `Case content key ${contentKey} duplicates ${firstFileForId}.`,
      });
    } else {
      firstIdFile.set(contentKey, source.file);
    }

    const firstForSlug = firstSlugSource.get(source.case.slug);
    if (
      firstForSlug !== undefined &&
      (firstForSlug.caseId !== source.case.id ||
        firstForSlug.version === source.case.metadata.version)
    ) {
      issues.push({
        file: source.file,
        path: ['slug'],
        code: 'duplicate_case_slug',
        message: `Case slug ${source.case.slug} duplicates ${firstForSlug.file}.`,
      });
    } else if (firstForSlug === undefined) {
      firstSlugSource.set(source.case.slug, {
        file: source.file,
        caseId: source.case.id,
        version: source.case.metadata.version,
      });
    }
  }

  return {
    filesChecked: selectedSources.length,
    cases,
    issues: issues.sort(compareIssues),
  };
}

function parseJsonSource(
  source: ContentTextSource,
  issues: ContentIssue[],
): unknown {
  try {
    return JSON.parse(source.text) as unknown;
  } catch (error) {
    issues.push({
      file: source.file,
      path: [],
      code: 'invalid_json',
      message: `Invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
    });
    return undefined;
  }
}

function addSchemaIssues(
  file: string,
  schemaIssues: readonly {
    path: readonly PropertyKey[];
    message: string;
  }[],
  issues: ContentIssue[],
) {
  schemaIssues.forEach((issue) => {
    issues.push({
      file,
      path: issue.path.map((part) =>
        typeof part === 'number' ? part : String(part),
      ),
      code: 'schema_invalid',
      message: issue.message,
    });
  });
}

function duplicateDefinitionIssues<T extends { id: string }>(
  definitions: readonly ValidatedDefinitionSource<T>[],
  kind: 'domain' | 'skill',
): ContentIssue[] {
  const firstFileById = new Map<string, string>();
  const issues: ContentIssue[] = [];
  definitions.forEach(({ file, value }) => {
    const firstFile = firstFileById.get(value.id);
    if (firstFile === undefined) {
      firstFileById.set(value.id, file);
      return;
    }
    issues.push({
      file,
      path: ['id'],
      code: `duplicate_${kind}_id`,
      message: `${kind} ID ${value.id} duplicates ${firstFile}.`,
    });
  });
  return issues;
}

function duplicateFoundationIssues(
  foundations: readonly ValidatedFoundationSource[],
): ContentIssue[] {
  const firstFileById = new Map<string, string>();
  const issues: ContentIssue[] = [];
  foundations.forEach(({ file, foundation }) => {
    const firstFile = firstFileById.get(foundation.id);
    if (firstFile === undefined) {
      firstFileById.set(foundation.id, file);
      return;
    }
    issues.push({
      file,
      path: ['id'],
      code: 'duplicate_foundation_id',
      message: `Foundation ID ${foundation.id} duplicates ${firstFile}.`,
    });
  });
  return issues;
}

function foundationDomainFromFile(file: string): string | undefined {
  const normalized = file.replaceAll('\\', '/');
  const prefix = 'content/foundation/';
  if (!normalized.startsWith(prefix)) return undefined;
  const relativePath = normalized.slice(prefix.length);
  const separatorIndex = relativePath.indexOf('/');
  return separatorIndex > 0 ? relativePath.slice(0, separatorIndex) : undefined;
}

export function validateContentBundleSources(
  sources: ContentBundleTextSources,
): ContentBundleValidationResult {
  const issues: ContentIssue[] = [];
  const caseValidation = validateContentSources(sources.cases);
  issues.push(...caseValidation.issues);

  const configInput = parseJsonSource(sources.config, issues);
  const configResult = ContentConfigSchema.safeParse(configInput);
  const config = configResult.success ? configResult.data : null;
  if (configInput !== undefined && !configResult.success) {
    addSchemaIssues(sources.config.file, configResult.error.issues, issues);
  }

  const coverageInput = parseJsonSource(sources.coverage, issues);
  const coverageResult = CoveragePlanSchema.safeParse(coverageInput);
  const coverage = coverageResult.success ? coverageResult.data : null;
  if (coverageInput !== undefined && !coverageResult.success) {
    addSchemaIssues(sources.coverage.file, coverageResult.error.issues, issues);
  }

  const domains: ValidatedDefinitionSource<DomainDefinition>[] = [];
  [...sources.domains]
    .sort((left, right) => left.file.localeCompare(right.file))
    .forEach((source) => {
      const input = parseJsonSource(source, issues);
      if (input === undefined) return;
      const result = DomainDefinitionSchema.safeParse(input);
      if (result.success) {
        domains.push({ file: source.file, value: result.data });
      } else {
        addSchemaIssues(source.file, result.error.issues, issues);
      }
    });

  const skills: ValidatedDefinitionSource<SkillDefinition>[] = [];
  [...sources.skills]
    .sort((left, right) => left.file.localeCompare(right.file))
    .forEach((source) => {
      const input = parseJsonSource(source, issues);
      if (input === undefined) return;
      const result = SkillDefinitionSchema.safeParse(input);
      if (result.success) {
        skills.push({ file: source.file, value: result.data });
      } else {
        addSchemaIssues(source.file, result.error.issues, issues);
      }
    });

  const foundations: ValidatedFoundationSource[] = [];
  [...(sources.foundation ?? [])]
    .sort((left, right) => left.file.localeCompare(right.file))
    .forEach((source) => {
      const input = parseJsonSource(source, issues);
      if (input === undefined) return;
      const result = FoundationKnowledgeSchema.safeParse(input);
      if (result.success) {
        foundations.push({ file: source.file, foundation: result.data });
      } else {
        addSchemaIssues(source.file, result.error.issues, issues);
      }
    });

  issues.push(
    ...duplicateDefinitionIssues(domains, 'domain'),
    ...duplicateDefinitionIssues(skills, 'skill'),
    ...duplicateFoundationIssues(foundations),
  );

  const domainById = new Map(domains.map(({ value }) => [value.id, value]));
  const skillById = new Map(skills.map(({ value }) => [value.id, value]));
  skills.forEach(({ file, value }) => {
    if (!domainById.has(value.domainId)) {
      issues.push({
        file,
        path: ['domainId'],
        code: 'missing_domain_reference',
        message: `Skill ${value.id} references missing domain ${value.domainId}.`,
      });
    }
  });

  caseValidation.cases.forEach(({ file, case: candidate }) => {
    candidate.domains.forEach((domainId, index) => {
      if (!domainById.has(domainId)) {
        issues.push({
          file,
          path: ['domains', index],
          code: 'missing_domain_reference',
          message: `Case ${candidate.id} references missing domain ${domainId}.`,
        });
      }
    });
    candidate.skills.forEach((skillId, index) => {
      if (!skillById.has(skillId)) {
        issues.push({
          file,
          path: ['skills', index],
          code: 'missing_skill_reference',
          message: `Case ${candidate.id} references missing skill ${skillId}.`,
        });
      }
    });
  });

  coverage?.domains.forEach(({ domainId }, index) => {
    if (!domainById.has(domainId)) {
      issues.push({
        file: sources.coverage.file,
        path: ['domains', index, 'domainId'],
        code: 'missing_domain_reference',
        message: `Coverage references missing domain ${domainId}.`,
      });
    }
  });
  if (coverage !== null) {
    const coveredDomainIds = new Set(
      coverage.domains.map(({ domainId }) => domainId),
    );
    domains.forEach(({ file, value }) => {
      if (value.status !== 'active' || coveredDomainIds.has(value.id)) return;
      issues.push({
        file,
        path: ['id'],
        code: 'missing_coverage_domain',
        message: `Active domain ${value.id} is missing from the coverage plan.`,
      });
    });
  }

  const activePublishedCaseIds = new Set<string>();
  if (config !== null) {
    const casesByKey = new Map(
      caseValidation.cases.map(({ case: candidate }) => [
        `${candidate.id}@${candidate.metadata.version}`,
        candidate,
      ]),
    );
    const activeCaseIds = new Set<string>();
    config.activeCases.forEach(({ caseId, version }, index) => {
      const key = `${caseId}@${version}`;
      if (activeCaseIds.has(caseId)) {
        issues.push({
          file: sources.config.file,
          path: ['activeCases', index],
          code: 'duplicate_active_case',
          message: `Case ${caseId} may have only one active version.`,
        });
      }
      activeCaseIds.add(caseId);
      const candidate = casesByKey.get(key);
      if (candidate === undefined) {
        if (sources.partial === true) {
          activePublishedCaseIds.add(caseId);
        } else {
          issues.push({
            file: sources.config.file,
            path: ['activeCases', index],
            code: 'missing_active_case',
            message: `Active case ${key} does not exist.`,
          });
        }
      } else if (candidate.status !== 'published') {
        issues.push({
          file: sources.config.file,
          path: ['activeCases', index],
          code: 'active_case_not_published',
          message: `Active case ${key} must be published.`,
        });
      } else {
        activePublishedCaseIds.add(caseId);
      }
    });
  }

  foundations.forEach(({ file, foundation }) => {
    const pathDomain = foundationDomainFromFile(file);
    if (pathDomain !== foundation.domain) {
      issues.push({
        file,
        path: ['domain'],
        code: 'foundation_domain_path_mismatch',
        message: `Foundation ${foundation.id} declares domain ${foundation.domain} but is stored under ${pathDomain ?? '<missing>'}.`,
      });
    }
    foundation.skills.forEach((skillId, index) => {
      const definition = skillById.get(skillId);
      if (definition === undefined) {
        issues.push({
          file,
          path: ['skills', index],
          code: 'missing_skill_reference',
          message: `Foundation ${foundation.id} references missing skill ${skillId}.`,
        });
      } else if (definition.status !== 'active') {
        issues.push({
          file,
          path: ['skills', index],
          code: 'inactive_skill_reference',
          message: `Foundation ${foundation.id} references inactive skill ${skillId}.`,
        });
      }
    });
    if (config !== null) {
      foundation.relatedCases.forEach((caseId, index) => {
        if (activePublishedCaseIds.has(caseId)) return;
        issues.push({
          file,
          path: ['relatedCases', index],
          code: 'missing_active_case_reference',
          message: `Foundation ${foundation.id} references case ${caseId} outside the active published catalog.`,
        });
      });
    }
  });

  return {
    config,
    cases: caseValidation.cases,
    domains,
    skills,
    foundations,
    coverage,
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
    const report =
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
              ok: validation.issues.length === 0,
              validCases: validation.cases.length,
              validDomains: validation.domains.length,
              validSkills: validation.skills.length,
              validFoundations: validation.foundations.length,
              issues: validation.issues,
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
              ok: validation.issues.length === 0,
              filesChecked: validation.filesChecked,
              validCases: validation.cases.length,
              issues: validation.issues,
            };
          })();
    const output =
      options.output === undefined
        ? undefined
        : resolveSafeProjectPath(PROJECT_ROOT, options.output);
    const content = emitJsonReport(report, {
      dryRun: options.dryRun,
      ...(output === undefined ? {} : { output }),
    });
    writeCliReport(content, report.ok);
    return report.ok ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateContentCli(process.argv.slice(2));
}
