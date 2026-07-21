import { existsSync, readFileSync } from 'node:fs';

import { FdeCaseSchema } from '../schemas/case.schema';
import { ContentConfigSchema, SkillDefinitionSchema } from './schemas';
import { FoundationKnowledgeSchema } from './foundation-schema';
import { PROJECT_ROOT, readContentSources } from '../../scripts/files';

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(`${PROJECT_ROOT}/${file}`, 'utf8'));
}

describe('bundled Foundation corpus', () => {
  it('contains the complete 100-item MVP with valid stable references', () => {
    const foundationDirectory = `${PROJECT_ROOT}/content/foundation`;
    const sources = existsSync(foundationDirectory)
      ? readContentSources(PROJECT_ROOT, 'content/foundation')
      : [];
    const foundations = sources.map(({ text }) =>
      FoundationKnowledgeSchema.parse(JSON.parse(text)),
    );
    const skills = readContentSources(PROJECT_ROOT, 'content/skills').map(
      ({ text }) => SkillDefinitionSchema.parse(JSON.parse(text)),
    );
    const cases = readContentSources(PROJECT_ROOT, 'content/cases').map(
      ({ text }) => FdeCaseSchema.parse(JSON.parse(text)),
    );
    const config = ContentConfigSchema.parse(
      readJson('content/manifests/content-config.json'),
    );
    const activeSkills = new Set(
      skills.filter(({ status }) => status === 'active').map(({ id }) => id),
    );
    const activeCaseVersions = new Set(
      config.activeCases.map(({ caseId, version }) => `${caseId}@${version}`),
    );
    const activeCaseById = new Map(
      cases
        .filter(
          (candidate) =>
            candidate.status === 'published' &&
            activeCaseVersions.has(
              `${candidate.id}@${candidate.metadata.version}`,
            ),
        )
        .map((candidate) => [candidate.id, candidate]),
    );
    const activeCases = new Set(activeCaseById.keys());

    expect(activeCases.size).toBe(50);

    expect(foundations).toHaveLength(100);
    expect(new Set(foundations.map(({ id }) => id)).size).toBe(100);
    expect(new Set(foundations.map(({ order }) => order)).size).toBe(100);
    expect(foundations.map(({ order }) => order).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );

    expect(
      Object.fromEntries(
        ['computer-basics', 'network-api', 'ai-basics'].map((track) => [
          track,
          foundations.filter((item) => item.track === track).length,
        ]),
      ),
    ).toEqual({
      'computer-basics': 30,
      'network-api': 40,
      'ai-basics': 30,
    });

    expect(
      foundations.filter(({ domain }) => domain === 'computer-basics'),
    ).toHaveLength(20);
    expect(
      foundations.filter(({ domain }) => domain === 'fde-methodology'),
    ).toHaveLength(10);

    for (const item of foundations) {
      expect(item.skills.every((skillId) => activeSkills.has(skillId))).toBe(
        true,
      );
      expect(item.relatedCases.every((caseId) => activeCases.has(caseId))).toBe(
        true,
      );
      for (const caseId of item.relatedCases) {
        const relatedCase = activeCaseById.get(caseId);
        expect(
          relatedCase !== undefined &&
            item.skills.some((skillId) => relatedCase.skills.includes(skillId)),
        ).toBe(true);
      }
      const authoredSections = [
        item.content.simpleExplanation,
        item.content.analogy,
        item.content.technicalExplanation,
        item.content.example,
        item.content.commonMistakes,
      ];
      for (const section of authoredSections) {
        expect(section.trim().length).toBeGreaterThanOrEqual(45);
      }
      expect(
        item.content.simpleExplanation.match(/[.!?。！？]/g) ?? [],
      ).toHaveLength(1);
      expect(item.content.simpleExplanation).toMatch(/[.!?。！？]$/);
    }

    const foundationLinkedCases = new Set(
      foundations.flatMap(({ relatedCases }) => relatedCases),
    );
    expect(
      [...activeCases].filter((caseId) => !foundationLinkedCases.has(caseId)),
    ).toEqual([]);

    expect(foundations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'api-basic',
        'http-request-basic',
        'rag-basic',
        'agent-basic',
        'agent.tool-calling',
        'computer.process-lifecycle',
        'api.oauth-scope-audience',
        'ai.chunking-strategy',
        'fde.problem-scoping',
      ]),
    );
  });

  it('keeps every Foundation-to-Case relation on a shared active Skill', () => {
    const foundations = readContentSources(
      PROJECT_ROOT,
      'content/foundation',
    ).map(({ text }) => FoundationKnowledgeSchema.parse(JSON.parse(text)));
    const cases = readContentSources(PROJECT_ROOT, 'content/cases').map(
      ({ text }) => FdeCaseSchema.parse(JSON.parse(text)),
    );
    const config = ContentConfigSchema.parse(
      readJson('content/manifests/content-config.json'),
    );
    const activeVersions = new Set(
      config.activeCases.map(({ caseId, version }) => `${caseId}@${version}`),
    );
    const activeCaseById = new Map(
      cases
        .filter((candidate) =>
          activeVersions.has(`${candidate.id}@${candidate.metadata.version}`),
        )
        .map((candidate) => [candidate.id, candidate]),
    );

    expect(
      foundations.flatMap((foundation) =>
        foundation.relatedCases.flatMap((caseId) => {
          const relatedCase = activeCaseById.get(caseId);
          return relatedCase !== undefined &&
            foundation.skills.some((skillId) =>
              relatedCase.skills.includes(skillId),
            )
            ? []
            : [`${foundation.id}->${caseId}`];
        }),
      ),
    ).toEqual([]);
  });
});
