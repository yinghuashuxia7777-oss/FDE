import {
  V2_PRESENTATION_TARGET_IDS,
  type SkillGraphCatalog,
} from '../domain/skills/types';
import {
  validateSkillGraphCatalog,
  type SkillGraphValidationContext,
} from './skill-graph-validator';

const LEGACY_SKILL_IDS = [
  'agents.evaluation',
  'api.integration',
  'cloud.deployment',
  'customer.discovery',
  'data.engineering',
  'fde.adoption',
  'git.delivery',
  'llm.applications',
  'performance.scaling',
  'rag.search',
  'reliability.observability',
  'security.governance',
  'software.foundations',
  'systems.networking',
  'tuning.inference-deployment',
] as const;

const PRESENTATION_SKILL_IDS = V2_PRESENTATION_TARGET_IDS;

const CAPABILITY_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;

const context: SkillGraphValidationContext = {
  legacySkillIds: ['software.foundations', 'reliability.observability'],
  presentationSkillIds: ['capability.software', 'capability.operations'],
};

function draftCatalog(): SkillGraphCatalog {
  return {
    schemaVersion: 1,
    catalogVersion: '0.1.0',
    status: 'draft',
    expectedLeafCount: 70,
    presentationNodes: [
      {
        id: 'capability.software',
        name: 'Software delivery',
        description: 'Build and deliver reliable software.',
      },
      {
        id: 'capability.operations',
        name: 'Production operations',
        description: 'Operate production systems safely.',
      },
    ],
    leaves: [
      {
        schemaVersion: 1,
        id: 'eng.runtime-debugging',
        name: 'Runtime debugging',
        description: 'Diagnose runtime failures from concrete evidence.',
        parentSkillId: 'software.foundations',
        capabilityLevel: 0,
        status: 'draft',
        evidenceTypes: ['diagnosis'],
        activeRubricVersion: null,
      },
      {
        schemaVersion: 1,
        id: 'prod.release-verification',
        name: 'Release verification',
        description: 'Verify releases with measurable production signals.',
        parentSkillId: 'reliability.observability',
        capabilityLevel: 1,
        status: 'reviewed',
        evidenceTypes: ['verification'],
        activeRubricVersion: null,
      },
    ],
    edges: [
      {
        id: 'edge.runtime-rollup',
        type: 'rolls-up-to',
        leafSkillId: 'eng.runtime-debugging',
        legacySkillId: 'software.foundations',
        canonical: true,
      },
      {
        id: 'edge.release-rollup',
        type: 'rolls-up-to',
        leafSkillId: 'prod.release-verification',
        legacySkillId: 'reliability.observability',
        canonical: true,
      },
      {
        id: 'edge.runtime-before-release',
        type: 'prerequisite',
        prerequisiteSkillId: 'eng.runtime-debugging',
        dependentSkillId: 'prod.release-verification',
      },
      {
        id: 'edge.software-presentation',
        type: 'presents-as',
        legacySkillId: 'software.foundations',
        presentationSkillId: 'capability.software',
        canonical: true,
      },
    ],
  };
}

function twoLeafPublishedCatalog(): SkillGraphCatalog {
  const catalog = draftCatalog();
  catalog.status = 'published';
  catalog.expectedLeafCount = catalog.leaves.length;
  catalog.leaves.forEach((leaf) => {
    leaf.status = 'active';
    leaf.activeRubricVersion = 1;
  });
  catalog.edges.push({
    id: 'edge.operations-presentation',
    type: 'presents-as',
    legacySkillId: 'reliability.observability',
    presentationSkillId: 'capability.operations',
    canonical: true,
  });
  return catalog;
}

function leafId(index: number): string {
  return `leaf.skill-${index + 1}`;
}

