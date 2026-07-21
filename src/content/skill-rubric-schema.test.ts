import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { LeafSkillDefinition } from '../domain/skills/types';
import type { SkillRubricCatalog } from '../domain/skills/rubric-types';
import {
  SkillRubricCatalogSchema,
  SkillRubricDefinitionSchema,
} from './skill-rubric-schema';
import { validateSkillRubricCatalog } from './knowledge-v2-validators';

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

const secondLeafSkill: LeafSkillDefinition = {
  schemaVersion: 1,
  id: 'prod.release-verification',
  name: 'Release verification',
  description: 'Verify a release from measurable production signals.',
  parentSkillId: 'reliability.observability',
  capabilityLevel: 1,
  status: 'active',
  evidenceTypes: ['verification'],
  activeRubricVersion: 1,
};

function draftRubricCatalog(): SkillRubricCatalog {
  return {
    schemaVersion: 1,
    rubricSetVersion: '0.1.0',
    skillCatalogVersion: '0.1.0',
    status: 'draft',
    rubrics: [
      {
        schemaVersion: 1,
        id: 'rubric.eng.runtime-debugging',
        skillId: 'eng.runtime-debugging',
        version: 1,
        status: 'draft',
        title: 'Runtime debugging evidence rubric',
        evidenceTypes: ['diagnosis'],
        criteria: [
          {
            criterionId: 'criterion.evidence-triage',
            description:
              'Selects the next diagnostic step from observed evidence.',
            evidenceTypes: ['diagnosis'],
            weight: 1,
            critical: true,
          },
        ],
        thresholds: {
          learning: 1,
          competent: 70,
          proficient: 85,
        },
        metadata: {
          createdAt: '2026-07-17T00:00:00.000Z',
          reviewedAt: null,
          author: 'FDE Arena',
          reviewer: null,
        },
      },
    ],
  };
}

function publishedRubricCatalog(): SkillRubricCatalog {
  const catalog = draftRubricCatalog();
  const rubric = catalog.rubrics[0]!;
  catalog.status = 'published';
  rubric.status = 'published';
  rubric.metadata.reviewedAt = '2026-07-17T01:00:00.000Z';
  rubric.metadata.reviewer = 'reviewer.one';
  return catalog;
}

describe('SkillRubricDefinitionSchema', () => {
  it('accepts a strict versioned draft rubric with stable criterion IDs', () => {
    const rubric = draftRubricCatalog().rubrics[0];

    expect(SkillRubricDefinitionSchema.safeParse(rubric).success).toBe(true);
  });

  it('rejects non-monotonic mastery thresholds', () => {
    const rubric = structuredClone(draftRubricCatalog().rubrics[0]!);
    rubric.thresholds.competent = 90;
    rubric.thresholds.proficient = 85;

    expect(SkillRubricDefinitionSchema.safeParse(rubric).success).toBe(false);
    expect(
      validateSkillRubricCatalog(
        { ...draftRubricCatalog(), rubrics: [rubric] },
        { leafSkills: [leafSkill], skillCatalogStatus: 'draft' },
      ).map(({ code }) => code),
    ).toContain('invalid_threshold_order');
  });

  it('rejects duplicate stable criterion IDs', () => {
    const rubric = structuredClone(draftRubricCatalog().rubrics[0]!);
    rubric.criteria.push(structuredClone(rubric.criteria[0]!));

    expect(SkillRubricDefinitionSchema.safeParse(rubric).success).toBe(false);
  });
});

