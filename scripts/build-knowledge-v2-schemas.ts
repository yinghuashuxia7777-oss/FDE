import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { z } from 'zod';

import { canonicalizeContent } from '../src/content/canonicalize';
import { CaseLeafAttributionMapSchema } from '../src/content/case-leaf-attribution-schema';
import { PracticeDefinitionSchema } from '../src/content/practice-schema';
import { SkillGraphCatalogSchema } from '../src/content/skill-graph-schema';
import { SkillRubricCatalogSchema } from '../src/content/skill-rubric-schema';

import { parseCliArgs } from './cli';
import {
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';

export const knowledgeV2SchemaArtifactPaths = [
  'content/schemas/case-leaf-attribution.schema.json',
  'content/schemas/practice.schema.json',
  'content/schemas/skill-catalog.schema.json',
  'content/schemas/skill-rubric.schema.json',
] as const;

interface SchemaDefinition {
  path: (typeof knowledgeV2SchemaArtifactPaths)[number];
  schema: z.ZodType;
  title: string;
}

export interface KnowledgeV2SchemaIssue {
  file: string;
  code: 'missing_artifact' | 'outdated_artifact';
  message: string;
}

const schemaDefinitions: readonly SchemaDefinition[] = [
  {
    path: 'content/schemas/case-leaf-attribution.schema.json',
    schema: CaseLeafAttributionMapSchema,
    title: 'FDE Arena Case Leaf Attribution Map',
  },
  {
    path: 'content/schemas/practice.schema.json',
    schema: PracticeDefinitionSchema,
    title: 'FDE Arena Practice Definition',
  },
  {
    path: 'content/schemas/skill-catalog.schema.json',
    schema: SkillGraphCatalogSchema,
    title: 'FDE Arena V2 Skill Graph Catalog',
  },
  {
    path: 'content/schemas/skill-rubric.schema.json',
    schema: SkillRubricCatalogSchema,
    title: 'FDE Arena V1 Skill Rubric Catalog',
  },
];

function stablePrettyJson(value: unknown): string {
  return `${JSON.stringify(JSON.parse(canonicalizeContent(value)), null, 2)}\n`;
}

function generateJsonSchema(
  schema: z.ZodType,
  fileName: string,
  title: string,
): Record<string, unknown> {
  return {
    ...z.toJSONSchema(schema, { target: 'draft-2020-12' }),
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://fde-arena.local/schemas/${fileName}`,
    title,
  };
}

export function generateKnowledgeV2SchemaArtifacts(): Record<string, string> {
  return Object.fromEntries(
    schemaDefinitions.map(({ path, schema, title }) => [
      path,
      stablePrettyJson(
        generateJsonSchema(schema, path.split('/').at(-1)!, title),
      ),
    ]),
  );
}

export function inspectKnowledgeV2SchemaArtifacts(
  root: string,
  artifacts: Readonly<Record<string, string>>,
): KnowledgeV2SchemaIssue[] {
  return Object.entries(artifacts)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([file, expected]): KnowledgeV2SchemaIssue[] => {
      const path = resolveSafeProjectPath(root, file);
      if (!existsSync(path)) {
        return [
          {
            file,
            code: 'missing_artifact',
            message: 'Generated V2 JSON Schema artifact is missing.',
          },
        ];
      }
      if (readFileSync(path, 'utf8') !== expected) {
        return [
          {
            file,
            code: 'outdated_artifact',
            message: 'Generated V2 JSON Schema artifact is out of date.',
          },
        ];
      }
      return [];
    });
}

function writeKnowledgeV2SchemaArtifacts(
  root: string,
  artifacts: Readonly<Record<string, string>>,
): void {
  Object.entries(artifacts)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([file, content]) => {
      const path = resolveSafeProjectPath(root, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, 'utf8');
    });
}

export function runBuildKnowledgeV2SchemasCli(
  args: readonly string[],
  root = PROJECT_ROOT,
): number {
  try {
    const options = parseCliArgs(args, { check: true, dryRun: true });
    if (options.check && options.dryRun) {
      throw new Error('--check and --dry-run cannot be combined');
    }

    const artifacts = generateKnowledgeV2SchemaArtifacts();
    const mode = options.check
      ? 'check'
      : options.dryRun
        ? 'dry-run'
        : 'generate';
    const issues = options.check
      ? inspectKnowledgeV2SchemaArtifacts(root, artifacts)
      : [];
    if (mode === 'generate') {
      writeKnowledgeV2SchemaArtifacts(root, artifacts);
    }
    const report = {
      ok: issues.length === 0,
      mode,
      files: Object.keys(artifacts).sort(),
      issues,
    };
    const content = `${JSON.stringify(report, null, 2)}\n`;
    writeCliReport(content, report.ok);
    return report.ok ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runBuildKnowledgeV2SchemasCli(process.argv.slice(2));
}
