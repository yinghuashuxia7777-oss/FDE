import { existsSync } from 'node:fs';

import type { SkillDefinition } from '../src/content/contracts';
import { SkillDefinitionSchema } from '../src/content/schemas';
import { validateSkillGraphCatalog } from '../src/content/skill-graph-validator';
import type {
  SkillRubricCatalog,
  SkillRubricStatus,
} from '../src/domain/skills/rubric-types';
import type { SkillGraphCatalog } from '../src/domain/skills/types';
import {
  REQUIRED_PUBLISHED_LEAF_COUNT,
  V2_PRESENTATION_TARGET_IDS,
} from '../src/domain/skills/types';
import { SkillGraphCatalogSchema } from '../src/content/skill-graph-schema';
import { SkillRubricCatalogSchema } from '../src/content/skill-rubric-schema';

import {
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
} from './files';
import { readSkillCatalogSources } from './knowledge-v2-files';

type ExplorerFormat = 'json' | 'text';

interface ExplorerOptions {
  format: ExplorerFormat;
  input: string;
}

export interface SkillGraphExplorerLeaf {
  id: string;
  name: string;
  capabilityLevel: number;
  status: string;
  prerequisites: string[];
  rubric: {
    version: number | null;
    status: SkillRubricStatus | 'not-linked' | 'missing';
  };
}

export interface SkillGraphExplorerLegacySkill {
  id: string;
  name: string;
  status: SkillDefinition['status'];
  presentationTarget: string | null;
  leaves: SkillGraphExplorerLeaf[];
}

export interface SkillGraphExplorerReport {
  ok: true;
  catalog: {
    version: string;
    status: SkillGraphCatalog['status'];
    definedLeafCount: number;
    expectedLeafCount: number;
  };
  legacySkills: SkillGraphExplorerLegacySkill[];
  unmappedLeafIds: string[];
}

