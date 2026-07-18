import { dirname, posix, relative, sep } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

import { caseIndex } from '../src/generated/case-index';
import {
  CONCEPT_AUTHORED_TEXT_PATTERN,
  ConceptKnowledgeSchema,
} from '../src/content/concept-schema';
import {
  FOUNDATION_AUTHORED_TEXT_PATTERN,
  FoundationKnowledgeSchema,
} from '../src/content/foundation-schema';
import type {
  ContentConfig,
  ContentManifest,
  CoveragePlan,
  DomainDefinition,
  SkillDefinition,
} from '../src/content/contracts';
import {
  ContentManifestSchema,
  ContentPackSchema,
  CoveragePlanSchema,
  DomainDefinitionSchema,
  SkillDefinitionSchema,
} from '../src/content/schemas';
import { canonicalizeContent } from '../src/content/canonicalize';
import { sha256Content } from './content-hash';
import { FdeCaseSchema } from '../src/schemas/case.schema';
import type { CoverageReport } from './audit-coverage';
import { auditCoverage } from './audit-coverage';
import { parseCliArgs } from './cli';
import type { CaseSource } from './detect-duplicate-ids';
import { detectDuplicateIds } from './detect-duplicate-ids';
import {
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentBundleSources,
  readContentSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import type { ContentTextSource } from './validate-content';
import type { ValidatedConceptSource } from './validate-content';
import type { ValidatedDefinitionSource } from './validate-content';
import type { ValidatedFoundationSource } from './validate-content';
import type { ContentBundleTextSources } from './validate-content';
import {
  validateContentBundleSources,
  validateContentSources,
} from './validate-content';
import type { ContentIssue } from './validate-graph';
import { validateCaseGraph } from './validate-graph';

const defaultIndexFile = 'src/generated/case-index.ts';
const defaultConceptIndexFile = 'src/generated/concept-index.ts';
const defaultFoundationIndexFile = 'src/generated/foundation-index.ts';

function singleQuote(value: string): string {
  return `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')}'`;
}

function normalizeProjectFile(file: string): string {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

function relativeModuleSpecifier(
  outputFile: string,
  targetFile: string,
): string {
  const outputDirectory = posix.dirname(normalizeProjectFile(outputFile));
  const modulePath = posix.relative(
    outputDirectory,
    normalizeProjectFile(targetFile),
  );
  return modulePath.startsWith('.') ? modulePath : `./${modulePath}`;
}

function header(outputFile: string): string {
  const typesImport = relativeModuleSpecifier(
    outputFile,
    'src/domain/cases/types',
  );
  return `import type { FdeCase } from ${singleQuote(typesImport)};

export interface CaseIndexEntry {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly level: FdeCase['level'];
  readonly estimatedMinutes: number;
  readonly domains: readonly string[];
  readonly skills: readonly string[];
  readonly status: 'published';
  readonly version: number;
  readonly load: () => Promise<{ default: FdeCase }>;
}

`;
}

export function generateCaseIndex(
  sources: readonly CaseSource[],
  outputFile = defaultIndexFile,
): string {
  const published = sources
    .filter(({ case: candidate }) => candidate.status === 'published')
    .sort(
      (left, right) =>
        left.case.id.localeCompare(right.case.id) ||
        left.file.localeCompare(right.file),
    );

  const entries = published.map(({ file, case: candidate }) => {
    const importPath = relativeModuleSpecifier(outputFile, file);
    return `  {
    id: ${singleQuote(candidate.id)},
    slug: ${singleQuote(candidate.slug)},
    title: ${singleQuote(candidate.title)},
    summary: ${singleQuote(candidate.summary)},
    level: ${singleQuote(candidate.level)},
    estimatedMinutes: ${candidate.estimatedMinutes},
    domains: ${JSON.stringify(candidate.domains)},
    skills: ${JSON.stringify(candidate.skills)},
    status: 'published',
    version: ${candidate.metadata.version},
    load: () => import(${singleQuote(importPath)}) as Promise<{ default: FdeCase }>,
  }`;
  });

  return `${header(outputFile)}export const caseIndex: readonly CaseIndexEntry[] = [${
    entries.length === 0 ? '' : `\n${entries.join(',\n')},\n`
  }];\n`;
}

export function generateFoundationIndex(
  sources: readonly ValidatedFoundationSource[],
  outputFile = defaultFoundationIndexFile,
): string {
  const typeImport = relativeModuleSpecifier(
    outputFile,
    'src/domain/foundation/types',
  );
  const entries = [...sources]
    .sort(
      (left, right) =>
        left.foundation.order - right.foundation.order ||
        left.foundation.id.localeCompare(right.foundation.id) ||
        left.file.localeCompare(right.file),
    )
    .map(({ file, foundation }) => {
      const path = normalizeProjectFile(file);
      const importPath = relativeModuleSpecifier(outputFile, path);
      return `  {
    id: ${singleQuote(foundation.id)},
    title: ${singleQuote(foundation.title)},
    domain: ${singleQuote(foundation.domain)},
    track: ${singleQuote(foundation.track)},
    order: ${foundation.order},
    estimatedMinutes: ${foundation.estimatedMinutes},
    path: ${singleQuote(path)},
    load: () => import(${singleQuote(importPath)}) as Promise<{ default: FoundationKnowledge }>,
  }`;
    });

  return `import type { FoundationKnowledge, FoundationTrack } from ${singleQuote(typeImport)};

export interface FoundationIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly track: FoundationTrack;
  readonly order: number;
  readonly estimatedMinutes: number;
  readonly path: string;
  readonly load: () => Promise<{ default: FoundationKnowledge }>;
}

export const foundationIndex: readonly FoundationIndexEntry[] = [${entries.length === 0 ? '' : `\n${entries.join(',\n')},\n`}];
`;
}

export function generateConceptIndex(
  sources: readonly ValidatedConceptSource[],
  outputFile = defaultConceptIndexFile,
): string {
  const typeImport = relativeModuleSpecifier(
    outputFile,
    'src/domain/concepts/types',
  );
  const entries = [...sources]
    .sort(
      (left, right) =>
        left.concept.order - right.concept.order ||
        left.concept.id.localeCompare(right.concept.id) ||
        left.file.localeCompare(right.file),
    )
    .map(({ file, concept }) => {
      const path = normalizeProjectFile(file);
      const importPath = relativeModuleSpecifier(outputFile, path);
      return `  {
    id: ${singleQuote(concept.id)},
    title: ${singleQuote(concept.title)},
    technicalTerm: ${singleQuote(concept.technicalTerm)},
    category: ${singleQuote(concept.category)},
    order: ${concept.order},
    path: ${singleQuote(path)},
    load: () =>
      import(${singleQuote(importPath)}) as Promise<{
        default: ConceptKnowledge;
      }>,
  }`;
    });

  return `import type { ConceptKnowledge } from ${singleQuote(typeImport)};

export interface ConceptIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly technicalTerm: string;
  readonly category: ConceptKnowledge['category'];
  readonly order: number;
  readonly path: string;
  readonly load: () => Promise<{ default: ConceptKnowledge }>;
}

export const conceptIndex: readonly ConceptIndexEntry[] = [${entries.length === 0 ? '' : `\n${entries.join(',\n')},\n`}];
`;
}

export const contentArtifactPaths = {
  manifest: 'content/manifests/content-manifest.json',
  coverageReport: 'content/manifests/coverage-report.json',
  contentIndex: 'src/generated/content-index.ts',
  conceptIndex: 'src/generated/concept-index.ts',
  foundationIndex: 'src/generated/foundation-index.ts',
  schemas: {
    case: 'content/schemas/fde-case.schema.json',
    concept: 'content/schemas/concept.schema.json',
    foundation: 'content/schemas/foundation.schema.json',
    manifest: 'content/schemas/content-manifest.schema.json',
    pack: 'content/schemas/content-pack.schema.json',
    domain: 'content/schemas/domain.schema.json',
    skill: 'content/schemas/skill.schema.json',
    coverage: 'content/schemas/coverage.schema.json',
  },
} as const;

export interface ContentArtifactInput {
  config: ContentConfig;
  cases: readonly CaseSource[];
  domains: readonly ValidatedDefinitionSource<DomainDefinition>[];
  skills: readonly ValidatedDefinitionSource<SkillDefinition>[];
  concepts?: readonly ValidatedConceptSource[];
  foundations?: readonly ValidatedFoundationSource[];
  coverage: CoveragePlan;
}

export interface GeneratedContentArtifacts {
  manifest: ContentManifest;
  coverageReport: CoverageReport;
  files: Record<string, string>;
}

function stablePrettyJson(value: unknown): string {
  return `${JSON.stringify(JSON.parse(canonicalizeContent(value)), null, 2)}\n`;
}

function jsonSchema(
  schema: z.ZodType,
  fileName: string,
  title: string,
): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://fde-arena.local/schemas/${fileName}`,
    title,
    ...z.toJSONSchema(schema, { target: 'draft-2020-12' }),
  };
}

function schemaRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Generated JSON Schema is missing object ${path}.`);
  }
  return value as Record<string, unknown>;
}

export function generateFoundationJsonSchema(): Record<string, unknown> {
  const schema = jsonSchema(
    FoundationKnowledgeSchema,
    'foundation.schema.json',
    'FDE Arena Foundation Knowledge',
  );
  const properties = schemaRecord(schema.properties, 'properties');
  const content = schemaRecord(properties.content, 'properties.content');
  const contentProperties = schemaRecord(
    content.properties,
    'properties.content.properties',
  );
  const authoredFields = [
    schemaRecord(properties.title, 'properties.title'),
    ...[
      'simpleExplanation',
      'analogy',
      'technicalExplanation',
      'example',
      'commonMistakes',
    ].map((field) =>
      schemaRecord(
        contentProperties[field],
        `properties.content.properties.${field}`,
      ),
    ),
  ];
  authoredFields.forEach((field) => {
    field.pattern = FOUNDATION_AUTHORED_TEXT_PATTERN.source;
  });
  schemaRecord(properties.skills, 'properties.skills').uniqueItems = true;
  schemaRecord(properties.relatedCases, 'properties.relatedCases').uniqueItems =
    true;
  return schema;
}

export function generateConceptJsonSchema(): Record<string, unknown> {
  const schema = jsonSchema(
    ConceptKnowledgeSchema,
    'concept.schema.json',
    'FDE Arena Concept Knowledge',
  );
  const properties = schemaRecord(schema.properties, 'properties');
  [
    'title',
    'technicalTerm',
    'simpleExplanation',
    'analogy',
    'technicalExplanation',
    'whyItMatters',
    'commonMistakes',
  ].forEach((field) => {
    schemaRecord(properties[field], `properties.${field}`).pattern =
      CONCEPT_AUTHORED_TEXT_PATTERN.source;
  });
  schemaRecord(
    properties.relatedFoundation,
    'properties.relatedFoundation',
  ).uniqueItems = true;
  schemaRecord(properties.relatedCases, 'properties.relatedCases').uniqueItems =
    true;
  return schema;
}

function generateContentIndex(
  input: ContentArtifactInput,
  manifest: ContentManifest,
): string {
  const outputFile = contentArtifactPaths.contentIndex;
  const contractsImport = relativeModuleSpecifier(
    outputFile,
    'src/content/contracts',
  );
  const caseTypeImport = relativeModuleSpecifier(
    outputFile,
    'src/domain/cases/types',
  );
  const manifestImport = relativeModuleSpecifier(
    outputFile,
    contentArtifactPaths.manifest,
  );
  const coverageImport = relativeModuleSpecifier(
    outputFile,
    'content/coverage/coverage-plan.json',
  );
  const sortedDomains = [...input.domains].sort((left, right) =>
    left.value.id.localeCompare(right.value.id),
  );
  const sortedSkills = [...input.skills].sort((left, right) =>
    left.value.id.localeCompare(right.value.id),
  );
  const sortedCases = [...manifest.cases].sort(
    (left, right) =>
      left.caseId.localeCompare(right.caseId) ||
      left.version - right.version ||
      left.path.localeCompare(right.path),
  );
  const definitionImports = [
    ...sortedDomains.map(
      ({ file }, index) =>
        `import domain${index} from ${singleQuote(relativeModuleSpecifier(outputFile, file))};`,
    ),
    ...sortedSkills.map(
      ({ file }, index) =>
        `import skill${index} from ${singleQuote(relativeModuleSpecifier(outputFile, file))};`,
    ),
  ];
  const entries = sortedCases.map(
    (entry) => `  {
    caseId: ${singleQuote(entry.caseId)},
    version: ${entry.version},
    schemaVersion: ${entry.schemaVersion},
    status: ${singleQuote(entry.status)},
    path: ${singleQuote(entry.path)},
    contentHash: ${singleQuote(entry.contentHash)},
    load: () => import(${singleQuote(relativeModuleSpecifier(outputFile, entry.path))}) as Promise<{ default: FdeCase }>,
  }`,
  );
  const domainNames = sortedDomains.map((_, index) => `domain${index}`);
  const skillNames = sortedSkills.map((_, index) => `skill${index}`);

  return `import type { ContentManifest, CoveragePlan, DomainDefinition, SkillDefinition } from ${singleQuote(contractsImport)};