function publishedCatalog(): SkillGraphCatalog {
  const leaves = Array.from({ length: 70 }, (_, index) => ({
    schemaVersion: 1 as const,
    id: leafId(index),
    name: `Leaf skill ${index + 1}`,
    description: `Published leaf skill fixture ${index + 1}.`,
    parentSkillId: LEGACY_SKILL_IDS[index % LEGACY_SKILL_IDS.length]!,
    capabilityLevel: CAPABILITY_LEVELS[index % CAPABILITY_LEVELS.length]!,
    status: 'active' as const,
    evidenceTypes: ['diagnosis'],
    activeRubricVersion: 1,
  }));

  return {
    schemaVersion: 1,
    catalogVersion: '1.0.0',
    status: 'published',
    expectedLeafCount: 70,
    presentationNodes: PRESENTATION_SKILL_IDS.map((id, index) => ({
      id,
      name: `Presentation ${index + 1}`,
      description: `Authoritative presentation target ${index + 1}.`,
    })),
    leaves,
    edges: [
      ...leaves.map((leaf, index) => ({
        id: `edge.leaf-${index + 1}-rollup`,
        type: 'rolls-up-to' as const,
        leafSkillId: leaf.id,
        legacySkillId: leaf.parentSkillId,
        canonical: true,
      })),
      ...LEGACY_SKILL_IDS.map((legacySkillId, index) => ({
        id: `edge.legacy-${index + 1}-presentation`,
        type: 'presents-as' as const,
        legacySkillId,
        presentationSkillId:
          PRESENTATION_SKILL_IDS[index % PRESENTATION_SKILL_IDS.length]!,
        canonical: true,
      })),
    ],
  };
}

function issueCodes(candidate: unknown, customContext = context): string[] {
  return validateSkillGraphCatalog(candidate, customContext).map(
    ({ code }) => code,
  );
}

