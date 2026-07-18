import { existsSync } from 'node:fs';

import type { FdeCase } from '../src/domain/cases/types';
import type { ConceptKnowledge } from '../src/domain/concepts/types';
import type { FoundationKnowledge } from '../src/domain/foundation/types';
import type { PracticeDefinition } from '../src/domain/practices/types';
import type { SkillRubricCatalog } from '../src/domain/skills/rubric-types';
import {
  V2_PRESENTATION_TARGET_IDS,
  type SkillGraphCatalog,
} from '../src/domain/skills/types';
import type { SkillDefinition } from '../src/content/contracts';
import {
  type CaseLeafAttributionMap,
  CaseLeafAttributionMapSchema,
} from '../src/content/case-leaf-attribution-schema';
import {
  validateCaseLeafAttributionMap,
  validatePracticeDefinition,
  validateSkillRubricCatalog,
} from '../src/content/knowledge-v2-validators';
import { PracticeDefinitionSchema } from '../src/content/practice-schema';
import { SkillGraphCatalogSchema } from '../src/content/skill-graph-schema';
import { validateSkillGraphCatalog } from '../src/content/skill-graph-validator';
import { SkillRubricCatalogSchema } from '../src/content/skill-rubric-schema';

import { parseCliArgs } from './cli';
import {
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentBundleSources,
  readContentSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import { readSkillCatalogSources } from './knowledge-v2-files';
import type { ContentTextSource } from './validate-content';
import { validateContentBundleSources } from './validate-content';

export interface KnowledgeV2Issue {
  file: string;
  path: (string | number)[];
  code: string;
  message: string;
}

export interface KnowledgeV2SourceBundle {
  legacySkills: readonly SkillDefinition[];
  cases: readonly FdeCase[];
  foundations: readonly FoundationKnowledge[];
  concepts: readonly ConceptKnowledge[];
  skillCatalogs: readonly ContentTextSource[];
  rubricCatalogs: readonly ContentTextSource[];
  practices: readonly ContentTextSource[];
  attributionMaps: readonly ContentTextSource[];
  baseIssues?: readonly KnowledgeV2Issue[];
}

export interface KnowledgeV2ValidationReport {
  ok: boolean;
  checked: {
    legacySkills: number;
    cases: number;
    foundations: number;
    concepts: number;
    skillCatalogs: number;
    leafSkills: number;
    rubricCatalogs: number;
    rubrics: number;
    practices: number;
    attributionMaps: number;
  };
  issues: KnowledgeV2Issue[];
}

interface ParsedSource<T> {
  file: string;
  value: T;
}

function compareIssues(left: KnowledgeV2Issue, right: KnowledgeV2Issue) {
  return (
    left.file.localeCompare(right.file) ||
    left.path.join('.').localeCompare(right.path.join('.')) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

function parseJsonSources(
  sources: readonly ContentTextSource[],
  issues: KnowledgeV2Issue[],
): ParsedSource<unknown>[] {
  return [...sources]
    .sort((left, right) => left.file.localeCompare(right.file))
    .flatMap(({ file, text }): ParsedSource<unknown>[] => {
      try {
        return [{ file, value: JSON.parse(text) as unknown }];
      } catch (error) {
        issues.push({
          file,
          path: [],
          code: 'invalid_json',
          message: `Invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
        });
        return [];
      }
    });
}

function attachIssues(
  file: string,
  sourceIssues: readonly {
    path: readonly (string | number)[];
    code: string;
    message: string;
  }[],
  issues: KnowledgeV2Issue[],
): void {
  sourceIssues.forEach((issue) => {
    issues.push({
      file,
      path: [...issue.path],
      code: issue.code,
      message: issue.message,
    });
  });
}

function parsedValues<T>(
  sources: readonly ParsedSource<unknown>[],
  parse: (value: unknown) => { success: true; data: T } | { success: false },
): ParsedSource<T>[] {
  return sources.flatMap(({ file, value }): ParsedSource<T>[] => {
    const result = parse(value);
    return result.success ? [{ file, value: result.data }] : [];
  });
}

function duplicateReleaseIssues<T>(
  sources: readonly ParsedSource<T>[],
  identity: (value: T) => string,
  options: { code: string; path: string; label: string },
): KnowledgeV2Issue[] {
  const firstFileByIdentity = new Map<string, string>();
  const issues: KnowledgeV2Issue[] = [];
  sources.forEach(({ file, value }) => {
    const key = identity(value);
    const firstFile = firstFileByIdentity.get(key);
    if (firstFile === undefined) {
      firstFileByIdentity.set(key, file);
      return;
    }
    issues.push({
      file,
      path: [options.path],
      code: options.code,
      message: `${options.label} ${key} duplicates ${firstFile}.`,
    });
  });
  return issues;
}

function duplicateRubricIdentityIssues(
  catalogs: readonly ParsedSource<SkillRubricCatalog>[],
): KnowledgeV2Issue[] {
  const firstFileBySkillIdentity = new Map<string, string>();
  const firstFileByRubricIdIdentity = new Map<string, string>();
  const issues: KnowledgeV2Issue[] = [];
  catalogs.forEach(({ file, value }) => {
    value.rubrics.forEach((rubric, index) => {
      const skillKey = `${value.skillCatalogVersion}|${rubric.skillId}@${rubric.version}`;
      const firstSkillFile = firstFileBySkillIdentity.get(skillKey);
      if (firstSkillFile === undefined) {
        firstFileBySkillIdentity.set(skillKey, file);
      } else {
        issues.push({
          file,
          path: ['rubrics', index],
          code: 'duplicate_rubric_identity_across_sets',
          message: `Rubric identity ${rubric.skillId}@${rubric.version} for catalog ${value.skillCatalogVersion} duplicates ${firstSkillFile}.`,
        });
      }

      const rubricIdKey = `${value.skillCatalogVersion}|${rubric.id}@${rubric.version}`;
      const firstRubricIdFile = firstFileByRubricIdIdentity.get(rubricIdKey);
      if (firstRubricIdFile === undefined) {
        firstFileByRubricIdIdentity.set(rubricIdKey, file);
      } else {
        issues.push({
          file,
          path: ['rubrics', index],
          code: 'duplicate_rubric_id_version_across_sets',
          message: `Rubric ID identity ${rubric.id}@${rubric.version} for catalog ${value.skillCatalogVersion} duplicates ${firstRubricIdFile}.`,
        });
      }
    });
  });
  return issues;
}

function duplicatePracticeIssues(
  practices: readonly ParsedSource<PracticeDefinition>[],
): KnowledgeV2Issue[] {
  const firstFileByKey = new Map<string, string>();
  const issues: KnowledgeV2Issue[] = [];
  practices.forEach(({ file, value }) => {
    const key = `${value.id}@${value.version}`;
    const firstFile = firstFileByKey.get(key);
    if (firstFile === undefined) {
      firstFileByKey.set(key, file);
      return;
    }
    issues.push({
      file,
      path: ['id'],
      code: 'duplicate_practice_version',
      message: `Practice ${key} duplicates ${firstFile}.`,
    });
  });
  return issues;
}

function duplicateAttributionMapIssues(
  maps: readonly ParsedSource<CaseLeafAttributionMap>[],
): KnowledgeV2Issue[] {
  const firstFileByKey = new Map<string, string>();
  const issues: KnowledgeV2Issue[] = [];
  maps.forEach(({ file, value }) => {
    const key = `${value.mapId}@${value.mapVersion}`;
    const firstFile = firstFileByKey.get(key);
    if (firstFile === undefined) {
      firstFileByKey.set(key, file);
      return;
    }
    issues.push({
      file,
      path: ['mapId'],
      code: 'duplicate_attribution_map_version',
      message: `Attribution map ${key} duplicates ${firstFile}.`,
    });
  });
  return issues;
}

export function validateKnowledgeV2Sources(
  sources: KnowledgeV2SourceBundle,
): KnowledgeV2ValidationReport {
  const issues: KnowledgeV2Issue[] = [...(sources.baseIssues ?? [])];
  const rawCatalogs = parseJsonSources(sources.skillCatalogs, issues);
  const rawRubricCatalogs = parseJsonSources(sources.rubricCatalogs, issues);
  const rawPractices = parseJsonSources(sources.practices, issues);
  const rawAttributionMaps = parseJsonSources(sources.attributionMaps, issues);

  const catalogs = parsedValues<SkillGraphCatalog>(rawCatalogs, (value) => {
    const result = SkillGraphCatalogSchema.safeParse(value);
    return result.success
      ? { success: true as const, data: result.data }
      : { success: false as const };
  });
  const rubricCatalogs = parsedValues<SkillRubricCatalog>(
    rawRubricCatalogs,
    (value) => {
      const result = SkillRubricCatalogSchema.safeParse(value);
      return result.success
        ? { success: true as const, data: result.data }
        : { success: false as const };
    },
  );
  const practices = parsedValues<PracticeDefinition>(rawPractices, (value) => {
    const result = PracticeDefinitionSchema.safeParse(value);
    return result.success
      ? { success: true as const, data: result.data }
      : { success: false as const };
  });
  const attributionMaps = parsedValues<CaseLeafAttributionMap>(
    rawAttributionMaps,
    (value) => {
      const result = CaseLeafAttributionMapSchema.safeParse(value);
      return result.success
        ? { success: true as const, data: result.data }
        : { success: false as const };
    },
  );

  if (catalogs.length === 0) {
    issues.push({
      file: sources.skillCatalogs[0]?.file ?? 'content/skill-graph/v2/releases',
      path: [],
      code: 'missing_skill_catalog',
      message: 'At least one parseable V2 skill catalog is required.',
    });
  }
  issues.push(
    ...duplicateReleaseIssues(
      catalogs,
      ({ catalogVersion }) => catalogVersion,
      {
        code: 'duplicate_skill_catalog_version',
        path: 'catalogVersion',
        label: 'Skill catalog version',
      },
    ),
    ...duplicateReleaseIssues(
      rubricCatalogs,
      ({ rubricSetVersion }) => rubricSetVersion,
      {
        code: 'duplicate_rubric_set_version',
        path: 'rubricSetVersion',
        label: 'Rubric set version',
      },
    ),
    ...duplicateRubricIdentityIssues(rubricCatalogs),
  );

  const allLeafSkills = catalogs.flatMap(({ value }) => value.leaves);
  const allRubrics = rubricCatalogs.flatMap(({ value }) => value.rubrics);
  const legacySkillIds = sources.legacySkills.map(({ id }) => id).sort();

  rawCatalogs.forEach(({ file, value }) => {
    const parsed = SkillGraphCatalogSchema.safeParse(value);
    const matchingPublishedRubricCatalogs = parsed.success
      ? rubricCatalogs.filter(
          ({ value: rubricCatalog }) =>
            rubricCatalog.skillCatalogVersion === parsed.data.catalogVersion &&
            rubricCatalog.status === 'published',
        )
      : [];
    if (
      parsed.success &&
      parsed.data.status === 'published' &&
      matchingPublishedRubricCatalogs.length !== 1
    ) {
      const multiple = matchingPublishedRubricCatalogs.length > 1;
      issues.push({
        file,
        path: ['catalogVersion'],
        code: multiple
          ? 'ambiguous_published_rubric_catalog'
          : 'missing_published_rubric_catalog',
        message: multiple
          ? `Published skill catalog ${parsed.data.catalogVersion} resolves to multiple published rubric catalogs.`
          : `Published skill catalog ${parsed.data.catalogVersion} requires one published rubric catalog.`,
      });
    }
    const publishedRubricRefs =
      matchingPublishedRubricCatalogs.length === 1
        ? matchingPublishedRubricCatalogs[0].value.rubrics
            .filter(({ status }) => status === 'published')
            .map(({ skillId, version }) => ({ skillId, version }))
        : [];
    attachIssues(
      file,
      validateSkillGraphCatalog(value, {
        legacySkillIds,
        publishedRubricRefs,
        expectedLeafCount: 70,
        presentationSkillIds: V2_PRESENTATION_TARGET_IDS,
      }),
      issues,
    );
  });

  rawRubricCatalogs.forEach(({ file, value }) => {
    const parsed = SkillRubricCatalogSchema.safeParse(value);
    const matchingCatalogs = parsed.success
      ? catalogs.filter(
          ({ value: catalog }) =>
            catalog.catalogVersion === parsed.data.skillCatalogVersion,
        )
      : [];
    if (parsed.success && matchingCatalogs.length !== 1) {
      const duplicate = matchingCatalogs.length > 1;
      issues.push({
        file,
        path: ['skillCatalogVersion'],
        code: duplicate
          ? 'ambiguous_skill_catalog_version'
          : 'missing_skill_catalog_version',
        message: duplicate
          ? `Rubric set references duplicate skill catalog version ${parsed.data.skillCatalogVersion}.`
          : `Rubric set references missing skill catalog ${parsed.data.skillCatalogVersion}.`,
      });
    }
    attachIssues(
      file,
      validateSkillRubricCatalog(value, {
        leafSkills:
          matchingCatalogs.length === 1 ? matchingCatalogs[0].value.leaves : [],
        skillCatalogStatus:
          matchingCatalogs.length === 1
            ? matchingCatalogs[0].value.status
            : null,
      }),
      issues,
    );
  });

  rawPractices.forEach(({ file, value }) => {
    const parsed = PracticeDefinitionSchema.safeParse(value);
    const matchingCatalogs = parsed.success
      ? catalogs.filter(
          ({ value: catalog }) =>
            catalog.catalogVersion === parsed.data.skillCatalogVersion,
        )
      : [];
    const matchingRubricCatalogs = parsed.success
      ? rubricCatalogs.filter(
          ({ value: rubricCatalog }) =>
            rubricCatalog.rubricSetVersion === parsed.data.rubricSetVersion &&
            rubricCatalog.skillCatalogVersion ===
              parsed.data.skillCatalogVersion,
        )
      : [];
    if (
      !parsed.success ||
      matchingCatalogs.length !== 1 ||
      matchingRubricCatalogs.length !== 1
    ) {
      issues.push({
        file,
        path: [],
        code: 'ambiguous_practice_release_context',
        message:
          'Practice must resolve one exact skill catalog and rubric release.',
      });
      attachIssues(
        file,
        validatePracticeDefinition(value, {
          conceptIds: [],
          foundationIds: [],
          leafSkills: [],
          rubrics: [],
        }).filter(({ code }) => code === 'invalid_schema'),
        issues,
      );
      return;
    }
    attachIssues(
      file,
      validatePracticeDefinition(value, {
        conceptIds: sources.concepts.map(({ id }) => id),
        foundationIds: sources.foundations.map(({ id }) => id),
        leafSkills: matchingCatalogs[0].value.leaves,
        rubrics:
          parsed.data.status === 'published' &&
          (matchingCatalogs[0].value.status !== 'published' ||
            matchingRubricCatalogs[0].value.status !== 'published')
            ? []
            : matchingRubricCatalogs[0].value.rubrics,
      }),
      issues,
    );
  });

  rawAttributionMaps.forEach(({ file, value }) => {
    const parsed = CaseLeafAttributionMapSchema.safeParse(value);
    const matchingCatalogs = parsed.success
      ? catalogs.filter(
          ({ value: catalog }) =>
            catalog.catalogVersion === parsed.data.skillCatalogVersion,
        )
      : [];
    const matchingRubricCatalogs = parsed.success
      ? rubricCatalogs.filter(
          ({ value: rubricCatalog }) =>
            rubricCatalog.rubricSetVersion === parsed.data.rubricSetVersion &&
            rubricCatalog.skillCatalogVersion ===
              parsed.data.skillCatalogVersion,
        )
      : [];
    if (
      !parsed.success ||
      matchingCatalogs.length !== 1 ||
      matchingRubricCatalogs.length !== 1
    ) {
      issues.push({
        file,
        path: [],
        code: 'ambiguous_attribution_release_context',
        message:
          'Attribution map must resolve one exact skill catalog and rubric release.',
      });
      attachIssues(
        file,
        validateCaseLeafAttributionMap(value, {
          cases: [],
          leafSkills: [],
          rubrics: [],
        }).filter(({ code }) => code === 'invalid_schema'),
        issues,
      );
      return;
    }
    attachIssues(
      file,
      validateCaseLeafAttributionMap(value, {
        cases: sources.cases,
        leafSkills: matchingCatalogs[0].value.leaves,
        rubrics:
          parsed.data.status === 'approved' &&
          (matchingCatalogs[0].value.status !== 'published' ||
            matchingRubricCatalogs[0].value.status !== 'published')
            ? []
            : matchingRubricCatalogs[0].value.rubrics,
      }),
      issues,
    );
  });

  issues.push(...duplicatePracticeIssues(practices));
  issues.push(...duplicateAttributionMapIssues(attributionMaps));
  issues.sort(compareIssues);

  return {
    ok: issues.length === 0,
    checked: {
      legacySkills: sources.legacySkills.length,
      cases: sources.cases.length,
      foundations: sources.foundations.length,
      concepts: sources.concepts.length,
      skillCatalogs: sources.skillCatalogs.length,
      leafSkills: allLeafSkills.length,
      rubricCatalogs: sources.rubricCatalogs.length,
      rubrics: allRubrics.length,
      practices: sources.practices.length,
      attributionMaps: sources.attributionMaps.length,
    },
    issues,
  };
}

function readOptionalJsonSources(
  root: string,
  input: string,
  limit?: number,
): ContentTextSource[] {
  const path = resolveSafeProjectPath(root, input);
  if (!existsSync(path)) return [];
  return readContentSources(root, input, limit === undefined ? {} : { limit });
}

export function runValidateKnowledgeV2Cli(
  args: readonly string[],
  root = PROJECT_ROOT,
): number {
  try {
    const options = parseCliArgs(args, { input: true, limit: true });
    const base = validateContentBundleSources(readContentBundleSources(root));
    const focusedCatalogScan =
      options.input !== undefined || options.limit !== undefined;
    const report = validateKnowledgeV2Sources({
      legacySkills: base.skills.map(({ value }) => value),
      cases: base.cases.map(({ case: candidate }) => candidate),
      foundations: base.foundations.map(({ foundation }) => foundation),
      concepts: base.concepts.map(({ concept }) => concept),
      skillCatalogs: readSkillCatalogSources(
        root,
        options.input ?? 'content/skill-graph/v2/releases',
        options.limit === undefined ? {} : { limit: options.limit },
      ),
      rubricCatalogs: readOptionalJsonSources(
        root,
        'content/skill-rubrics/v1',
        options.input !== undefined ? 0 : options.limit,
      ),
      practices: readOptionalJsonSources(
        root,
        'content/practices',
        focusedCatalogScan ? 0 : undefined,
      ),
      attributionMaps: readOptionalJsonSources(
        root,
        'content/skill-attribution',
        focusedCatalogScan ? 0 : undefined,
      ),
      baseIssues: base.issues,
    });
    const content = `${JSON.stringify(report, null, 2)}\n`;
    writeCliReport(content, report.ok);
    return report.ok ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateKnowledgeV2Cli(process.argv.slice(2));
}