function parseExplorerArgs(args: readonly string[]): ExplorerOptions {
  let format: ExplorerFormat = 'text';
  let input = 'content/skill-graph/v2/releases';
  const seen = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option !== '--format' && option !== '--input') {
      throw new Error(`Unknown option: ${option ?? ''}`);
    }
    if (seen.has(option)) throw new Error(`Duplicate option: ${option}`);
    seen.add(option);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${option} requires a value`);
    }
    index += 1;
    if (option === '--format') {
      if (value !== 'json' && value !== 'text') {
        throw new Error(`Unsupported format: ${value}`);
      }
      format = value;
    } else {
      input = value;
    }
  }

  return { format, input };
}

function compareSemanticVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function readSelectedCatalog(root: string, input: string): SkillGraphCatalog {
  const candidates = readSkillCatalogSources(root, input).map(
    ({ file, text }) => ({
      file,
      catalog: SkillGraphCatalogSchema.parse(JSON.parse(text) as unknown),
    }),
  );
  const fileByCatalogVersion = new Map<string, string>();
  candidates.forEach(({ catalog, file }) => {
    const firstFile = fileByCatalogVersion.get(catalog.catalogVersion);
    if (firstFile !== undefined) {
      throw new Error(
        `Duplicate skill catalog version: ${catalog.catalogVersion} (${firstFile}, ${file})`,
      );
    }
    fileByCatalogVersion.set(catalog.catalogVersion, file);
  });
  const selected = candidates.sort(
    (left, right) =>
      compareSemanticVersions(
        right.catalog.catalogVersion,
        left.catalog.catalogVersion,
      ) || left.file.localeCompare(right.file),
  )[0];
  if (selected === undefined) {
    throw new Error(`No skill graph catalog found under ${input}`);
  }
  return selected.catalog;
}

function readLegacySkills(root: string): SkillDefinition[] {
  return readContentSources(root, 'content/skills')
    .map(({ text }) => SkillDefinitionSchema.parse(JSON.parse(text) as unknown))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function readRubricCatalogs(root: string): SkillRubricCatalog[] {
  const input = 'content/skill-rubrics/v1';
  const path = resolveSafeProjectPath(root, input);
  if (!existsSync(path)) return [];
  return readContentSources(root, input)
    .map(({ text }) =>
      SkillRubricCatalogSchema.parse(JSON.parse(text) as unknown),
    )
    .sort((left, right) =>
      left.rubricSetVersion.localeCompare(right.rubricSetVersion),
    );
}

export function createSkillGraphExplorerReport(
  catalog: SkillGraphCatalog,
  legacySkills: readonly SkillDefinition[],
  rubricCatalogs: readonly SkillRubricCatalog[],
): SkillGraphExplorerReport {
  const matchingRubricCatalogs = rubricCatalogs.filter(
    ({ skillCatalogVersion }) => skillCatalogVersion === catalog.catalogVersion,
  );
  if (matchingRubricCatalogs.length > 1) {
    throw new Error(
      `Multiple rubric catalogs match selected skill catalog: ${catalog.catalogVersion}`,
    );
  }
  const matchingPublishedRubrics =
    matchingRubricCatalogs[0]?.status === 'published'
      ? matchingRubricCatalogs[0].rubrics.filter(
          ({ status }) => status === 'published',
        )
      : [];
  const semanticIssues = validateSkillGraphCatalog(catalog, {
    legacySkillIds: legacySkills.map(({ id }) => id),
    publishedRubricRefs: matchingPublishedRubrics.map(
      ({ skillId, version }) => ({ skillId, version }),
    ),
    expectedLeafCount: REQUIRED_PUBLISHED_LEAF_COUNT,
    presentationSkillIds: V2_PRESENTATION_TARGET_IDS,
  });
  if (semanticIssues.length > 0) {
    throw new Error(
      `Skill graph catalog failed semantic validation: ${JSON.stringify(semanticIssues)}`,
    );
  }

  const leavesById = new Map(catalog.leaves.map((leaf) => [leaf.id, leaf]));
  const prerequisitesByDependent = new Map<string, string[]>();
  const canonicalRollupByLeaf = new Map<string, string>();
  const canonicalPresentationByLegacy = new Map<string, string>();

  catalog.edges.forEach((edge) => {
    if (edge.type === 'prerequisite') {
      const prerequisites =
        prerequisitesByDependent.get(edge.dependentSkillId) ?? [];
      prerequisites.push(edge.prerequisiteSkillId);
      prerequisitesByDependent.set(edge.dependentSkillId, prerequisites);
    } else if (edge.type === 'rolls-up-to' && edge.canonical) {
      canonicalRollupByLeaf.set(edge.leafSkillId, edge.legacySkillId);
    } else if (edge.type === 'presents-as' && edge.canonical) {
      canonicalPresentationByLegacy.set(
        edge.legacySkillId,
        edge.presentationSkillId,
      );
    }
  });
  prerequisitesByDependent.forEach((prerequisites) => prerequisites.sort());

  const rubricsByIdentity = new Map<
    string,
    SkillRubricCatalog['rubrics'][number]
  >();
  matchingRubricCatalogs.forEach(({ rubrics }) => {
    rubrics.forEach((rubric) => {
      const identity = `${rubric.skillId}@${rubric.version}`;
      if (rubricsByIdentity.has(identity)) {
        throw new Error(
          `Duplicate rubric identity for selected catalog: ${identity}`,
        );
      }
      rubricsByIdentity.set(identity, rubric);
    });
  });
  const legacyEntries = [...legacySkills]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((legacy): SkillGraphExplorerLegacySkill => {
      const leaves = [...canonicalRollupByLeaf.entries()]
        .filter(([, legacySkillId]) => legacySkillId === legacy.id)
        .map(([leafSkillId]) => leavesById.get(leafSkillId))
        .filter((leaf) => leaf !== undefined)
        .sort(
          (left, right) =>
            left.capabilityLevel - right.capabilityLevel ||
            left.id.localeCompare(right.id),
        )
        .map((leaf): SkillGraphExplorerLeaf => {
          const version = leaf.activeRubricVersion;
          const rubric =
            version === null
              ? undefined
              : rubricsByIdentity.get(`${leaf.id}@${version}`);
          return {
            id: leaf.id,
            name: leaf.name,
            capabilityLevel: leaf.capabilityLevel,
            status: leaf.status,
            prerequisites: [...(prerequisitesByDependent.get(leaf.id) ?? [])],
            rubric: {
              version,
              status:
                version === null ? 'not-linked' : (rubric?.status ?? 'missing'),
            },
          };
        });
      return {
        id: legacy.id,
        name: legacy.label,
        status: legacy.status,
        presentationTarget:
          canonicalPresentationByLegacy.get(legacy.id) ?? null,
        leaves,
      };
    });

  return {
    ok: true,
    catalog: {
      version: catalog.catalogVersion,
      status: catalog.status,
      definedLeafCount: catalog.leaves.length,
      expectedLeafCount: catalog.expectedLeafCount,
    },
    legacySkills: legacyEntries,
    unmappedLeafIds: catalog.leaves
      .filter(({ id }) => !canonicalRollupByLeaf.has(id))
      .map(({ id }) => id)
      .sort(),
  };
}

function rubricLabel(leaf: SkillGraphExplorerLeaf): string {
  if (leaf.rubric.status === 'not-linked') return 'not linked';
  if (leaf.rubric.status === 'missing') {
    return `missing v${leaf.rubric.version ?? '?'}`;
  }
  return `${leaf.rubric.status} v${leaf.rubric.version ?? '?'}`;
}

export function renderSkillGraphExplorerText(
  report: SkillGraphExplorerReport,
): string {
  const lines = [
    `Skill Graph ${report.catalog.version} (${report.catalog.status})`,
    `${report.catalog.definedLeafCount}/${report.catalog.expectedLeafCount} leaf skills defined`,
    '',
  ];
  report.legacySkills.forEach((legacy) => {
    lines.push(
      `${legacy.id} — ${legacy.name}${
        legacy.presentationTarget === null
          ? ''
          : ` -> ${legacy.presentationTarget}`
      }`,
    );
    if (legacy.leaves.length === 0) {
      lines.push('  └─ (no canonical leaf mapping)');
      return;
    }
    legacy.leaves.forEach((leaf, index) => {
      const branch = index === legacy.leaves.length - 1 ? '└─' : '├─';
      lines.push(
        `  ${branch} ${leaf.id} [L${leaf.capabilityLevel}, ${leaf.status}]`,
        `     prerequisites: ${
          leaf.prerequisites.length === 0
            ? 'none'
            : leaf.prerequisites.join(', ')
        }`,
        `     rubric: ${rubricLabel(leaf)}`,
      );
    });
  });
  if (report.unmappedLeafIds.length > 0) {
    lines.push('', `Unmapped leaves: ${report.unmappedLeafIds.join(', ')}`);
  }
  return `${lines.join('\n')}\n`;
}

export function runExploreSkillGraphCli(
  args: readonly string[],
  root = PROJECT_ROOT,
): number {
  try {
    const options = parseExplorerArgs(args);
    const report = createSkillGraphExplorerReport(
      readSelectedCatalog(root, options.input),
      readLegacySkills(root),
      readRubricCatalogs(root),
    );
    process.stdout.write(
      options.format === 'json'
        ? `${JSON.stringify(report, null, 2)}\n`
        : renderSkillGraphExplorerText(report),
    );
    return 0;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runExploreSkillGraphCli(process.argv.slice(2));
}
