import { describe, expect, it } from 'vitest';

import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { validateContentSources } from './validate-content';

function source(file: string, value: unknown) {
  return { file, text: JSON.stringify(value) };
}

describe('validateContentSources', () => {
  it('parses valid JSON with the canonical FdeCaseSchema', () => {
    const result = validateContentSources([
      source('content/cases/valid.json', createMinimalValidCase()),
    ]);

    expect(result.filesChecked).toBe(1);
    expect(result.issues).toEqual([]);
    expect(result.cases).toHaveLength(1);
  });

  it('reports malformed JSON as a structured issue', () => {
    const result = validateContentSources([
      { file: 'content/cases/broken.json', text: '{"id":' },
    ]);

    expect(result.issues).toEqual([
      expect.objectContaining({
        file: 'content/cases/broken.json',
        path: [],
        code: 'invalid_json',
      }),
    ]);
  });

  it('reports incomplete schema paths', () => {
    const candidate = createMinimalValidCase() as unknown as Record<
      string,
      unknown
    >;
    Reflect.deleteProperty(candidate, 'summary');

    const result = validateContentSources([
      source('content/cases/incomplete.json', candidate),
    ]);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/cases/incomplete.json',
          path: ['summary'],
          code: 'schema_invalid',
        }),
      ]),
    );
  });

  it('rejects executable text in authored case content', () => {
    const candidate = createMinimalValidCase();
    candidate.title = '[unsafe](javascript:alert(1))';

    const result = validateContentSources([
      source('content/cases/unsafe.json', candidate),
    ]);

    expect(result.cases).toEqual([]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      file: 'content/cases/unsafe.json',
      code: 'schema_invalid',
    });
    expect(result.issues[0]?.message).toMatch(/unsafe executable content/i);
  });

  it('reports duplicate case IDs and slugs across files', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();

    const result = validateContentSources([
      source('content/cases/z.json', second),
      source('content/cases/a.json', first),
    ]);

    expect(result.issues.map(({ code }) => code)).toEqual([
      'duplicate_case_id',
      'duplicate_case_slug',
    ]);
    expect(
      result.issues.every(({ file }) => file === 'content/cases/z.json'),
    ).toBe(true);
  });

  it('uses case ID and version as the immutable content key', () => {
    const first = createMinimalValidCase();
    const second = createMinimalValidCase();
    second.metadata.version = 2;

    expect(
      validateContentSources([
        source('content/cases/v1.json', first),
        source('content/cases/v2.json', second),
      ]).issues,
    ).toEqual([]);

    second.metadata.version = 1;
    expect(
      validateContentSources([
        source('content/cases/a.json', first),
        source('content/cases/b.json', second),
      ]).issues.map(({ code }) => code),
    ).toContain('duplicate_case_id');
  });
});

