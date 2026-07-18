import type { FdeCase } from '../domain/cases/types';
import type { LeafSkillDefinition } from '../domain/skills/types';
import type { SkillRubricDefinition } from '../domain/skills/rubric-types';
import type { CaseLeafAttributionMap } from './case-leaf-attribution-schema';
import { CaseLeafAttributionMapSchema } from './case-leaf-attribution-schema';
import { validateCaseLeafAttributionMap } from './knowledge-v2-validators';

const leafSkill: LeafSkillDefinition = {
  schemaVersion: 1,
  id: 'eng.runtime-debugging',
  name: 'Runtime debugging',
  description: 'Diagnose runtime failures from concrete evidence.',
  parentSkillId: 'software.foundations',
  capabilityLevel: 0,
  status: 'active',
  evidenceTypes: ['diagnosis'],
  activeRubricVersion: 1,
};

const rubric: SkillRubricDefinition = {
  schemaVersion: 1,
  id: 'rubric.eng.runtime-debugging',
  skillId: 'eng.runtime-debugging',
  version: 1,
  status: 'published',
  title: 'Runtime debugging evidence rubric',
  evidenceTypes: ['diagnosis'],
  criteria: [
    {
      criterionId: 'criterion.evidence-triage',
      description: 'Selects the next diagnostic step from observed evidence.',
      evidenceTypes: ['diagnosis'],
      weight: 1,
      critical: true,
    },
  ],
  thresholds: { learning: 1, competent: 70, proficient: 85 },
  metadata: {
    createdAt: '2026-07-17T00:00:00.000Z',
    reviewedAt: '2026-07-17T01:00:00.000Z',
    author: 'FDE Arena',
    reviewer: 'reviewer.one',
  },
};

const caseVersion = {
  id: 'runtime-timeout-001',
  metadata: { version: 1 },
  nodes: [{ id: 'runtime-timeout-001-node-01' }],
} as FdeCase;

function draftAttributionMap(): CaseLeafAttributionMap {
  return {
    schemaVersion: 1,
    skillCatalogVersion: '0.1.0',
    rubricSetVersion: '0.1.0',
    mapId: 'attribution.runtime-pilot',
    mapVersion: 1,
    status: 'draft',
    entries: [
      {
        caseId: 'runtime-timeout-001',
        caseVersion: 1,
        nodeId: 'runtime-timeout-001-node-01',
        leafSkillId: 'eng.runtime-debugging',
        rubricVersion: 1,
        role: 'primary',
        evidenceType: 'diagnosis',
        rationale: 'The node directly scores evidence-led runtime diagnosis.',
        reviewer: 'reviewer.one',
      },
    ],
  };
}

function approvedAttributionMap(): CaseLeafAttributionMap {
  const map = draftAttributionMap();
  map.status = 'approved';
  return map;
}

const context = {
  cases: [caseVersion],
  leafSkills: [leafSkill],
  rubrics: [rubric],
};

describe('CaseLeafAttributionMapSchema', () => {
  it('accepts a strict draft map without writing into Case content', () => {
    expect(
      CaseLeafAttributionMapSchema.safeParse(draftAttributionMap()).success,
    ).toBe(true);
  });

  it('requires an explicit reviewer on every attribution', () => {
    const map = structuredClone(draftAttributionMap()) as unknown as {
      entries: { reviewer?: string }[];
    };
    delete map.entries[0]!.reviewer;

    expect(CaseLeafAttributionMapSchema.safeParse(map).success).toBe(false);
  });
});

