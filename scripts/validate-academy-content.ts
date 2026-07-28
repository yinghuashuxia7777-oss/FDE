import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { z, ZodError } from 'zod';

import skillCatalogJson from '../content/skill-graph/v2/releases/0.2.0/catalog.json';
import {
  AcademyCatalogSchema,
  AcademyToolSchema,
  AcademyTopicSchema,
} from '../src/content/academy-schema';
import { PracticeDefinitionSchema } from '../src/content/practice-schema';
import type {
  AcademyCatalog,
  AcademyTool,
  AcademyTopic,
} from '../src/domain/academy/types';
import { caseIndex } from '../src/generated/case-index';
import { foundationIndex } from '../src/generated/foundation-index';

import { isDirectRun, PROJECT_ROOT } from './files';

const ACADEMY_CONTENT_DIRECTORY = 'content/academy/zh-CN';
const ACADEMY_CATALOG_FILE = `${ACADEMY_CONTENT_DIRECTORY}/catalog.json`;
const ACADEMY_TOOL_CATALOG_FILE = `${ACADEMY_CONTENT_DIRECTORY}/tools/catalog.json`;
const MVP_PRACTICE_DIRECTORY = 'content/practices/mvp';

const AcademyToolCatalogSchema = z
  .object({ tools: z.array(AcademyToolSchema) })
  .strict();

export interface AcademyContentIssue {
  readonly file: string;
  readonly path: readonly (string | number)[];
  readonly code: string;
  readonly message: string;
}

export interface AcademyValidationReport {
  readonly ok: boolean;
  readonly topicsChecked: number;
  readonly toolsChecked: number;
  readonly issues: readonly AcademyContentIssue[];
}

interface AcademyJsonSource {
  readonly file: string;
  readonly text: string;
}

interface ParsedAcademySource<T> {
  readonly file: string;
  readonly path: readonly (string | number)[];
  readonly value: T;
}