describe('complete content validation', () => {
  const json = (file: string, value: unknown) => ({
    file,
    text: JSON.stringify(value),
  });
  const domain = {
    schemaVersion: 1 as const,
    id: 'diagnostics',
    label: 'Diagnostics',
    description: 'Evidence-led diagnosis.',
    status: 'active' as const,
  };
  const skill = {
    schemaVersion: 1 as const,
    id: 'evidence-assessment',
    domainId: domain.id,
    label: 'Evidence assessment',
    description: 'Assess available evidence.',
    status: 'active' as const,
  };
  const foundation = {
    schemaVersion: 1 as const,
    id: 'http-request-basics',
    type: 'foundation' as const,
    title: 'HTTP request basics',
    domain: 'network',
    track: 'network-api' as const,
    skills: [skill.id],
    level: 'beginner' as const,
    order: 1,
    estimatedMinutes: 8,
    content: {
      simpleExplanation: 'An HTTP request asks a server for a resource.',
      analogy: 'It is like ordering an item from a catalog.',
      technicalExplanation: 'A request carries a method, target, and headers.',
      example: 'GET /health asks for the health resource.',
      commonMistakes: 'Do not assume every successful transport is HTTP 200.',
    },
    relatedCases: ['case-minimal'],
  };

  function publishedCase() {
    const candidate = createMinimalValidCase();
    candidate.status = 'published';
    candidate.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';
    candidate.metadata.reviewer = 'Reviewer';
    candidate.domains = [domain.id];
    candidate.skills = [skill.id];
    candidate.nodes[0].skillWeights = { [skill.id]: 1 };
    return candidate;
  }

  it('validates one coherent config, case, domain, skill, and coverage snapshot', async () => {
    const module = await import('./validate-content');
    expect(module).toHaveProperty('validateContentBundleSources');
    const validateContentBundleSources = Reflect.get(
      module,
      'validateContentBundleSources',
    ) as (sources: unknown) => {
      issues: unknown[];
      cases: unknown[];
      domains: unknown[];
      skills: unknown[];
      foundations: unknown[];
    };
    const candidate = publishedCase();
    const result = validateContentBundleSources({
      config: json('content/manifests/content-config.json', {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [{ caseId: candidate.id, version: 1 }],
      }),
      cases: [json('content/cases/beginner/case-minimal.json', candidate)],
      domains: [json('content/domains/diagnostics.json', domain)],
      skills: [json('content/skills/evidence-assessment.json', skill)],
      foundation: [
        json('content/foundation/network/http-request-basics.json', foundation),
      ],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(result.issues).toEqual([]);
    expect(result.cases).toHaveLength(1);
    expect(result.domains).toHaveLength(1);
    expect(result.skills).toHaveLength(1);
    expect(result.foundations).toHaveLength(1);
  });

  it('reports deterministic Foundation reference, identity, and path issues', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const candidate = publishedCase();
    const inactiveSkill = {
      ...skill,
      id: 'inactive-skill',
      label: 'Inactive skill',
      status: 'deprecated' as const,
    };
    const result = validateContentBundleSources({
      config: json('content/manifests/content-config.json', {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [{ caseId: candidate.id, version: 1 }],
      }),
      cases: [json('content/cases/beginner/case-minimal.json', candidate)],
      domains: [json('content/domains/diagnostics.json', domain)],
      skills: [
        json('content/skills/evidence-assessment.json', skill),
        json('content/skills/inactive-skill.json', inactiveSkill),
      ],
      foundation: [
        json('content/foundation/network/a.json', foundation),
        json('content/foundation/network/z.json', foundation),
        json('content/foundation/network/missing-skill.json', {
          ...foundation,
          id: 'foundation-missing-skill',
          skills: ['unknown-skill'],
        }),
        json('content/foundation/network/inactive-skill.json', {
          ...foundation,
          id: 'foundation-inactive-skill',
          skills: [inactiveSkill.id],
        }),
        json('content/foundation/network/missing-case.json', {
          ...foundation,
          id: 'foundation-missing-case',
          relatedCases: ['case-not-active'],
        }),
        json('content/foundation/ai/domain-mismatch.json', {
          ...foundation,
          id: 'foundation-domain-mismatch',
        }),
      ],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(
      result.issues.filter(({ file }) =>
        file.startsWith('content/foundation/'),
      ),
    ).toEqual([
      {
        file: 'content/foundation/ai/domain-mismatch.json',
        path: ['domain'],
        code: 'foundation_domain_path_mismatch',
        message:
          'Foundation foundation-domain-mismatch declares domain network but is stored under ai.',
      },
      {
        file: 'content/foundation/network/inactive-skill.json',
        path: ['skills', 0],
        code: 'inactive_skill_reference',
        message:
          'Foundation foundation-inactive-skill references inactive skill inactive-skill.',
      },
      {
        file: 'content/foundation/network/missing-case.json',
        path: ['relatedCases', 0],
        code: 'missing_active_case_reference',
        message:
          'Foundation foundation-missing-case references case case-not-active outside the active published catalog.',
      },
      {
        file: 'content/foundation/network/missing-skill.json',
        path: ['skills', 0],
        code: 'missing_skill_reference',
        message:
          'Foundation foundation-missing-skill references missing skill unknown-skill.',
      },
      {
        file: 'content/foundation/network/z.json',
        path: ['id'],
        code: 'duplicate_foundation_id',
        message:
          'Foundation ID http-request-basics duplicates content/foundation/network/a.json.',
      },
    ]);
  });

  it('does not treat a configured unpublished case as an active published Foundation reference', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const candidate = createMinimalValidCase();
    const result = validateContentBundleSources({
      config: json('content/manifests/content-config.json', {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [{ caseId: candidate.id, version: 1 }],
      }),
      cases: [json('content/cases/beginner/case-minimal.json', candidate)],
      domains: [json('content/domains/diagnostics.json', domain)],
      skills: [json('content/skills/evidence-assessment.json', skill)],
      foundation: [
        json('content/foundation/network/http-request-basics.json', foundation),
      ],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/foundation/network/http-request-basics.json',
          path: ['relatedCases', 0],
          code: 'missing_active_case_reference',
        }),
      ]),
    );
  });

  it('still validates Foundation path and Skill references when config parsing fails', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const result = validateContentBundleSources({
      config: {
        file: 'content/manifests/content-config.json',
        text: '{"packId":',
      },
      cases: [],
      domains: [json('content/domains/diagnostics.json', domain)],
      skills: [json('content/skills/evidence-assessment.json', skill)],
      foundation: [
        json('content/foundation/ai/http-request-basics.json', {
          ...foundation,
          skills: ['missing-skill'],
        }),
      ],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'invalid_json',
        'foundation_domain_path_mismatch',
        'missing_skill_reference',
      ]),
    );
  });

  it('treats omitted Case files as out of scope in an explicit partial snapshot', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const candidate = publishedCase();
    const result = validateContentBundleSources({
      partial: true,
      config: json('content/manifests/content-config.json', {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [
          { caseId: candidate.id, version: 1 },
          { caseId: 'case-outside-sample', version: 1 },
        ],
      }),
      cases: [json('content/cases/beginner/case-minimal.json', candidate)],
      domains: [json('content/domains/diagnostics.json', domain)],
      skills: [json('content/skills/evidence-assessment.json', skill)],
      foundation: [
        json('content/foundation/network/http-request-basics.json', {
          ...foundation,
          relatedCases: ['case-outside-sample'],
        }),
      ],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(result.issues).toEqual([]);
  });

  it('rejects duplicate definitions and missing case references', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const candidate = createMinimalValidCase();
    candidate.domains = ['missing-domain'];
    candidate.skills = ['missing-skill'];
    candidate.nodes[0].skillWeights = { 'missing-skill': 1 };
    const config = {
      packId: 'test-pack',
      displayName: 'Test pack',
      contentVersion: '1.0.0',
      releasedAt: '2026-07-13T00:00:00.000Z',
      activeCases: [],
    };
    const coverage = {
      schemaVersion: 1,
      targetCaseCount: 1,
      domains: [{ domainId: domain.id, targetCaseCount: 1 }],
    };
    const result = validateContentBundleSources({
      config: json('content/manifests/content-config.json', config),
      cases: [json('content/cases/beginner/case-minimal.json', candidate)],
      domains: [
        json('content/domains/a.json', domain),
        json('content/domains/b.json', domain),
      ],
      skills: [
        json('content/skills/a.json', skill),
        json('content/skills/b.json', skill),
      ],
      coverage: json('content/coverage/coverage-plan.json', coverage),
    });

    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'duplicate_domain_id',
        'duplicate_skill_id',
        'missing_domain_reference',
        'missing_skill_reference',
      ]),
    );
  });

  it('requires a coverage row for every active domain definition', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const uncoveredDomain = {
      ...domain,
      id: 'agents-evals',
      label: 'Agents and evaluations',
    };
    const deprecatedDomain = {
      ...domain,
      id: 'legacy-domain',
      label: 'Legacy domain',
      status: 'deprecated' as const,
    };

    const result = validateContentBundleSources({
      config: json('content/manifests/content-config.json', {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [],
      }),
      cases: [],
      domains: [
        json('content/domains/diagnostics.json', domain),
        json('content/domains/agents-evals.json', uncoveredDomain),
        json('content/domains/legacy-domain.json', deprecatedDomain),
      ],
      skills: [json('content/skills/evidence-assessment.json', skill)],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(result.issues).toEqual([
      expect.objectContaining({
        file: 'content/domains/agents-evals.json',
        path: ['id'],
        code: 'missing_coverage_domain',
      }),
    ]);
  });

  it('rejects activating two versions of the same stable case ID', async () => {
    const { validateContentBundleSources } = await import('./validate-content');
    const versionOne = createMinimalValidCase();
    versionOne.status = 'published';
    versionOne.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';
    versionOne.metadata.reviewer = 'Reviewer';
    versionOne.domains = [domain.id];
    versionOne.skills = [skill.id];
    versionOne.nodes[0].skillWeights = { [skill.id]: 1 };
    const versionTwo = structuredClone(versionOne);
    versionTwo.metadata.version = 2;

    const result = validateContentBundleSources({
      config: json('content/manifests/content-config.json', {
        packId: 'test-pack',
        displayName: 'Test pack',
        contentVersion: '1.0.0',
        releasedAt: '2026-07-13T00:00:00.000Z',
        activeCases: [
          { caseId: versionOne.id, version: 1 },
          { caseId: versionTwo.id, version: 2 },
        ],
      }),
      cases: [
        json('content/cases/beginner/case-minimal.v1.json', versionOne),
        json('content/cases/beginner/case-minimal.v2.json', versionTwo),
      ],
      domains: [json('content/domains/diagnostics.json', domain)],
      skills: [json('content/skills/evidence-assessment.json', skill)],
      coverage: json('content/coverage/coverage-plan.json', {
        schemaVersion: 1,
        targetCaseCount: 1,
        domains: [{ domainId: domain.id, targetCaseCount: 1 }],
      }),
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      file: 'content/manifests/content-config.json',
      path: ['activeCases', 1],
      code: 'duplicate_active_case',
    });
    expect(result.issues[0]?.message).toMatch(/one active version/i);
  });
});
