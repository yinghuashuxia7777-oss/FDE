import type {
  PublishedRubricRef,
  SkillGraphCatalog,
  SkillGraphEdge,
} from '../domain/skills/types';
import {
  REQUIRED_LEGACY_SKILL_COUNT,
  REQUIRED_PRESENTATION_TARGET_COUNT,
  REQUIRED_PUBLISHED_LEAF_COUNT,
  V2_PRESENTATION_TARGET_IDS,
} from '../domain/skills/types';
import {
  SkillGraphCatalogSchema,
  STABLE_SKILL_GRAPH_ID_MESSAGE,
} from './skill-graph-schema';

export interface SkillGraphValidationIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

export interface SkillGraphValidationContext {
  legacySkillIds: readonly string[];
  publishedRubricRefs?: readonly PublishedRubricRef[];
  expectedLeafCount?: number;
  presentationSkillIds?: readonly string[];
  /** Alias for callers that model the targets as nodes rather than skills. */
  presentationNodeIds?: readonly string[];
}

interface ZodIssueLike {
  code: string;
  message: string;
  path: readonly PropertyKey[];
}

const EDGE_TYPES = new Set(['rolls-up-to', 'prerequisite', 'presents-as']);

function compareIssues(
  left: SkillGraphValidationIssue,
  right: SkillGraphValidationIssue,
): number {
  return (
    left.path.join('.').localeCompare(right.path.join('.')) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

function sortedUniqueIssues(
  issues: readonly SkillGraphValidationIssue[],
): SkillGraphValidationIssue[] {
  const unique = new Map<string, SkillGraphValidationIssue>();
  issues.forEach((issue) => {
    const key = JSON.stringify([issue.path, issue.code, issue.message]);
    if (!unique.has(key)) unique.set(key, issue);
  });
  return [...unique.values()].sort(compareIssues);
}

function normalizedPath(path: readonly PropertyKey[]): (string | number)[] {
  return path.map((part) =>
    typeof part === 'number' || typeof part === 'string' ? part : String(part),
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function rawEdgeAt(candidate: unknown, index: number): unknown {
  const edges = asRecord(candidate)?.edges;
  return Array.isArray(edges) ? edges[index] : undefined;
}

function schemaIssues(
  candidate: unknown,
  zodIssues: readonly ZodIssueLike[],
): SkillGraphValidationIssue[] {
  return sortedUniqueIssues(
    zodIssues.map((issue) => {
      const path = normalizedPath(issue.path);
      if (issue.message === STABLE_SKILL_GRAPH_ID_MESSAGE) {
        return {
          code: 'invalid_id',
          path,
          message: issue.message,
        };
      }

      if (path[0] === 'edges' && typeof path[1] === 'number') {
        const edgeIndex = path[1];
        const edgeType = asRecord(rawEdgeAt(candidate, edgeIndex))?.type;
        if (typeof edgeType !== 'string' || !EDGE_TYPES.has(edgeType)) {
          return {
            code: 'invalid_edge_type',
            path: ['edges', edgeIndex, 'type'],
            message: 'Unsupported skill graph edge type.',
          };
        }
        return {
          code: 'invalid_edge_shape',
          path,
          message: `Edge does not match the ${edgeType} shape.`,
        };
      }

      return {
        code: 'invalid_catalog_shape',
        path,
        message: issue.message,
      };
    }),
  );
}

function edgeIdentity(edge: SkillGraphEdge): string {
  switch (edge.type) {
    case 'rolls-up-to':
      return [edge.type, edge.leafSkillId, edge.legacySkillId].join('|');
    case 'prerequisite':
      return [edge.type, edge.prerequisiteSkillId, edge.dependentSkillId].join(
        '|',
      );
    case 'presents-as':
      return [edge.type, edge.legacySkillId, edge.presentationSkillId].join(
        '|',
      );
  }
}

function prerequisiteComponents(catalog: SkillGraphCatalog): string[][] {
  const leafIds = new Set(catalog.leaves.map(({ id }) => id));
  const adjacency = new Map<string, string[]>();
  catalog.leaves.forEach(({ id }) => adjacency.set(id, []));
  catalog.edges.forEach((edge) => {
    if (
      edge.type !== 'prerequisite' ||
      edge.prerequisiteSkillId === edge.dependentSkillId ||
      !leafIds.has(edge.prerequisiteSkillId) ||
      !leafIds.has(edge.dependentSkillId)
    ) {
      return;
    }
    adjacency.get(edge.prerequisiteSkillId)!.push(edge.dependentSkillId);
  });
  adjacency.forEach((targets) => targets.sort());

  let nextIndex = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (skillId: string) => {
    indexes.set(skillId, nextIndex);
    lowLinks.set(skillId, nextIndex);
    nextIndex += 1;
    stack.push(skillId);
    onStack.add(skillId);

    for (const targetId of adjacency.get(skillId) ?? []) {
      if (!indexes.has(targetId)) {
        visit(targetId);
        lowLinks.set(
          skillId,
          Math.min(lowLinks.get(skillId)!, lowLinks.get(targetId)!),
        );
      } else if (onStack.has(targetId)) {
        lowLinks.set(
          skillId,
          Math.min(lowLinks.get(skillId)!, indexes.get(targetId)!),
        );
      }
    }

    if (lowLinks.get(skillId) !== indexes.get(skillId)) return;
    const component: string[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === skillId) break;
    }
    if (component.length > 1) components.push(component.sort());
  };

  [...leafIds].sort().forEach((skillId) => {
    if (!indexes.has(skillId)) visit(skillId);
  });
  return components.sort((left, right) => left[0]!.localeCompare(right[0]!));
}

function validateSemantics(
  catalog: SkillGraphCatalog,
  context: SkillGraphValidationContext,
): SkillGraphValidationIssue[] {
  const issues: SkillGraphValidationIssue[] = [];
  const legacySkillIds = new Set(context.legacySkillIds);
  const leafIds = new Set(catalog.leaves.map(({ id }) => id));
  const presentationNodeIds = new Set(
    catalog.presentationNodes.map(({ id }) => id),
  );
  const allowedPresentationIds =
    context.presentationSkillIds ?? context.presentationNodeIds;
  const allowedPresentationTargets =
    allowedPresentationIds === undefined
      ? undefined
      : new Set(allowedPresentationIds);

  const seenLeafIds = new Set<string>();
  catalog.leaves.forEach((leaf, index) => {
    if (seenLeafIds.has(leaf.id)) {
      issues.push({
        code: 'duplicate_leaf_id',
        path: ['leaves', index, 'id'],
        message: `Duplicate leaf skill ID: ${leaf.id}.`,
      });
    }
    seenLeafIds.add(leaf.id);
    if (legacySkillIds.has(leaf.id)) {
      issues.push({
        code: 'leaf_legacy_id_collision',
        path: ['leaves', index, 'id'],
        message: `Leaf skill ID collides with a legacy skill ID: ${leaf.id}.`,
      });
    }
    if (!legacySkillIds.has(leaf.parentSkillId)) {
      issues.push({
        code: 'missing_parent_skill_target',
        path: ['leaves', index, 'parentSkillId'],
        message: `Legacy parent skill does not exist: ${leaf.parentSkillId}.`,
      });
    }
  });

  const seenNodeIds = new Set<string>();
  catalog.presentationNodes.forEach((node, index) => {
    if (seenNodeIds.has(node.id)) {
      issues.push({
        code: 'duplicate_presentation_node_id',
        path: ['presentationNodes', index, 'id'],
        message: `Duplicate presentation node ID: ${node.id}.`,
      });
    }
    seenNodeIds.add(node.id);
    if (
      allowedPresentationTargets !== undefined &&
      !allowedPresentationTargets.has(node.id)
    ) {
      issues.push({
        code: 'invalid_presentation_node',
        path: ['presentationNodes', index, 'id'],
        message: `Presentation node is not an allowed target: ${node.id}.`,
      });
    }
  });

  const seenEdgeIds = new Set<string>();
  const seenEdges = new Set<string>();
  catalog.edges.forEach((edge, index) => {
    if (seenEdgeIds.has(edge.id)) {
      issues.push({
        code: 'duplicate_edge_id',
        path: ['edges', index, 'id'],
        message: `Duplicate edge ID: ${edge.id}.`,
      });
    }
    seenEdgeIds.add(edge.id);

    const identity = edgeIdentity(edge);
    if (seenEdges.has(identity)) {
      issues.push({
        code: 'duplicate_edge',
        path: ['edges', index],
        message: `Duplicate ${edge.type} relationship.`,
      });
    }
    seenEdges.add(identity);

    switch (edge.type) {
      case 'rolls-up-to':
        if (edge.leafSkillId === edge.legacySkillId) {
          issues.push({
            code: 'self_loop',
            path: ['edges', index],
            message: `Edge ${edge.id} cannot connect a skill to itself.`,
          });
        }
        if (!leafIds.has(edge.leafSkillId)) {
          issues.push({
            code: 'missing_edge_target',
            path: ['edges', index, 'leafSkillId'],
            message: `Leaf skill target does not exist: ${edge.leafSkillId}.`,
          });
        }
        if (!legacySkillIds.has(edge.legacySkillId)) {
          issues.push({
            code: 'missing_edge_target',
            path: ['edges', index, 'legacySkillId'],
            message: `Legacy skill target does not exist: ${edge.legacySkillId}.`,
          });
        }
        break;
      case 'prerequisite':
        if (edge.prerequisiteSkillId === edge.dependentSkillId) {
          issues.push({
            code: 'self_loop',
            path: ['edges', index],
            message: `Edge ${edge.id} cannot connect a skill to itself.`,
          });
        }
        if (!leafIds.has(edge.prerequisiteSkillId)) {
          issues.push({
            code: 'missing_edge_target',
            path: ['edges', index, 'prerequisiteSkillId'],
            message: `Prerequisite leaf skill does not exist: ${edge.prerequisiteSkillId}.`,
          });
        }
        if (!leafIds.has(edge.dependentSkillId)) {
          issues.push({
            code: 'missing_edge_target',
            path: ['edges', index, 'dependentSkillId'],
            message: `Dependent leaf skill does not exist: ${edge.dependentSkillId}.`,
          });
        }
        break;
      case 'presents-as':
        if (edge.legacySkillId === edge.presentationSkillId) {
          issues.push({
            code: 'self_loop',
            path: ['edges', index],
            message: `Edge ${edge.id} cannot connect a skill to itself.`,
          });
        }
        if (!legacySkillIds.has(edge.legacySkillId)) {
          issues.push({
            code: 'missing_edge_target',
            path: ['edges', index, 'legacySkillId'],
            message: `Legacy skill source does not exist: ${edge.legacySkillId}.`,
          });
        }
        if (!presentationNodeIds.has(edge.presentationSkillId)) {
          issues.push({
            code: 'missing_edge_target',
            path: ['edges', index, 'presentationSkillId'],
            message: `Presentation target does not exist: ${edge.presentationSkillId}.`,
          });
        } else if (
          allowedPresentationTargets !== undefined &&
          !allowedPresentationTargets.has(edge.presentationSkillId)
        ) {
          issues.push({
            code: 'invalid_presentation_target',
            path: ['edges', index, 'presentationSkillId'],
            message: `Presentation target is not allowed: ${edge.presentationSkillId}.`,
          });
        }
        break;
    }
  });

  const canonicalRollups = new Map<
    string,
    { index: number; legacySkillId: string }[]
  >();
  const canonicalPresentations = new Map<string, number[]>();
  catalog.edges.forEach((edge, index) => {
    if (edge.type === 'rolls-up-to' && edge.canonical) {
      const rollups = canonicalRollups.get(edge.leafSkillId) ?? [];
      rollups.push({ index, legacySkillId: edge.legacySkillId });
      canonicalRollups.set(edge.leafSkillId, rollups);
    }
    if (edge.type === 'presents-as' && edge.canonical) {
      const presentations =
        canonicalPresentations.get(edge.legacySkillId) ?? [];
      presentations.push(index);
      canonicalPresentations.set(edge.legacySkillId, presentations);
    }
  });

  catalog.leaves.forEach((leaf, leafIndex) => {
    const rollups = canonicalRollups.get(leaf.id) ?? [];
    if (rollups.length > 1) {
      issues.push({
        code: 'multiple_canonical_parents',
        path: ['leaves', leafIndex, 'parentSkillId'],
        message: `Leaf skill ${leaf.id} has multiple canonical roll-up parents.`,
      });
    }
    if (
      rollups.length === 1 &&
      rollups[0]!.legacySkillId !== leaf.parentSkillId
    ) {
      issues.push({
        code: 'canonical_parent_mismatch',
        path: ['edges', rollups[0]!.index, 'legacySkillId'],
        message: `Canonical roll-up for ${leaf.id} must match parentSkillId ${leaf.parentSkillId}.`,
      });
    }
    if (leaf.status !== 'deprecated' && rollups.length === 0) {
      issues.push({
        code: 'missing_canonical_parent',
        path: ['leaves', leafIndex, 'parentSkillId'],
        message: `Non-deprecated leaf skill ${leaf.id} needs one canonical roll-up edge.`,
      });
    }
  });

  canonicalPresentations.forEach((edgeIndexes, legacySkillId) => {
    if (edgeIndexes.length <= 1) return;
    issues.push({
      code: 'multiple_canonical_presentation_targets',
      path: ['edges', edgeIndexes[1]!],
      message: `Legacy skill ${legacySkillId} has multiple canonical presentation targets.`,
    });
  });

  prerequisiteComponents(catalog).forEach((component) => {
    issues.push({
      code: 'prerequisite_cycle',
      path: ['edges'],
      message: `Prerequisite cycle detected: ${component.join(' -> ')}.`,
    });
  });

  if (catalog.status === 'published') {
    if (catalog.expectedLeafCount !== REQUIRED_PUBLISHED_LEAF_COUNT) {
      issues.push({
        code: 'expected_leaf_count_mismatch',
        path: ['expectedLeafCount'],
        message: `Published catalog must declare ${REQUIRED_PUBLISHED_LEAF_COUNT} expected leaves; found ${catalog.expectedLeafCount}.`,
      });
    }
    if (
      context.expectedLeafCount !== undefined &&
      context.expectedLeafCount !== REQUIRED_PUBLISHED_LEAF_COUNT
    ) {
      issues.push({
        code: 'expected_leaf_count_mismatch',
        path: ['context', 'expectedLeafCount'],
        message: `Published validation context must expect ${REQUIRED_PUBLISHED_LEAF_COUNT} leaves; found ${context.expectedLeafCount}.`,
      });
    }
    if (catalog.leaves.length !== REQUIRED_PUBLISHED_LEAF_COUNT) {
      issues.push({
        code: 'unexpected_leaf_count',
        path: ['leaves'],
        message: `Published catalog must contain ${REQUIRED_PUBLISHED_LEAF_COUNT} leaves; found ${catalog.leaves.length}.`,
      });
    }

    if (
      context.legacySkillIds.length !== REQUIRED_LEGACY_SKILL_COUNT ||
      legacySkillIds.size !== REQUIRED_LEGACY_SKILL_COUNT
    ) {
      issues.push({
        code: 'invalid_legacy_skill_context',
        path: ['context', 'legacySkillIds'],
        message: `Published validation context must provide ${REQUIRED_LEGACY_SKILL_COUNT} unique legacy skill IDs.`,
      });
    }

    const hasAuthoritativePresentationContext =
      allowedPresentationIds?.length === REQUIRED_PRESENTATION_TARGET_COUNT &&
      allowedPresentationTargets?.size === REQUIRED_PRESENTATION_TARGET_COUNT &&
      V2_PRESENTATION_TARGET_IDS.every((id) =>
        allowedPresentationTargets.has(id),
      );
    if (!hasAuthoritativePresentationContext) {
      issues.push({
        code: 'invalid_presentation_target_context',
        path: ['context', 'presentationSkillIds'],
        message: `Published validation context must provide ${REQUIRED_PRESENTATION_TARGET_COUNT} unique presentation target IDs.`,
      });
    }

    const hasExactPresentationCatalog =
      catalog.presentationNodes.length === REQUIRED_PRESENTATION_TARGET_COUNT &&
      presentationNodeIds.size === REQUIRED_PRESENTATION_TARGET_COUNT &&
      V2_PRESENTATION_TARGET_IDS.every((id) => presentationNodeIds.has(id));
    if (!hasExactPresentationCatalog) {
      issues.push({
        code: 'invalid_presentation_target_catalog',
        path: ['presentationNodes'],
        message: `Published catalog must declare exactly the ${REQUIRED_PRESENTATION_TARGET_COUNT} authoritative presentation targets.`,
      });
    }

    const publishedRubricRefs = new Set(
      (context.publishedRubricRefs ?? []).map(
        ({ skillId, version }) => `${skillId}@${version}`,
      ),
    );
    catalog.leaves.forEach((leaf, index) => {
      if (leaf.status !== 'active') {
        issues.push({
          code: 'published_leaf_not_active',
          path: ['leaves', index, 'status'],
          message: `Published leaf skill ${leaf.id} must be active.`,
        });
        return;
      }
      const rubricRef = `${leaf.id}@${leaf.activeRubricVersion ?? 'null'}`;
      if (
        leaf.activeRubricVersion === null ||
        !publishedRubricRefs.has(rubricRef)
      ) {
        issues.push({
          code: 'missing_published_rubric',
          path: ['leaves', index, 'activeRubricVersion'],
          message: `Active leaf skill ${leaf.id} must reference a published rubric.`,
        });
      }
    });

    const legacySkillsWithCanonicalActiveLeaf = new Set(
      catalog.leaves
        .filter(({ status }) => status === 'active')
        .flatMap((leaf) =>
          (canonicalRollups.get(leaf.id) ?? [])
            .filter(({ legacySkillId }) => legacySkillId === leaf.parentSkillId)
            .map(({ legacySkillId }) => legacySkillId),
        ),
    );
    [...legacySkillIds].sort().forEach((legacySkillId) => {
      if (legacySkillsWithCanonicalActiveLeaf.has(legacySkillId)) return;
      issues.push({
        code: 'missing_legacy_leaf_coverage',
        path: ['edges'],
        message: `Published catalog has no canonical active Leaf roll-up for ${legacySkillId}.`,
      });
    });

    [...legacySkillIds].sort().forEach((legacySkillId) => {
      if ((canonicalPresentations.get(legacySkillId)?.length ?? 0) > 0) {
        return;
      }
      issues.push({
        code: 'missing_canonical_presentation_mapping',
        path: ['edges'],
        message: `Published catalog is missing a canonical presentation mapping for ${legacySkillId}.`,
      });
    });
  }

  return sortedUniqueIssues(issues);
}

export function validateSkillGraphCatalog(
  candidate: unknown,
  context: SkillGraphValidationContext,
): SkillGraphValidationIssue[] {
  const parsed = SkillGraphCatalogSchema.safeParse(candidate);
  if (!parsed.success) {
    return schemaIssues(candidate, parsed.error.issues);
  }
  return validateSemantics(parsed.data, context);
}
