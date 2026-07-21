import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  SkillGraphCatalogSchema,
  SkillGraphEdgeSchema,
} from './skill-graph-schema';

const validCatalog = {
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
      id: 'edge.software-presentation',
      type: 'presents-as',
      legacySkillId: 'software.foundations',
      presentationSkillId: 'capability.software',
      canonical: true,
    },
  ],
};

describe('SkillGraphCatalogSchema', () => {
  it('accepts a strict draft catalog with explicit discriminated edges', () => {
    expect(SkillGraphCatalogSchema.safeParse(validCatalog).success).toBe(true);
  });

  it('requires schemaVersion 1 on every leaf definition', () => {
    const catalog = structuredClone(validCatalog) as unknown as {
      leaves: { schemaVersion?: number }[];
    };
    delete catalog.leaves[0]!.schemaVersion;

    expect(SkillGraphCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects an unsupported edge discriminator', () => {
    expect(
      SkillGraphEdgeSchema.safeParse({
        id: 'edge.inferred',
        type: 'inferred-parent',
        sourceId: 'eng.runtime-debugging',
        targetId: 'software.foundations',
      }).success,
    ).toBe(false);
  });

  it('rejects fields from the wrong edge shape', () => {
    expect(
      SkillGraphEdgeSchema.safeParse({
        id: 'edge.wrong-shape',
        type: 'prerequisite',
        leafSkillId: 'eng.runtime-debugging',
        legacySkillId: 'software.foundations',
      }).success,
    ).toBe(false);
  });

  it('keeps the first checked-in catalog explicitly partial and draft', () => {
    const source: unknown = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'content/skill-graph/v2/releases/0.1.0/catalog.json',
        ),
        'utf8',
      ),
    );
    const catalog = SkillGraphCatalogSchema.parse(source);

    expect(catalog.status).toBe('draft');
    expect(catalog.expectedLeafCount).toBe(70);
    expect(catalog.leaves.length).toBeLessThan(catalog.expectedLeafCount);
    expect(catalog.leaves.every((leaf) => leaf.schemaVersion === 1)).toBe(true);
    expect(
      [...new Set(catalog.leaves.map(({ capabilityLevel }) => capabilityLevel))]
        .sort()
        .join(','),
    ).toBe('0,1,2,3,4,5,6');
    expect(catalog.edges.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['rolls-up-to', 'prerequisite', 'presents-as']),
    );
  });
});
