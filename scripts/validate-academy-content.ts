import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { z, ZodError } from 'zod';

import skillCatalogJson from '../content/skill-graph/v2/releases/0.2.0/catalog.json';
import {
  AcademyCatalogSchema,
  AcademyContentCollectionSchema,
  AcademyToolSchema,
  AcademyTopicSchema,
} from '../src/content/academy-schema';
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
): ParsedAcademySource<T> | null {
  const parsedJson = parseJson(source, issues);
  if (parsedJson === undefined) return null;

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    addZodIssues(source.file, parsed.error, issues);
    return null;
  }
  return { file: source.file, value: parsed.data };
}

function readMvpPracticeIds(root: string): Set<string> {
  const directory = resolve(root, MVP_PRACTICE_DIRECTORY);
  return new Set(
    discoverJsonFiles(directory).flatMap((file) => {
      try {
        const value = JSON.parse(readFileSync(file, 'utf8')) as {
          id?: unknown;
        };
        return typeof value.id === 'string' ? [value.id] : [];
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
        path: [check.path, index],
        code: check.code,
        message: `Topic ${topicSource.value.id} references unknown ${check.label} ID ${id}.`,
      });
    });
  });
}

function addCollectionIssues(
  catalogSource: ParsedAcademySource<AcademyCatalog>,
  topicSources: readonly ParsedAcademySource<AcademyTopic>[],
  toolSources: readonly ParsedAcademySource<AcademyTool>[],
  issues: AcademyContentIssue[],
): void {
  const result = AcademyContentCollectionSchema.safeParse({
    catalog: catalogSource.value,
    topics: topicSources.map(({ value }) => value),
    tools: toolSources.map(({ value }) => value),
  });
  if (result.success) return;

  result.error.issues.forEach((issue) => {
    const collection = issue.path[0];
    const duplicateId =
      collection === 'topics'
        ? topicSources.find(
            (source, index) =>
              topicSources.findIndex(
                ({ value }) => value.id === source.value.id,
              ) !== index,
          )
        : collection === 'tools'
          ? toolSources.find(
              (source, index) =>
                toolSources.findIndex(
                  ({ value }) => value.id === source.value.id,
                ) !== index,
            )
          : undefined;
    issues.push({
      file: duplicateId?.file ?? catalogSource.file,
      path: issue.path.map((part) =>
        typeof part === 'number' ? part : String(part),
      ),
      code:
        collection === 'topics'
          ? 'duplicate_topic_id'
          : collection === 'tools'
            ? 'duplicate_tool_id'
            : 'collection_invalid',
      message: issue.message,
    });
  });
}

export function validateAcademyContent(
  root: string = PROJECT_ROOT,
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
    ...(toolCatalogSource?.value.tools.map((tool) => ({
      file: toolCatalogSource.file,
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

  if (catalogSource !== null) {
    addCollectionIssues(catalogSource, topicSources, toolSources, issues);
  }

  const references = {
    foundationIds: new Set(foundationIndex.map(({ id }) => id)),
    practiceIds: readMvpPracticeIds(root),
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

if (isDirectRun(import.meta.url)) {
  const report = validateAcademyContent();
  const output = `${JSON.stringify(report, null, 2)}\n`;
  (report.ok ? process.stdout : process.stderr).write(output);
  process.exitCode = report.ok ? 0 : 1;
}
