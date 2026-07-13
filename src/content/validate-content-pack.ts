import type { FdeCase } from '../domain/cases/types';
import { canonicalizeContent } from './canonicalize';
import {
  CURRENT_CONTENT_SCHEMA_VERSION,
  MAX_CONTENT_TEXT_LENGTH,
  MAX_EVIDENCE_PER_NODE,
  MAX_NODES_PER_CASE,
  MAX_OPTIONS_PER_NODE,
  type ContentPack,
} from './contracts';
import { detectDuplicateIds } from './detect-duplicate-ids';
import { sha256Content } from './hash';
import { parseCaseContent } from './parse-content';
import { ContentPackEnvelopeSchema, ContentPackSchema } from './schemas';
import { validateCaseGraph } from './validate-case-graph';

const MAX_BRANCH_DEPTH = MAX_NODES_PER_CASE;
const UNSAFE_CONTENT_PATTERN =
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|math)\b|\bon[a-z]+\s*=|javascript\s*:/i;

function contentKey(content: FdeCase): string {
  return `${content.id}@${content.metadata.version}`;
}

function assertSafeStrings(value: unknown, path = '$'): void {
  if (typeof value === 'string') {
    if (value.length > MAX_CONTENT_TEXT_LENGTH) {
      throw new Error(`${path} exceeds the content text length limit.`);
    }
    if (UNSAFE_CONTENT_PATTERN.test(value)) {
      throw new Error(`${path} contains unsafe executable content.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertSafeStrings(entry, `${path}[${index}]`),
    );
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) =>
      assertSafeStrings(entry, `${path}.${key}`),
    );
  }
}

function assertUniqueIds(
  values: readonly { id: string }[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const { id } of values) {
    if (seen.has(id)) throw new Error(`Duplicate ${label} ID ${id}.`);
    seen.add(id);
  }
}

function assertCaseLimits(content: FdeCase): void {
  if (content.nodes.length > MAX_NODES_PER_CASE) {
    throw new Error(`Case ${content.id} exceeds the node limit.`);
  }
  for (const node of content.nodes) {
    if (node.options.length > MAX_OPTIONS_PER_NODE) {
      throw new Error(`Node ${node.id} exceeds the option limit.`);
    }
    if (node.evidence.length > MAX_EVIDENCE_PER_NODE) {
      throw new Error(`Node ${node.id} exceeds the evidence limit.`);
    }
  }

  const nodeById = new Map(content.nodes.map((node) => [node.id, node]));
  const visit = (nodeId: string, path: ReadonlySet<string>, depth: number) => {
    if (depth > MAX_BRANCH_DEPTH) {
      throw new Error(`Case ${content.id} exceeds the branch depth limit.`);
    }
    if (path.has(nodeId)) return;
    const node = nodeById.get(nodeId);
    if (node === undefined) return;
    const nextPath = new Set(path).add(nodeId);
    node.branches.forEach(({ nextNodeId }) => {
      if (nextNodeId !== null) visit(nextNodeId, nextPath, depth + 1);
    });
  };
  visit(content.startNodeId, new Set(), 1);
}

export function validateCaseSafetyAndLimits(content: FdeCase): void {
  assertSafeStrings(content);
  assertCaseLimits(content);
}

function assertSameStringSet(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (
    canonicalizeContent(normalizedActual) !==
    canonicalizeContent(normalizedExpected)
  ) {
    throw new Error(`${label} does not match the content pack.`);
  }
}

export async function validateAndNormalizeContentPack(
  input: ContentPack,
): Promise<ContentPack> {
  assertSafeStrings(input);
  const envelope = ContentPackEnvelopeSchema.parse(input);
  if (envelope.manifest.schemaVersion > CURRENT_CONTENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported content schema version ${envelope.manifest.schemaVersion}.`,
    );
  }
  if (envelope.manifest.schemaVersion !== CURRENT_CONTENT_SCHEMA_VERSION) {
    throw new Error(
      `No migration is registered for content schema version ${envelope.manifest.schemaVersion}.`,
    );
  }

  const cases = envelope.cases.map(parseCaseContent);
  const pack = ContentPackSchema.parse({ ...envelope, cases });
  assertUniqueIds(pack.domains, 'domain');
  assertUniqueIds(pack.skills, 'skill');

  const domainById = new Map(
    pack.domains.map((definition) => [definition.id, definition]),
  );
  const skillById = new Map(
    pack.skills.map((definition) => [definition.id, definition]),
  );
  for (const definition of pack.skills) {
    if (!domainById.has(definition.domainId)) {
      throw new Error(
        `Skill ${definition.id} references missing domain ${definition.domainId}.`,
      );
    }
  }
  for (const entry of pack.coverage.domains) {
    if (!domainById.has(entry.domainId)) {
      throw new Error(`Coverage references missing domain ${entry.domainId}.`);
    }
  }

  const duplicateIssues = detectDuplicateIds(
    pack.cases.map((content) => ({ file: contentKey(content), case: content })),
  );
  if (duplicateIssues.length > 0) {
    throw new Error(duplicateIssues[0]!.message);
  }

  const casesByKey = new Map<string, FdeCase>();
  for (const content of pack.cases) {
    const key = contentKey(content);
    if (casesByKey.has(key)) throw new Error(`Duplicate case version ${key}.`);
    casesByKey.set(key, content);
    validateCaseSafetyAndLimits(content);
    const graphIssues = validateCaseGraph(content, key);
    if (graphIssues.length > 0) {
      throw new Error(`${key}: ${graphIssues[0]!.message}`);
    }
    content.domains.forEach((id) => {
      if (!domainById.has(id)) {
        throw new Error(`Case ${key} references missing domain ${id}.`);
      }
    });
    content.skills.forEach((id) => {
      if (!skillById.has(id)) {
        throw new Error(`Case ${key} references missing skill ${id}.`);
      }
    });
    content.nodes.forEach((node) => {
      Object.keys(node.skillWeights).forEach((id) => {
        if (!skillById.has(id)) {
          throw new Error(`Node ${node.id} references missing skill ${id}.`);
        }
      });
    });
  }

  if (pack.manifest.cases.length !== pack.cases.length) {
    throw new Error('Manifest case entries do not match case versions.');
  }
  const manifestKeys = new Set<string>();
  for (const entry of pack.manifest.cases) {
    const key = `${entry.caseId}@${entry.version}`;
    if (manifestKeys.has(key))
      throw new Error(`Duplicate manifest case ${key}.`);
    manifestKeys.add(key);
    const content = casesByKey.get(key);
    if (content === undefined)
      throw new Error(`Manifest case ${key} is missing.`);
    if (
      entry.schemaVersion !== content.schemaVersion ||
      entry.status !== content.status
    ) {
      throw new Error(`Manifest metadata for ${key} does not match its case.`);
    }
    if ((await sha256Content(content)) !== entry.contentHash) {
      throw new Error(`Manifest contentHash for ${key} does not match.`);
    }
  }
  for (const key of casesByKey.keys()) {
    if (!manifestKeys.has(key))
      throw new Error(`Case ${key} is absent from the manifest.`);
  }

  assertSameStringSet(
    pack.manifest.allCaseIds,
    [...new Set(pack.cases.map(({ id }) => id))],
    'Manifest allCaseIds',
  );
  assertSameStringSet(
    pack.manifest.domains,
    pack.domains.map(({ id }) => id),
    'Manifest domains',
  );

  const activeKeys = new Set<string>();
  const expectedDomainCounts = Object.fromEntries(
    pack.domains.map(({ id }) => [id, 0]),
  );
  for (const active of pack.manifest.activeCases) {
    const key = `${active.caseId}@${active.version}`;
    if (activeKeys.has(key)) throw new Error(`Duplicate active case ${key}.`);
    activeKeys.add(key);
    const content = casesByKey.get(key);
    if (content?.status !== 'published') {
      throw new Error(`Active case ${key} is missing or not published.`);
    }
    content.domains.forEach((id) => {
      if (domainById.get(id)?.status !== 'active') {
        throw new Error(`Active case ${key} references inactive domain ${id}.`);
      }
    });
    content.skills.forEach((id) => {
      if (skillById.get(id)?.status !== 'active') {
        throw new Error(`Active case ${key} references inactive skill ${id}.`);
      }
    });
    new Set(content.domains).forEach((id) => {
      expectedDomainCounts[id] = (expectedDomainCounts[id] ?? 0) + 1;
    });
  }
  if (
    canonicalizeContent(pack.manifest.domainCaseCounts) !==
    canonicalizeContent(expectedDomainCounts)
  ) {
    throw new Error('Manifest domainCaseCounts does not match active cases.');
  }

  const { checksum, ...manifestWithoutChecksum } = pack.manifest;
  const expectedChecksum = await sha256Content({
    formatVersion: pack.formatVersion,
    manifest: manifestWithoutChecksum,
    cases: pack.cases,
    domains: pack.domains,
    skills: pack.skills,
    coverage: pack.coverage,
  });
  if (expectedChecksum !== checksum) {
    throw new Error('Content pack checksum does not match its contents.');
  }

  return pack;
}