describe('validateSkillRubricCatalog', () => {
  it('accepts a draft rubric that resolves to a leaf skill', () => {
    expect(
      validateSkillRubricCatalog(draftRubricCatalog(), {
        leafSkills: [leafSkill],
        skillCatalogStatus: 'draft',
      }),
    ).toEqual([]);
  });

  it('rejects a rubric whose leaf skill is missing', () => {
    expect(
      validateSkillRubricCatalog(draftRubricCatalog(), {
        leafSkills: [],
        skillCatalogStatus: 'draft',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_leaf_skill',
          path: ['rubrics', 0, 'skillId'],
        }),
      ]),
    );
  });

  it('rejects duplicate rubric identity versions', () => {
    const catalog = draftRubricCatalog();
    catalog.rubrics.push(structuredClone(catalog.rubrics[0]!));

    expect(
      validateSkillRubricCatalog(catalog, {
        leafSkills: [leafSkill],
        skillCatalogStatus: 'draft',
      }).map(({ code }) => code),
    ).toContain('duplicate_rubric_version');
  });

  it('rejects one rubric ID version reused by different skills', () => {
    const catalog = draftRubricCatalog();
    const reusedIdentity = structuredClone(catalog.rubrics[0]!);
    reusedIdentity.skillId = secondLeafSkill.id;
    reusedIdentity.title = 'Release verification evidence rubric';
    reusedIdentity.evidenceTypes = ['verification'];
    reusedIdentity.criteria = [
      {
        criterionId: 'criterion.release-verification',
        description: 'Evaluates release verification evidence.',
        evidenceTypes: ['verification'],
        weight: 1,
        critical: true,
      },
    ];
    catalog.rubrics.push(reusedIdentity);

    expect(
      validateSkillRubricCatalog(catalog, {
        leafSkills: [leafSkill, secondLeafSkill],
        skillCatalogStatus: 'draft',
      }).map(({ code }) => code),
    ).toContain('duplicate_rubric_id_version');
  });

  it('accepts a complete published rubric catalog for the supplied active leaves', () => {
    expect(
      validateSkillRubricCatalog(publishedRubricCatalog(), {
        leafSkills: [leafSkill],
        skillCatalogStatus: 'published',
      }),
    ).toEqual([]);
  });

  it('rejects an empty published rubric catalog', () => {
    const catalog = publishedRubricCatalog();
    catalog.rubrics = [];

    expect(
      validateSkillRubricCatalog(catalog, {
        leafSkills: [leafSkill],
        skillCatalogStatus: 'published',
      }).map(({ code }) => code),
    ).toEqual(
      expect.arrayContaining([
        'published_catalog_empty',
        'missing_active_leaf_rubric',
      ]),
    );
  });

  it('rejects a published catalog missing an active Leaf rubric', () => {
    expect(
      validateSkillRubricCatalog(publishedRubricCatalog(), {
        leafSkills: [leafSkill, secondLeafSkill],
        skillCatalogStatus: 'published',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_active_leaf_rubric',
          path: ['rubrics'],
        }),
      ]),
    );
  });

  it('rejects duplicate matching published rubrics for an active Leaf', () => {
    const catalog = publishedRubricCatalog();
    const duplicate = structuredClone(catalog.rubrics[0]!);
    duplicate.id = 'rubric.eng.runtime-debugging-alternate';
    catalog.rubrics.push(duplicate);

    expect(
      validateSkillRubricCatalog(catalog, {
        leafSkills: [leafSkill],
        skillCatalogStatus: 'published',
      }).map(({ code }) => code),
    ).toContain('duplicate_active_leaf_rubric');
  });

  it('rejects unpublished rubric items in a published catalog', () => {
    const catalog = publishedRubricCatalog();
    const rubric = catalog.rubrics[0]!;
    rubric.status = 'draft';
    rubric.metadata.reviewedAt = null;
    rubric.metadata.reviewer = null;

    expect(
      validateSkillRubricCatalog(catalog, {
        leafSkills: [leafSkill],
        skillCatalogStatus: 'published',
      }).map(({ code }) => code),
    ).toEqual(
      expect.arrayContaining([
        'published_catalog_contains_unpublished_rubric',
        'missing_active_leaf_rubric',
      ]),
    );
  });
});

describe('checked-in rubric foundation', () => {
  it('keeps the only example explicit, partial, and draft', () => {
    const source: unknown = JSON.parse(
      readFileSync(
        join(process.cwd(), 'content/skill-rubrics/v1/draft-example.json'),
        'utf8',
      ),
    );
    const catalog = SkillRubricCatalogSchema.parse(source);

    expect(catalog.status).toBe('draft');
    expect(catalog.rubrics).toHaveLength(1);
    expect(catalog.rubrics[0]?.status).toBe('draft');
    expect(catalog.rubrics[0]?.skillId).toBe('eng.runtime-debugging');
  });
});