describe('validateCaseLeafAttributionMap', () => {
  it('accepts a draft map whose case, node, leaf, and rubric all resolve', () => {
    expect(
      validateCaseLeafAttributionMap(draftAttributionMap(), context),
    ).toEqual([]);
  });

  it('rejects a missing exact case version', () => {
    expect(
      validateCaseLeafAttributionMap(draftAttributionMap(), {
        ...context,
        cases: [],
      }).map(({ code }) => code),
    ).toContain('missing_case_version');
  });

  it('rejects a node that does not belong to the exact case version', () => {
    const map = draftAttributionMap();
    map.entries[0]!.nodeId = 'runtime-timeout-001-node-99';

    expect(
      validateCaseLeafAttributionMap(map, context).map(({ code }) => code),
    ).toContain('invalid_case_node');
  });

  it('rejects missing leaf and rubric references', () => {
    expect(
      validateCaseLeafAttributionMap(draftAttributionMap(), {
        ...context,
        leafSkills: [],
        rubrics: [],
      }).map(({ code }) => code),
    ).toEqual(expect.arrayContaining(['missing_leaf_skill', 'missing_rubric']));
  });

  it('rejects duplicate natural attribution keys', () => {
    const map = draftAttributionMap();
    map.entries.push(structuredClone(map.entries[0]!));

    expect(
      validateCaseLeafAttributionMap(map, context).map(({ code }) => code),
    ).toContain('duplicate_attribution');
  });

  it('rejects the same case node and leaf even when the role differs', () => {
    const map = draftAttributionMap();
    const duplicate = structuredClone(map.entries[0]!);
    duplicate.role = 'secondary';
    map.entries.push(duplicate);

    expect(
      validateCaseLeafAttributionMap(map, context).map(({ code }) => code),
    ).toContain('duplicate_attribution');
  });

  it('allows one case node to attribute evidence to different leaves', () => {
    const map = draftAttributionMap();
    map.entries.push({
      ...structuredClone(map.entries[0]!),
      leafSkillId: 'prod.release-verification',
    });
    const secondLeaf = {
      ...leafSkill,
      id: 'prod.release-verification',
    };
    const secondRubric = {
      ...rubric,
      id: 'rubric.prod.release-verification',
      skillId: secondLeaf.id,
    };

    expect(
      validateCaseLeafAttributionMap(map, {
        ...context,
        leafSkills: [leafSkill, secondLeaf],
        rubrics: [rubric, secondRubric],
      }),
    ).toEqual([]);
  });

  it('rejects ambiguous rubric matches independent of rubric array order', () => {
    const alternateRubric = {
      ...rubric,
      id: 'rubric.eng.runtime-debugging-alternate',
    };
    const first = validateCaseLeafAttributionMap(draftAttributionMap(), {
      ...context,
      rubrics: [alternateRubric, rubric],
    });
    const second = validateCaseLeafAttributionMap(draftAttributionMap(), {
      ...context,
      rubrics: [rubric, alternateRubric],
    });

    expect(first).toEqual(second);
    expect(first.map(({ code }) => code)).toContain(
      'ambiguous_rubric_reference',
    );
  });

  it('accepts an approved attribution with an active Leaf and its active published rubric', () => {
    expect(
      validateCaseLeafAttributionMap(approvedAttributionMap(), context),
    ).toEqual([]);
  });

  it('rejects an approved attribution to an inactive Leaf', () => {
    const inactiveLeaf = { ...leafSkill, status: 'reviewed' as const };

    expect(
      validateCaseLeafAttributionMap(approvedAttributionMap(), {
        ...context,
        leafSkills: [inactiveLeaf],
      }).map(({ code }) => code),
    ).toContain('approved_attribution_inactive_leaf');
  });

  it('rejects an approved attribution to an unpublished rubric', () => {
    const draftRubric = {
      ...rubric,
      status: 'draft' as const,
      metadata: {
        ...rubric.metadata,
        reviewedAt: null,
        reviewer: null,
      },
    };

    expect(
      validateCaseLeafAttributionMap(approvedAttributionMap(), {
        ...context,
        rubrics: [draftRubric],
      }).map(({ code }) => code),
    ).toContain('approved_attribution_unpublished_rubric');
  });

  it('rejects an approved attribution to a non-active rubric version', () => {
    const map = approvedAttributionMap();
    map.entries[0]!.rubricVersion = 2;
    const rubricV2 = { ...rubric, version: 2 };

    expect(
      validateCaseLeafAttributionMap(map, {
        ...context,
        rubrics: [rubricV2],
      }).map(({ code }) => code),
    ).toContain('approved_attribution_inactive_rubric_version');
  });
});
