import { createMinimalValidCase } from '../tests/fixtures/cases';
import {
  ContentConfigSchema,
  ContentManifestSchema,
  ContentPackSchema,
  CoveragePlanSchema,
  DomainDefinitionSchema,
  SkillDefinitionSchema,
} from './schemas';
import {
  CURRENT_CONTENT_SCHEMA_VERSION,
  type ContentManifest,
  type ContentPack,
  type CoveragePlan,
  type DomainDefinition,
  type SkillDefinition,
} from './contracts';
import { parseCaseContent } from './parse-content';
import { registeredContentMigrations } from './migrations';

const domain: DomainDefinition = {
  schemaVersion: 1,
  id: 'rag-search',
  label: 'RAG, search & enterprise knowledge',
  description: 'Retrieval and grounded enterprise knowledge systems.',
  status: 'active',
};

const skill: SkillDefinition = {
  schemaVersion: 1,
  id: 'rag.metadata-filter',
  domainId: domain.id,
  label: 'Metadata filtering',
  description: 'Apply authorization-aware metadata filters.',
  status: 'active',
};

const coverage: CoveragePlan = {
  schemaVersion: 1,
  targetCaseCount: 362,
  domains: [{ domainId: domain.id, targetCaseCount: 362 }],
};

const manifest: ContentManifest = {
  packId: 'fde-arena-bundled',
  displayName: 'FDE Arena bundled content',
  contentVersion: '1.0.0',
  schemaVersion: 1,
  releasedAt: '2026-07-13T00:00:00.000Z',
  activePublishedCaseCount: 1,
  caseVersionCount: 1,
  activeCases: [{ caseId: 'case-minimal', version: 1 }],
  activeCaseIds: ['case-minimal'],
  allCaseIds: ['case-minimal'],
  domains: [domain.id],
  domainCaseCounts: { [domain.id]: 1 },
  cases: [
    {
      caseId: 'case-minimal',
      version: 1,
      schemaVersion: 1,
      status: 'published',
      path: 'content/cases/beginner/case-minimal.v1.json',
      contentHash: `sha256:${'a'.repeat(64)}`,
    },
  ],
  checksum: `sha256:${'b'.repeat(64)}`,
};

describe('content contracts', () => {
  it('uses schema version one without registering a fake future migration', () => {
    expect(CURRENT_CONTENT_SCHEMA_VERSION).toBe(1);
    expect(registeredContentMigrations).toEqual([]);
  });

  it('validates domain, skill, coverage, config, manifest, and pack snapshots', () => {
    const publishedCase = createMinimalValidCase();
    publishedCase.status = 'published';
    publishedCase.metadata.reviewedAt = '2026-07-13T00:00:00.000Z';
    publishedCase.metadata.reviewer = 'FDE Arena reviewer';
    const pack: ContentPack = {
      formatVersion: 1,
      manifest,
      cases: [publishedCase],
      domains: [domain],
      skills: [skill],
      coverage,
    };

    expect(DomainDefinitionSchema.parse(domain)).toEqual(domain);
    expect(SkillDefinitionSchema.parse(skill)).toEqual(skill);
    expect(CoveragePlanSchema.parse(coverage)).toEqual(coverage);
    expect(
      ContentConfigSchema.parse({
        packId: manifest.packId,
        displayName: manifest.displayName,
        contentVersion: manifest.contentVersion,
        releasedAt: manifest.releasedAt,
        activeCases: manifest.activeCases,
      }),
    ).toBeDefined();
    expect(
      ContentConfigSchema.safeParse({
        packId: manifest.packId,
        displayName: manifest.displayName,
        contentVersion: manifest.contentVersion,
        releasedAt: manifest.releasedAt,
      }).success,
    ).toBe(false);
    expect(ContentManifestSchema.parse(manifest)).toEqual(manifest);
    expect(ContentPackSchema.parse(pack)).toEqual(pack);
  });

  it('uses definition status as the only activation truth for domains and skills', () => {
    const config = {
      packId: manifest.packId,
      displayName: manifest.displayName,
      contentVersion: manifest.contentVersion,
      releasedAt: manifest.releasedAt,
      activeCases: manifest.activeCases,
    };

    expect(ContentConfigSchema.parse(config)).toEqual(config);
    expect(
      ContentConfigSchema.safeParse({
        ...config,
        activeDomainIds: [domain.id],
        activeSkillIds: [skill.id],
      }).success,
    ).toBe(false);
  });

  it('loads schema version one and rejects unknown future case schemas', () => {
    const candidate = createMinimalValidCase();
    expect(parseCaseContent(candidate)).toEqual(candidate);
    expect(() => parseCaseContent({ ...candidate, schemaVersion: 2 })).toThrow(
      /unsupported case schema version 2/i,
    );
  });

  it('requires explicit nullable review metadata for draft content', () => {
    const candidate = createMinimalValidCase();
    expect(candidate.metadata.reviewedAt).toBeNull();
    expect(candidate.metadata.reviewer).toBeNull();
    expect(candidate.metadata.applicableVersions).toEqual([]);
  });

  it('requires coverage rows for active pack domains but not deprecated definitions', () => {
    const publishedCase = createMinimalValidCase();
    publishedCase.status = 'published';
    publishedCase.metadata.reviewedAt = '2026-07-13T00:00:00.000Z';
    publishedCase.metadata.reviewer = 'FDE Arena reviewer';
    const uncoveredDomain: DomainDefinition = {
      ...domain,
      id: 'agents-evals',
      label: 'Agents and evaluations',
    };
    const deprecatedDomain: DomainDefinition = {
      ...domain,
      id: 'legacy-domain',
      label: 'Legacy domain',
      status: 'deprecated',
    };
    const manifestWithExtraDomain: ContentManifest = {
      ...manifest,
      domains: [domain.id, uncoveredDomain.id],
      domainCaseCounts: { [domain.id]: 1, [uncoveredDomain.id]: 0 },
    };

    expect(
      ContentPackSchema.safeParse({
        formatVersion: 1,
        manifest: manifestWithExtraDomain,
        cases: [publishedCase],
        domains: [domain, uncoveredDomain],
        skills: [skill],
        coverage,
      }).success,
    ).toBe(false);
    expect(
      ContentPackSchema.safeParse({
        formatVersion: 1,
        manifest: {
          ...manifestWithExtraDomain,
          domains: [domain.id, deprecatedDomain.id],
          domainCaseCounts: { [domain.id]: 1, [deprecatedDomain.id]: 0 },
        },
        cases: [publishedCase],
        domains: [domain, deprecatedDomain],
        skills: [skill],
        coverage,
      }).success,
    ).toBe(true);
  });
});