function compareIssues(
  left: AcademyContentIssue,
  right: AcademyContentIssue,
): number {
  return (
    left.file.localeCompare(right.file) ||
    left.path.join('.').localeCompare(right.path.join('.')) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

function discoverJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return discoverJsonFiles(path);
      return entry.isFile() && entry.name.endsWith('.json') ? [path] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function readAcademySources(root: string): AcademyJsonSource[] {
  const directory = resolve(root, ACADEMY_CONTENT_DIRECTORY);
  return discoverJsonFiles(directory).map((file) => ({
    file: relative(root, file).split(sep).join('/'),
    text: readFileSync(file, 'utf8'),
  }));
}

function addZodIssues(
  file: string,
  error: ZodError,
  issues: AcademyContentIssue[],
): void {
  error.issues.forEach((issue) => {
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

function parseJson(
  source: AcademyJsonSource,
  issues: AcademyContentIssue[],
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

function parseWithSchema<T>(
  source: AcademyJsonSource,
  schema: z.ZodType<T>,
  issues: AcademyContentIssue[],
  path: readonly (string | number)[] = [],
): ParsedAcademySource<T> | null {
  const parsedJson = parseJson(source, issues);
  if (parsedJson === undefined) return null;

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    addZodIssues(source.file, parsed.error, issues);
    return null;
  }
  return { file: source.file, path, value: parsed.data };
}

function readCanonicalMvpPracticeIds(root: string): Set<string> {
  const directory = resolve(root, MVP_PRACTICE_DIRECTORY);
  return new Set(
    (existsSync(directory)
      ? readdirSync(directory, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
          .map((entry) => resolve(directory, entry.name))
          .sort((left, right) => left.localeCompare(right))
      : []
    ).flatMap((file) => {
      try {
        const parsed = PracticeDefinitionSchema.safeParse(
          JSON.parse(readFileSync(file, 'utf8')) as unknown,
        );
        return parsed.success && parsed.data.skillCatalogVersion === '0.2.0'
          ? [parsed.data.id]
          : [];
      } catch {
        return [];
      }
    }),
  );
}

function addMissingReferenceIssues(
  topicSource: ParsedAcademySource<AcademyTopic>,
  references: {
    readonly foundationIds: ReadonlySet<string>;
    readonly practiceIds: ReadonlySet<string>;
    readonly caseIds: ReadonlySet<string>;
    readonly skillIds: ReadonlySet<string>;
  },
  issues: AcademyContentIssue[],
): void {
  const checks = [
    {
      values: topicSource.value.relatedFoundationIds,
      validIds: references.foundationIds,
      path: 'relatedFoundationIds',
      code: 'missing_foundation_reference',
      label: 'Foundation',
    },
    {
      values: topicSource.value.relatedPracticeIds,
      validIds: references.practiceIds,
      path: 'relatedPracticeIds',
      code: 'missing_practice_reference',
      label: 'Practice',
    },
    {
      values: topicSource.value.relatedCaseIds,
      validIds: references.caseIds,
      path: 'relatedCaseIds',
      code: 'missing_case_reference',
      label: 'Case',
    },
    {
      values: topicSource.value.relatedSkillIds,
      validIds: references.skillIds,
      path: 'relatedSkillIds',
      code: 'missing_skill_reference',
      label: 'Skill',
    },
  ] as const;

  checks.forEach((check) => {
    check.values.forEach((id, index) => {
      if (check.validIds.has(id)) return;
      issues.push({
        file: topicSource.file,
        path: [...topicSource.path, check.path, index],
        code: check.code,
        message: `Topic ${topicSource.value.id} references unknown ${check.label} ID ${id}.`,
      });
    });
  });
}

function addDuplicateSourceIssues<T extends { readonly id: string }>(
  sources: readonly ParsedAcademySource<T>[],
  kind: 'Topic' | 'Tool',
  issues: AcademyContentIssue[],
): void {
  const firstSources = new Map<string, ParsedAcademySource<T>>();
  sources.forEach((source) => {
    const first = firstSources.get(source.value.id);
    if (first === undefined) {
      firstSources.set(source.value.id, source);
      return;
    }
    issues.push({
      file: source.file,
      path: [...source.path, 'id'],
      code: kind === 'Topic' ? 'duplicate_topic_id' : 'duplicate_tool_id',
      message: `${kind} ID ${source.value.id} duplicates ${first.file}.`,
    });
  });
}

function addInternalConsistencyIssues(
  catalogSource: ParsedAcademySource<AcademyCatalog>,
  topicSources: readonly ParsedAcademySource<AcademyTopic>[],
  toolSources: readonly ParsedAcademySource<AcademyTool>[],
  issues: AcademyContentIssue[],
): void {
  const topicById = new Map(
    topicSources.map((source) => [source.value.id, source]),
  );
  const catalogPlacements = new Map<string, number>();

  catalogSource.value.stages.forEach((stage, stageIndex) => {
    stage.topicIds.forEach((topicId, topicIndex) => {
      const path = ['stages', stageIndex, 'topicIds', topicIndex] as const;
      const topicSource = topicById.get(topicId);
      if (topicSource === undefined) {
        issues.push({
          file: catalogSource.file,
          path,
          code: 'missing_catalog_topic',
          message: `Catalog references unknown Topic ID ${topicId}.`,
        });
      } else if (topicSource.value.stageId !== stage.id) {
        issues.push({
          file: catalogSource.file,
          path,
          code: 'topic_stage_mismatch',
          message: `Catalog places Topic ${topicId} in ${stage.id}, but the Topic declares ${topicSource.value.stageId}.`,
        });
      }

      const placementCount = catalogPlacements.get(topicId) ?? 0;
      if (placementCount > 0) {
        issues.push({
          file: catalogSource.file,
          path,
          code: 'duplicate_catalog_topic',
          message: `Catalog places Topic ID ${topicId} more than once.`,
        });
      }
      catalogPlacements.set(topicId, placementCount + 1);
    });
  });

  topicSources.forEach((topicSource) => {
    if (catalogPlacements.has(topicSource.value.id)) return;
    issues.push({
      file: topicSource.file,
      path: [...topicSource.path, 'stageId'],
      code: 'topic_not_in_catalog',
      message: `Topic ${topicSource.value.id} is not listed in the Academy catalog.`,
    });
  });

  const topicIds = new Set(topicSources.map(({ value }) => value.id));
  toolSources.forEach((toolSource) => {
    toolSource.value.relatedTopicIds.forEach((topicId, index) => {
      if (topicIds.has(topicId)) return;
      issues.push({
        file: toolSource.file,
        path: [...toolSource.path, 'relatedTopicIds', index],
        code: 'missing_tool_topic_reference',
        message: `Tool ${toolSource.value.id} references unknown Topic ID ${topicId}.`,
      });
    });
  });
}

export function validateAcademyContent(
  root: string = PROJECT_ROOT,
  referenceRoot: string = PROJECT_ROOT,
): AcademyValidationReport {
  const issues: AcademyContentIssue[] = [];
  const sources = readAcademySources(root);
  const sourceByFile = new Map(sources.map((source) => [source.file, source]));

  const catalogFile = sourceByFile.get(ACADEMY_CATALOG_FILE);
  const toolCatalogFile = sourceByFile.get(ACADEMY_TOOL_CATALOG_FILE);
  if (catalogFile === undefined) {
    issues.push({
      file: ACADEMY_CATALOG_FILE,
      path: [],
      code: 'missing_catalog',
      message: 'Academy catalog is required.',
    });
  }
  if (toolCatalogFile === undefined) {
    issues.push({
      file: ACADEMY_TOOL_CATALOG_FILE,
      path: [],
      code: 'missing_tool_catalog',
      message: 'Academy tool catalog is required.',
    });
  }

  const catalogSource =
    catalogFile === undefined
      ? null
      : parseWithSchema(catalogFile, AcademyCatalogSchema, issues);
  const toolCatalogSource =
    toolCatalogFile === undefined
      ? null
      : parseWithSchema(toolCatalogFile, AcademyToolCatalogSchema, issues);

  const topicSources = sources
    .filter(
      ({ file }) =>
        file !== ACADEMY_CATALOG_FILE &&
        !file.startsWith(`${ACADEMY_CONTENT_DIRECTORY}/tools/`),
    )
    .map((source) => parseWithSchema(source, AcademyTopicSchema, issues))
    .filter(
      (source): source is ParsedAcademySource<AcademyTopic> => source !== null,
    );

  const toolSources: ParsedAcademySource<AcademyTool>[] = [
    ...(toolCatalogSource?.value.tools.map((tool, index) => ({
      file: toolCatalogSource.file,
      path: ['tools', index],
      value: tool,
    })) ?? []),
    ...sources
      .filter(
        ({ file }) =>
          file !== ACADEMY_TOOL_CATALOG_FILE &&
          file.startsWith(`${ACADEMY_CONTENT_DIRECTORY}/tools/`),
      )
      .map((source) => parseWithSchema(source, AcademyToolSchema, issues))
      .filter(
        (source): source is ParsedAcademySource<AcademyTool> => source !== null,
      ),
  ];

  addDuplicateSourceIssues(topicSources, 'Topic', issues);
  addDuplicateSourceIssues(toolSources, 'Tool', issues);
  if (catalogSource !== null) {
    addInternalConsistencyIssues(
      catalogSource,
      topicSources,
      toolSources,
      issues,
    );
  }

  const references = {
    foundationIds: new Set(foundationIndex.map(({ id }) => id)),
    practiceIds: readCanonicalMvpPracticeIds(referenceRoot),
    caseIds: new Set(caseIndex.map(({ id }) => id)),
    skillIds: new Set(skillCatalogJson.leaves.map(({ id }) => id)),
  };
  topicSources.forEach((topicSource) => {
    addMissingReferenceIssues(topicSource, references, issues);
  });

  return {
    ok: issues.length === 0,
    topicsChecked: topicSources.length,
    toolsChecked: toolSources.length,
    issues: issues.sort(compareIssues),
  };
}

export function runValidateAcademyContentCli(
  root: string = PROJECT_ROOT,
  referenceRoot: string = PROJECT_ROOT,
  write: (content: string, ok: boolean) => void = (content, ok) => {
    (ok ? process.stdout : process.stderr).write(content);
  },
): number {
  const report = validateAcademyContent(root, referenceRoot);
  write(`${JSON.stringify(report, null, 2)}\n`, report.ok);
  return report.ok ? 0 : 1;
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateAcademyContentCli();
}