import type { FdeCase } from ${singleQuote(caseTypeImport)};
import manifestJson from ${singleQuote(manifestImport)};
import coverageJson from ${singleQuote(coverageImport)};
${definitionImports.length === 0 ? '' : `${definitionImports.join('\n')}\n`}
export interface ContentIndexEntry {
  readonly caseId: string;
  readonly version: number;
  readonly schemaVersion: number;
  readonly status: FdeCase['status'];
  readonly path: string;
  readonly contentHash: string;
  readonly load: () => Promise<{ default: FdeCase }>;
}

export const bundledContentManifest = manifestJson as unknown as ContentManifest;
export const bundledCoveragePlan = coverageJson as unknown as CoveragePlan;
export const bundledDomains = [${domainNames.length === 0 ? '' : `\n  ${domainNames.join(',\n  ')},\n`}] as unknown as readonly DomainDefinition[];
export const bundledSkills = [${skillNames.length === 0 ? '' : `\n  ${skillNames.join(',\n  ')},\n`}] as unknown as readonly SkillDefinition[];
export const contentIndex: readonly ContentIndexEntry[] = [${entries.length === 0 ? '' : `\n${entries.join(',\n')},\n`}];
`;
}

export function generateContentArtifacts(
  input: ContentArtifactInput,
): GeneratedContentArtifacts {
  const sortedCases = [...input.cases].sort(
    (left, right) =>
      left.case.id.localeCompare(right.case.id) ||
      left.case.metadata.version - right.case.metadata.version ||
      left.file.localeCompare(right.file),
  );
  const manifestCases = sortedCases.map(({ file, case: candidate }) => ({
    caseId: candidate.id,
    version: candidate.metadata.version,
    schemaVersion: candidate.schemaVersion,
    status: candidate.status,
    path: normalizeProjectFile(file),
    contentHash: sha256Content(candidate),
  }));
  const activeCases = [...input.config.activeCases].sort(
    (left, right) =>
      left.caseId.localeCompare(right.caseId) || left.version - right.version,
  );
  const activeCaseByKey = new Map(
    sortedCases.map(({ case: candidate }) => [
      `${candidate.id}@${candidate.metadata.version}`,
      candidate,
    ]),
  );
  const domainCaseCounts = Object.fromEntries(
    input.domains
      .map(({ value }) => value.id)
      .sort((left, right) => left.localeCompare(right))
      .map((id) => [id, 0]),
  );
  activeCases.forEach(({ caseId, version }) => {
    const candidate = activeCaseByKey.get(`${caseId}@${version}`);
    if (candidate?.status !== 'published') {
      throw new Error(
        `Active case ${caseId}@${version} is missing or not published.`,
      );
    }
    new Set(candidate.domains).forEach((domainId) => {
      domainCaseCounts[domainId] = (domainCaseCounts[domainId] ?? 0) + 1;
    });
  });
  const manifestWithoutChecksum = {
    packId: input.config.packId,
    displayName: input.config.displayName,
    contentVersion: input.config.contentVersion,
    schemaVersion: 1,
    releasedAt: input.config.releasedAt,
    activePublishedCaseCount: activeCases.length,
    caseVersionCount: manifestCases.length,
    activeCases,
    activeCaseIds: activeCases.map(({ caseId }) => caseId),
    allCaseIds: [...new Set(manifestCases.map(({ caseId }) => caseId))].sort(),
    domains: input.domains.map(({ value }) => value.id).sort(),
    domainCaseCounts,
    cases: manifestCases,
  } satisfies Omit<ContentManifest, 'checksum'>;
  const checksum = sha256Content({
    formatVersion: 1,
    manifest: manifestWithoutChecksum,
    cases: sortedCases.map(({ case: candidate }) => candidate),
    domains: input.domains.map(({ value }) => value),
    skills: input.skills.map(({ value }) => value),
    coverage: input.coverage,
  });
  const manifest = ContentManifestSchema.parse({
    ...manifestWithoutChecksum,
    checksum,
  });
  const coverageReport = auditCoverage(
    sortedCases.map(({ case: candidate }) => candidate),
    [],
    { activeCases, plan: input.coverage },
  );
  const files: Record<string, string> = {
    [contentArtifactPaths.manifest]: stablePrettyJson(manifest),
    [contentArtifactPaths.coverageReport]: stablePrettyJson(coverageReport),
    [contentArtifactPaths.contentIndex]: generateContentIndex(input, manifest),
    [contentArtifactPaths.conceptIndex]: generateConceptIndex(
      input.concepts ?? [],
    ),
    [contentArtifactPaths.foundationIndex]: generateFoundationIndex(
      input.foundations ?? [],
    ),
    [contentArtifactPaths.schemas.case]: stablePrettyJson(
      jsonSchema(FdeCaseSchema, 'fde-case.schema.json', 'FDE Arena Case'),
    ),
    [contentArtifactPaths.schemas.concept]: stablePrettyJson(
      generateConceptJsonSchema(),
    ),
    [contentArtifactPaths.schemas.foundation]: stablePrettyJson(
      generateFoundationJsonSchema(),
    ),
    [contentArtifactPaths.schemas.manifest]: stablePrettyJson(
      jsonSchema(
        ContentManifestSchema,
        'content-manifest.schema.json',
        'FDE Arena Content Manifest',
      ),
    ),
    [contentArtifactPaths.schemas.pack]: stablePrettyJson(
      jsonSchema(
        ContentPackSchema,
        'content-pack.schema.json',
        'FDE Arena Content Pack',
      ),
    ),
    [contentArtifactPaths.schemas.domain]: stablePrettyJson(
      jsonSchema(
        DomainDefinitionSchema,
        'domain.schema.json',
        'FDE Arena Domain',
      ),
    ),
    [contentArtifactPaths.schemas.skill]: stablePrettyJson(
      jsonSchema(SkillDefinitionSchema, 'skill.schema.json', 'FDE Arena Skill'),
    ),
    [contentArtifactPaths.schemas.coverage]: stablePrettyJson(
      jsonSchema(
        CoveragePlanSchema,
        'coverage.schema.json',
        'FDE Arena Coverage Plan',
      ),
    ),
  };
  return { manifest, coverageReport, files };
}

export function findContentArtifactDrift(
  expected: Readonly<Record<string, string>>,
  read: (path: string) => string | null,
): string[] {
  return Object.keys(expected)
    .sort((left, right) => left.localeCompare(right))
    .filter((path) => read(path) !== expected[path]);
}

export interface ValidatedContentArtifactsResult {
  artifacts: GeneratedContentArtifacts | null;
  issues: ContentIssue[];
  coverage: CoverageReport;
}

export function buildValidatedContentArtifacts(
  sources: ContentBundleTextSources,
): ValidatedContentArtifactsResult {
  const validation = validateContentBundleSources(sources);
  const graphIssues = validation.cases.flatMap(({ file, case: candidate }) =>
    validateCaseGraph(candidate, file),
  );
  const duplicateIssues = detectDuplicateIds(validation.cases).map(
    (issue): ContentIssue => ({
      file: issue.files.join(', '),
      path: [issue.kind, issue.id],
      code: `duplicate_${issue.kind}_id`,
      message: issue.message,
    }),
  );
  const coverage = auditCoverage(
    validation.cases.map(({ case: candidate }) => candidate),
    [],
    {
      ...(validation.config === null
        ? {}
        : { activeCases: validation.config.activeCases }),
      ...(validation.coverage === null ? {} : { plan: validation.coverage }),
    },
  );
  const coverageIssues = coverage.gaps
    .filter(({ severity }) => severity === 'error')
    .map((gap): ContentIssue => ({
      file: '<coverage>',
      path: ['coverage'],
      code: gap.code,
      message: gap.message,
    }));
  const issues = [
    ...validation.issues,
    ...graphIssues,
    ...duplicateIssues,
    ...coverageIssues,
  ].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.path.join('.').localeCompare(right.path.join('.')) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  );
  if (
    issues.length > 0 ||
    validation.config === null ||
    validation.coverage === null
  ) {
    return { artifacts: null, issues, coverage };
  }
  return {
    artifacts: generateContentArtifacts({
      config: validation.config,
      cases: validation.cases,
      domains: validation.domains,
      skills: validation.skills,
      concepts: validation.concepts,
      foundations: validation.foundations,
      coverage: validation.coverage,
    }),
    issues,
    coverage,
  };
}

export interface ValidatedIndexResult {
  content: string | null;
  issues: ContentIssue[];
  coverage: CoverageReport;
}

export function buildValidatedCaseIndex(
  sources: readonly ContentTextSource[],
  options: {
    outputFile?: string;
    indexedCaseIds?: readonly string[];
  } = {},
): ValidatedIndexResult {
  const validation = validateContentSources(sources);
  const graphIssues = validation.cases.flatMap(({ file, case: candidate }) =>
    validateCaseGraph(candidate, file),
  );
  const duplicateIssues = detectDuplicateIds(validation.cases).map(
    (issue): ContentIssue => ({
      file: issue.files.join(', '),
      path: [issue.kind, issue.id],
      code: `duplicate_${issue.kind}_id`,
      message: issue.message,
    }),
  );
  const parsedCases = validation.cases.map(({ case: candidate }) => candidate);
  const intendedIndexIds = validation.cases
    .filter(({ case: candidate }) => candidate.status === 'published')
    .map(({ case: candidate }) => candidate.id);
  const coverage = auditCoverage(
    parsedCases,
    options.indexedCaseIds ?? intendedIndexIds,
  );
  const coverageIssues = coverage.gaps
    .filter(({ severity }) => severity === 'error')
    .map((gap): ContentIssue => ({
      file: '<coverage>',
      path: ['coverage'],
      code: gap.code,
      message: gap.message,
    }));
  const issues = [
    ...validation.issues,
    ...graphIssues,
    ...duplicateIssues,
    ...coverageIssues,
  ].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.path.join('.').localeCompare(right.path.join('.')) ||
      left.code.localeCompare(right.code),
  );
  return {
    content:
      issues.length === 0
        ? generateCaseIndex(validation.cases, options.outputFile)
        : null,
    issues,
    coverage,
  };
}

export interface IndexOutputAdapter {
  exists(output: string): boolean;
  write(output: string, content: string): void;
}

export interface IndexEmitResult {
  content: string;
  written: boolean;
  reason: 'written' | 'dry-run' | 'exists';
}

export function emitCaseIndex(
  content: string,
  options: { output: string; dryRun: boolean; skipExisting: boolean },
  adapter: IndexOutputAdapter,
): IndexEmitResult {
  if (options.dryRun) {
    return { content, written: false, reason: 'dry-run' };
  }
  if (options.skipExisting && adapter.exists(options.output)) {
    return { content, written: false, reason: 'exists' };
  }
  adapter.write(options.output, content);
  return { content, written: true, reason: 'written' };
}

export function runBuildCaseIndexCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      check: true,
      dryRun: true,
      limit: true,
      input: true,
      output: true,
      skipExisting: true,
    });
    if (options.check && options.output !== undefined) {
      throw new Error('--check cannot be combined with --output.');
    }
    if (options.check && options.dryRun) {
      throw new Error('--check cannot be combined with --dry-run.');
    }
    if (options.output === undefined) {
      if (options.skipExisting) {
        throw new Error('--skip-existing requires --output.');
      }
      const sources = readContentBundleSources(PROJECT_ROOT, {
        ...(options.input === undefined ? {} : { casesInput: options.input }),
        ...(options.limit === undefined ? {} : { limit: options.limit }),
      });
      if (options.limit !== undefined) {
        if (!options.dryRun) {
          throw new Error(
            '--limit for complete artifact generation requires --dry-run.',
          );
        }
        const validation = validateContentBundleSources(sources);
        const graphIssues = validation.cases.flatMap(
          ({ file, case: candidate }) => validateCaseGraph(candidate, file),
        );
        const duplicateIssues = detectDuplicateIds(validation.cases).map(
          (issue): ContentIssue => ({
            file: issue.files.join(', '),
            path: [issue.kind, issue.id],
            code: `duplicate_${issue.kind}_id`,
            message: issue.message,
          }),
        );
        const issues = [
          ...validation.issues,
          ...graphIssues,
          ...duplicateIssues,
        ].sort(
          (left, right) =>
            left.file.localeCompare(right.file) ||
            left.path.join('.').localeCompare(right.path.join('.')) ||
            left.code.localeCompare(right.code) ||
            left.message.localeCompare(right.message),
        );
        if (issues.length > 0) {
          writeCliReport(
            `${JSON.stringify({ ok: false, issues }, null, 2)}\n`,
            false,
          );
          return 1;
        }
        generateCaseIndex(validation.cases);
        generateConceptIndex(validation.concepts);
        generateFoundationIndex(validation.foundations);
        process.stdout.write(
          `${JSON.stringify(
            {
              ok: true,
              sampledCases: validation.cases.length,
              sampledConcepts: validation.concepts.length,
              sampledFoundations: validation.foundations.length,
              files: [
                contentArtifactPaths.contentIndex,
                contentArtifactPaths.conceptIndex,
                contentArtifactPaths.foundationIndex,
              ],
            },
            null,
            2,
          )}\n`,
        );
        return 0;
      }
      const result = buildValidatedContentArtifacts(sources);
      if (result.artifacts === null) {
        writeCliReport(
          `${JSON.stringify({ ok: false, issues: result.issues }, null, 2)}\n`,
          false,
        );
        return 1;
      }
      if (options.check) {
        const drift = findContentArtifactDrift(
          result.artifacts.files,
          (projectFile) => {
            const file = resolveSafeProjectPath(PROJECT_ROOT, projectFile);
            return existsSync(file) ? readFileSync(file, 'utf8') : null;
          },
        );
        writeCliReport(
          `${JSON.stringify({ ok: drift.length === 0, drift }, null, 2)}\n`,
          drift.length === 0,
        );
        return drift.length === 0 ? 0 : 1;
      }
      if (options.dryRun) {
        process.stdout.write(
          `${JSON.stringify({ ok: true, files: Object.keys(result.artifacts.files).sort() }, null, 2)}\n`,
        );
        return 0;
      }
      Object.entries(result.artifacts.files)
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([projectFile, content]) => {
          const file = resolveSafeProjectPath(PROJECT_ROOT, projectFile);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, content, 'utf8');
        });
      process.stdout.write(
        `${JSON.stringify({ ok: true, written: Object.keys(result.artifacts.files).sort() }, null, 2)}\n`,
      );
      return 0;
    }

    const output = resolveSafeProjectPath(PROJECT_ROOT, options.output);
    const outputFile = relative(PROJECT_ROOT, output).split(sep).join('/');
    const result = buildValidatedCaseIndex(
      readContentSources(
        PROJECT_ROOT,
        options.input ?? 'content/cases',
        options.limit === undefined ? {} : { limit: options.limit },
      ),
      { outputFile, indexedCaseIds: caseIndex.map(({ id }) => id) },
    );
    if (result.content === null) {
      writeCliReport(
        `${JSON.stringify({ ok: false, issues: result.issues }, null, 2)}\n`,
        false,
      );
      return 1;
    }
    const emitted = emitCaseIndex(
      result.content,
      {
        output,
        dryRun: options.dryRun,
        skipExisting: options.skipExisting,
      },
      {
        exists: existsSync,
        write: (file, content) => writeFileSync(file, content, 'utf8'),
      },
    );
    if (options.dryRun) {
      process.stdout.write(emitted.content);
    } else {
      process.stdout.write(
        `${JSON.stringify({ ok: true, written: emitted.written, reason: emitted.reason })}\n`,
      );
    }
    return 0;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runBuildCaseIndexCli(process.argv.slice(2));
}
