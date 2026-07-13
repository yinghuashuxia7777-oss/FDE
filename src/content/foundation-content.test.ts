import { existsSync, readFileSync } from 'node:fs';

import { FdeCaseSchema } from '../schemas/case.schema';
import { ContentConfigSchema, SkillDefinitionSchema } from './schemas';
import { FoundationKnowledgeSchema } from './foundation-schema';
import { PROJECT_ROOT, readContentSources } from '../../scripts/files';

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(`${PROJECT_ROOT}/${file}`, 'utf8'));
}

describe('bundled Foundation corpus', () => {
  it('contains the complete 30-item MVP with valid stable references', () => {
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
    const activeCases = new Set(
      cases
        .filter(
          (candidate) =>
            candidate.status === 'published' &&
            activeCaseVersions.has(
              `${candidate.id}@${candidate.metadata.version}`,
            ),
        )
        .map(({ id }) => id),
    );

    expect(foundations).toHaveLength(30);
    expect(new Set(foundations.map(({ id }) => id)).size).toBe(30);
    expect(new Set(foundations.map(({ order }) => order)).size).toBe(30);
    expect(foundations.map(({ order }) => order).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );

    expect(
      Object.fromEntries(
        ['computer-basics', 'network-api', 'ai-basics'].map((track) => [
          track,
          foundations.filter((item) => item.track === track).length,
        ]),
      ),
    ).toEqual({
      'computer-basics': 10,
      'network-api': 10,
      'ai-basics': 10,
    });

    for (const item of foundations) {
      expect(item.skills.every((skillId) => activeSkills.has(skillId))).toBe(
        true,
      );
      expect(item.relatedCases.every((caseId) => activeCases.has(caseId))).toBe(
        true,
      );
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

    expect(foundations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'api-basic',
        'http-request-basic',
        'rag-basic',
        'agent-basic',
        'agent.tool-calling',
      ]),
    );
  });
});
