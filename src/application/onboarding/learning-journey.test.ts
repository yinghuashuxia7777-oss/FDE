import type { SkillDefinition } from '../../content/contracts';
import { bundledFoundationSource } from '../../content/foundation-source';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import type { FoundationKnowledge } from '../../domain/foundation/types';
import type {
  AttemptRecord,
  CaseProgressRecord,
  CaseSummary,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import {
  buildGrowthRoadmap,
  isNewLearner,
  selectFirstMission,
  selectJourneyNextFoundation,
} from './learning-journey';

function foundation(
  id: string,
  order: number,
  track: FoundationKnowledge['track'],
  skills: string[],
): FoundationKnowledge {
  return {
    schemaVersion: 1,
    id,
    type: 'foundation',
    title: `${id} title`,
    domain: id.startsWith('fde.')
      ? 'fde-methodology'
      : (id.split('.')[0] ?? 'computer-basics'),
    track,
    skills,
    level: 'beginner',
    order,
    estimatedMinutes: order + 4,
    content: {
      simpleExplanation: `${id} explains a real engineering boundary.`,
      analogy: `${id} analogy`,
      technicalExplanation: `${id} technical explanation`,
      example: `${id} example`,
      commonMistakes: `${id} common mistakes`,
    },
    relatedCases: [],
  };
}

function concept(
  id: string,
  category: ConceptKnowledge['category'],
  relatedFoundation: string[],
): ConceptKnowledge {
  return {
    schemaVersion: 1,
    id,
    type: 'concept',
    category,
    order: 1,
    title: `${id} title`,
    technicalTerm: id,
    simpleExplanation: `${id} simple explanation`,
    analogy: `${id} analogy`,
    technicalExplanation: `${id} technical explanation`,
    whyItMatters: `${id} matters in customer systems`,
    commonMistakes: `${id} common mistakes`,
    relatedFoundation,
    relatedCases: [],
  };
}

function caseSummary(id: string, skills: string[]): CaseSummary {
  return {
    id,
    slug: id,
    title: `${id} title`,
    summary: `${id} summary`,
    scenarioSummary: `${id} scenario`,
    level: 'beginner',
    status: 'published',
    version: 1,
    estimatedMinutes: 12,
    domains: ['customer-discovery'],
    skills,
    riskTypes: ['operational'],
    technicalLayers: ['application'],
    nodeTypes: ['single-choice'],
  };
}

function skill(id: string): SkillDefinition {
  return {
    schemaVersion: 1,
    id,
    domainId: 'software-foundations',
    label: `${id} label`,
    description: `${id} description`,
    status: 'active',
  };
}

const foundations = [
  foundation('api-basic', 6, 'computer-basics', ['api.integration']),
  foundation('api.token-authentication', 18, 'network-api', [
    'api.integration',
    'security.governance',
  ]),
  foundation('ai.llm', 21, 'ai-basics', ['llm.applications']),
  foundation('ai.prompt', 24, 'ai-basics', ['llm.applications']),
  foundation('fde.problem-scoping', 91, 'computer-basics', [
    'customer.discovery',
  ]),
  foundation('fde.requirement-evidence', 92, 'computer-basics', [
    'customer.discovery',
  ]),
];

describe('learning journey selectors', () => {
  it('recognizes a new learner until completed learning evidence exists', () => {
    expect(isNewLearner([], [], [])).toBe(true);
    expect(
      isNewLearner(
        [],
        [
          {
            userId: 'local-user',
            skillId: 'api.integration',
            score: 0,
            sampleCount: 0,
            updatedAt: '2026-07-14T00:00:00.000Z',
          },
        ],
        [],
      ),
    ).toBe(true);

    const inProgressAttempt: AttemptRecord = {
      id: 'attempt-one',
      userId: 'local-user',
      caseId: 'case-one',
      caseVersion: 1,
      schemaVersion: 1,
      status: 'in-progress',
      startedAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
      currentNodeId: 'node-one',
      criticalErrorIds: [],
      visitedNodeIds: ['node-one'],
      roundHistory: [],
    };
    expect(isNewLearner([], [], [inProgressAttempt])).toBe(true);

    const completedAttempt: AttemptRecord = {
      id: 'attempt-completed',
      userId: 'local-user',
      caseId: 'case-one',
      caseVersion: 1,
      schemaVersion: 1,
      status: 'completed',
      startedAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:10:00.000Z',
      completedAt: '2026-07-14T00:10:00.000Z',
      currentNodeId: null,
      score: 80,
      verdict: 'pass',
      criticalErrorIds: [],
      visitedNodeIds: ['node-one'],
      roundHistory: [],
    };
    expect(isNewLearner([], [], [completedAttempt])).toBe(false);

    const progress: CaseProgressRecord = {
      userId: 'local-user',
      caseId: 'case-one',
      caseVersion: 1,
      latestAttemptId: 'attempt-one',
      attemptCount: 1,
      completedCount: 1,
      highestScore: 80,
      latestScore: 80,
      latestVerdict: 'pass',
      hasCriticalError: false,
      updatedAt: '2026-07-14T00:00:00.000Z',
    };
    expect(
      isNewLearner(
        [
          {
            ...progress,
            completedCount: 0,
            highestScore: 0,
            latestScore: 0,
            latestVerdict: 'fail',
          },
        ],
        [],
        [inProgressAttempt],
      ),
    ).toBe(true);
    expect(isNewLearner([progress], [], [])).toBe(false);

    const mastery: SkillMasteryRecord = {
      userId: 'local-user',
      skillId: 'api.integration',
      score: 20,
      sampleCount: 1,
      updatedAt: '2026-07-14T00:00:00.000Z',
    };
    expect(isNewLearner([], [mastery], [])).toBe(false);
  });

  it.each([
    ['zero-basics', 'api-basic'],
    ['programming-basics', 'ai.llm'],
    ['ai-project', 'fde.problem-scoping'],
  ] as const)(
    'selects a real stable-ID First Mission for %s',
    (startingPoint, expectedId) => {
      const mission = selectFirstMission({
        startingPoint,
        foundations,
        cases: [caseSummary('case-one', ['customer.discovery'])],
        progress: [],
        mastery: [],
        attempts: [],
        completedMissionIds: [],
      });

      expect(mission).toMatchObject({
        kind: 'foundation',
        id: expectedId,
        motivation: `${expectedId} explains a real engineering boundary.`,
        to: `/foundation/${expectedId}`,
        reason: startingPoint,
      });
      expect(mission?.title).toBe(`${expectedId} title`);
      expect(mission?.estimatedMinutes).toBe(
        foundations.find(({ id }) => id === expectedId)?.estimatedMinutes,
      );
    },
  );

  it('keeps every curated First Mission anchor in the bundled Foundation catalog', async () => {
    const ids = new Set(
      (await bundledFoundationSource.loadAll()).map(({ id }) => id),
    );
    const anchors = [
      'api-basic',
      'api.token-authentication',
      'ai.llm',
      'ai.prompt',
      'fde.problem-scoping',
      'fde.requirement-evidence',
    ];

    expect(anchors.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('advances only from an explicitly completed onboarding mission and safely falls back', () => {
    const nextMission = selectFirstMission({
      startingPoint: 'zero-basics',
      foundations,
      cases: [],
      progress: [],
      mastery: [],
      attempts: [],
      completedMissionIds: ['api-basic'],
    });
    expect(nextMission?.id).toBe('api.token-authentication');

    expect(
      selectJourneyNextFoundation('api-basic', foundations, [], [])?.id,
    ).toBe('api.token-authentication');
    expect(
      selectFirstMission({
        startingPoint: 'zero-basics',
        foundations: [],
        cases: [caseSummary('case-fallback', ['api.integration'])],
        progress: [],
        mastery: [],
        attempts: [],
        completedMissionIds: [],
      }),
    ).toMatchObject({
      kind: 'case',
      id: 'case-fallback',
      motivation: 'case-fallback scenario',
      to: '/training/case-fallback',
    });

    expect(
      selectFirstMission({
        startingPoint: 'zero-basics',
        foundations: [],
        cases: [caseSummary('case-fallback', ['api.integration'])],
        progress: [
          {
            userId: 'local-user',
            caseId: 'case-fallback',
            caseVersion: 1,
            latestAttemptId: 'attempt-in-progress',
            attemptCount: 1,
            completedCount: 0,
            highestScore: 0,
            latestScore: 0,
            latestVerdict: 'fail',
            hasCriticalError: false,
            updatedAt: '2026-07-14T00:00:00.000Z',
          },
        ],
        mastery: [],
        attempts: [],
        completedMissionIds: [],
      })?.id,
    ).toBe('case-fallback');

    expect(
      selectFirstMission({
        startingPoint: 'zero-basics',
        foundations: [],
        cases: [
          caseSummary('case-fallback', ['api.integration']),
          caseSummary('case-next', ['api.integration']),
        ],
        progress: [],
        mastery: [],
        attempts: [],
        completedMissionIds: ['case-fallback'],
      })?.id,
    ).toBe('case-next');
  });

  it('keeps Foundation next steps monotonic instead of cycling to earlier content', () => {
    expect(
      selectJourneyNextFoundation(
        'api.token-authentication',
        foundations,
        [],
        [],
      )?.id,
    ).toBe('ai.llm');
    expect(
      selectJourneyNextFoundation(
        'fde.requirement-evidence',
        foundations,
        [],
        [],
      ),
    ).toBeUndefined();
  });

  it('builds four roadmap stages only from Foundation, Concept, and Skill data', () => {
    const roadmap = buildGrowthRoadmap({
      foundations,
      concepts: [
        concept('concept.system', 'system', ['api-basic']),
        concept('concept.api', 'api-backend', ['api.token-authentication']),
        concept('concept.ai', 'ai', ['ai.llm']),
        concept('concept.fde', 'fde', ['fde.problem-scoping']),
      ],
      skills: [
        skill('api.integration'),
        skill('security.governance'),
        skill('llm.applications'),
        skill('customer.discovery'),
      ],
    });

    expect(roadmap.map(({ id }) => id)).toEqual([
      'level-0',
      'level-1',
      'level-2',
      'level-3',
    ]);
    expect(roadmap[0]).toEqual({
      id: 'level-0',
      foundationCount: 1,
      conceptCount: 1,
      skillCount: 1,
    });
    expect(roadmap[1]).toEqual({
      id: 'level-1',
      foundationCount: 1,
      conceptCount: 1,
      skillCount: 2,
    });
    expect(roadmap[2]).toEqual({
      id: 'level-2',
      foundationCount: 2,
      conceptCount: 1,
      skillCount: 1,
    });
    expect(roadmap[3]).toEqual({
      id: 'level-3',
      foundationCount: 2,
      conceptCount: 1,
      skillCount: 1,
    });
  });
});