describe('validateSkillGraphCatalog draft lifecycle', () => {
  it('accepts a valid partial draft without rubric pointers', () => {
    expect(validateSkillGraphCatalog(draftCatalog(), context)).toEqual([]);
  });

  it.each(['draft', 'reviewed', 'active'] as const)(
    'requires one canonical parent for a %s leaf in a draft catalog',
    (status) => {
      const catalog = draftCatalog();
      catalog.leaves[0]!.status = status;
      catalog.edges = catalog.edges.filter(
        (edge) =>
          edge.type !== 'rolls-up-to' ||
          edge.leafSkillId !== catalog.leaves[0]!.id,
      );

      expect(issueCodes(catalog)).toContain('missing_canonical_parent');
    },
  );

  it('allows a deprecated leaf to omit a canonical parent', () => {
    const catalog = draftCatalog();
    catalog.leaves[0]!.status = 'deprecated';
    catalog.edges = catalog.edges.filter(
      (edge) =>
        edge.type !== 'rolls-up-to' ||
        edge.leafSkillId !== catalog.leaves[0]!.id,
    );

    expect(issueCodes(catalog)).not.toContain('missing_canonical_parent');
  });

  it('rejects a leaf ID that collides with a legacy skill ID', () => {
    const catalog = draftCatalog();
    catalog.leaves[0]!.id = 'software.foundations';
    const rollup = catalog.edges[0];
    if (rollup?.type !== 'rolls-up-to')
      throw new Error('Invalid test fixture.');
    rollup.leafSkillId = 'software.foundations';

    expect(issueCodes(catalog)).toContain('leaf_legacy_id_collision');
  });

  it('reports a duplicate leaf skill ID', () => {
    const catalog = draftCatalog();
    catalog.leaves.push(structuredClone(catalog.leaves[0]!));

    expect(issueCodes(catalog)).toContain('duplicate_leaf_id');
  });

  it('reports duplicate edge and presentation node IDs', () => {
    const catalog = draftCatalog();
    catalog.edges.push(structuredClone(catalog.edges[0]!));
    catalog.presentationNodes.push(
      structuredClone(catalog.presentationNodes[0]!),
    );

    expect(issueCodes(catalog)).toEqual(
      expect.arrayContaining([
        'duplicate_edge_id',
        'duplicate_presentation_node_id',
      ]),
    );
  });

  it.each(['rolls-up-to', 'presents-as'] as const)(
    'treats duplicate %s endpoints as one identity regardless of canonical flag',
    (type) => {
      const catalog = draftCatalog();
      const original = catalog.edges.find((edge) => edge.type === type)!;
      if (original.type === 'prerequisite') {
        throw new Error('Invalid test fixture.');
      }
      catalog.edges.push({
        ...original,
        id: `edge.duplicate-${type}`,
        canonical: !original.canonical,
      });

      expect(issueCodes(catalog)).toContain('duplicate_edge');
    },
  );

  it('converts invalid stable IDs into structured issues', () => {
    const catalog = draftCatalog() as unknown as Record<string, unknown>;
    const leaves = catalog.leaves as Record<string, unknown>[];
    leaves[0]!.id = '../Runtime Debugging';

    const issues = validateSkillGraphCatalog(catalog, context);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_id',
          path: ['leaves', 0, 'id'],
        }),
      ]),
    );
  });

  it('reports missing typed edge targets', () => {
    const catalog = draftCatalog();
    catalog.edges.push({
      id: 'edge.missing-prerequisite',
      type: 'prerequisite',
      prerequisiteSkillId: 'eng.does-not-exist',
      dependentSkillId: 'prod.release-verification',
    });

    expect(issueCodes(catalog)).toContain('missing_edge_target');
  });

  it.each([
    {
      id: 'edge.unknown-type',
      type: 'inferred-parent',
      sourceId: 'eng.runtime-debugging',
      targetId: 'software.foundations',
      expectedCode: 'invalid_edge_type',
    },
    {
      id: 'edge.wrong-shape',
      type: 'prerequisite',
      leafSkillId: 'eng.runtime-debugging',
      legacySkillId: 'software.foundations',
      expectedCode: 'invalid_edge_shape',
    },
  ])('reports $expectedCode without throwing', (edge) => {
    const catalog = draftCatalog() as unknown as Record<string, unknown>;
    const edges = catalog.edges as unknown[];
    const { expectedCode, ...candidateEdge } = edge;
    edges.push(candidateEdge);

    expect(issueCodes(catalog)).toContain(expectedCode);
  });

  it('reports prerequisite self-loops', () => {
    const catalog = draftCatalog();
    catalog.edges.push({
      id: 'edge.runtime-self-loop',
      type: 'prerequisite',
      prerequisiteSkillId: 'eng.runtime-debugging',
      dependentSkillId: 'eng.runtime-debugging',
    });

    expect(issueCodes(catalog)).toContain('self_loop');
  });

  it('reports prerequisite cycles', () => {
    const catalog = draftCatalog();
    catalog.edges.push({
      id: 'edge.release-before-runtime',
      type: 'prerequisite',
      prerequisiteSkillId: 'prod.release-verification',
      dependentSkillId: 'eng.runtime-debugging',
    });

    expect(issueCodes(catalog)).toContain('prerequisite_cycle');
  });

  it('reports a canonical roll-up that disagrees with parentSkillId', () => {
    const catalog = draftCatalog();
    const edge = catalog.edges[0];
    if (edge?.type !== 'rolls-up-to') throw new Error('Invalid test fixture.');
    edge.legacySkillId = 'reliability.observability';

    expect(issueCodes(catalog)).toContain('canonical_parent_mismatch');
  });

  it('allows at most one canonical presentation target per legacy skill', () => {
    const catalog = draftCatalog();
    catalog.edges.push({
      id: 'edge.software-second-presentation',
      type: 'presents-as',
      legacySkillId: 'software.foundations',
      presentationSkillId: 'capability.operations',
      canonical: true,
    });

    expect(issueCodes(catalog)).toContain(
      'multiple_canonical_presentation_targets',
    );
  });

  it('returns issues in a stable path/code/message order', () => {
    const catalog = draftCatalog();
    catalog.leaves.push(structuredClone(catalog.leaves[0]!));
    catalog.edges.push(structuredClone(catalog.edges[0]!));

    const first = validateSkillGraphCatalog(catalog, context);
    const second = validateSkillGraphCatalog(catalog, context);

    expect(first).toEqual(second);
    expect(first).toEqual(
      [...first].sort(
        (left, right) =>
          left.path.join('.').localeCompare(right.path.join('.')) ||
          left.code.localeCompare(right.code) ||
          left.message.localeCompare(right.message),
      ),
    );
  });
});

describe('validateSkillGraphCatalog published lifecycle', () => {
  const publishedContext: SkillGraphValidationContext = {
    legacySkillIds: LEGACY_SKILL_IDS,
    presentationSkillIds: PRESENTATION_SKILL_IDS,
    expectedLeafCount: 70,
    publishedRubricRefs: Array.from({ length: 70 }, (_, index) => ({
      skillId: leafId(index),
      version: 1,
    })),
  };

  it('accepts only a complete 70-leaf catalog with authoritative 15/7 context', () => {
    expect(
      validateSkillGraphCatalog(publishedCatalog(), publishedContext),
    ).toEqual([]);
  });

  it('rejects a two-leaf published catalog and two-ID context', () => {
    const weakContext: SkillGraphValidationContext = {
      ...context,
      expectedLeafCount: 2,
      publishedRubricRefs: [
        { skillId: 'eng.runtime-debugging', version: 1 },
        { skillId: 'prod.release-verification', version: 1 },
      ],
    };

    expect(issueCodes(twoLeafPublishedCatalog(), weakContext)).toEqual(
      expect.arrayContaining([
        'expected_leaf_count_mismatch',
        'invalid_legacy_skill_context',
        'invalid_presentation_target_context',
        'unexpected_leaf_count',
      ]),
    );
  });

  it('rejects duplicate IDs in otherwise full authoritative context', () => {
    const duplicateLegacyIds = [...LEGACY_SKILL_IDS];
    duplicateLegacyIds[14] = duplicateLegacyIds[0]!;
    const duplicatePresentationIds = [...PRESENTATION_SKILL_IDS];
    duplicatePresentationIds[6] = duplicatePresentationIds[0]!;

    expect(
      issueCodes(publishedCatalog(), {
        ...publishedContext,
        legacySkillIds: duplicateLegacyIds,
        presentationSkillIds: duplicatePresentationIds,
      }),
    ).toEqual(
      expect.arrayContaining([
        'invalid_legacy_skill_context',
        'invalid_presentation_target_context',
      ]),
    );
  });

  it('requires a canonical presentation mapping for every legacy skill', () => {
    const catalog = publishedCatalog();
    catalog.edges = catalog.edges.filter(
      (edge) =>
        edge.type !== 'presents-as' ||
        edge.legacySkillId !== LEGACY_SKILL_IDS[0],
    );

    expect(issueCodes(catalog, publishedContext)).toContain(
      'missing_canonical_presentation_mapping',
    );
  });

  it('requires every legacy skill to receive a canonical active Leaf roll-up', () => {
    const catalog = publishedCatalog();
    const onlyCoveredLegacySkillId = LEGACY_SKILL_IDS[0];
    catalog.leaves.forEach((leaf) => {
      leaf.parentSkillId = onlyCoveredLegacySkillId;
    });
    catalog.edges.forEach((edge) => {
      if (edge.type === 'rolls-up-to') {
        edge.legacySkillId = onlyCoveredLegacySkillId;
      }
    });

    const coverageIssues = validateSkillGraphCatalog(
      catalog,
      publishedContext,
    ).filter(({ code }) => code === 'missing_legacy_leaf_coverage');

    expect(coverageIssues).toHaveLength(LEGACY_SKILL_IDS.length - 1);
    expect(coverageIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['edges'],
          message: `Published catalog has no canonical active Leaf roll-up for ${LEGACY_SKILL_IDS[1]}.`,
        }),
      ]),
    );
  });

  it('requires every active leaf rubric pointer to resolve to a published ref', () => {
    const catalog = publishedCatalog();
    const missingRubricContext: SkillGraphValidationContext = {
      ...publishedContext,
      publishedRubricRefs: publishedContext.publishedRubricRefs!.filter(
        ({ skillId }) => skillId !== leafId(1),
      ),
    };

    const issues = validateSkillGraphCatalog(catalog, missingRubricContext);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_published_rubric',
          path: ['leaves', 1, 'activeRubricVersion'],
        }),
      ]),
    );
  });

  it('enforces the expected leaf count and active-only published leaves', () => {
    const catalog = publishedCatalog();
    catalog.expectedLeafCount = 69;
    const removedLeaf = catalog.leaves.pop()!;
    catalog.edges = catalog.edges.filter(
      (edge) =>
        edge.type !== 'rolls-up-to' || edge.leafSkillId !== removedLeaf.id,
    );
    catalog.leaves[0]!.status = 'reviewed';

    expect(issueCodes(catalog, publishedContext)).toEqual(
      expect.arrayContaining([
        'expected_leaf_count_mismatch',
        'unexpected_leaf_count',
        'published_leaf_not_active',
      ]),
    );
  });
});
