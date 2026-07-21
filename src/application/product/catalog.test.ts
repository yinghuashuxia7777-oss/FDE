import type {
  CaseProgressRecord,
  CaseSummary,
  CompletedAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import {
  buildDailyTrainingPlan,
  calculateTrainingStreak,
  masteryStatus,
  recommendCases,
} from './catalog';

function caseSummary(id: string, skills: string[]): CaseSummary {
  return {
    id,
    slug: id,
    title: id,
    summary: id,
    level: 'beginner',
    status: 'published',
    version: 1,
    estimatedMinutes: 10,
    domains: ['customer-discovery'],
    skills,
    riskTypes: ['operational'],
    scenarioSummary: id,
    technicalLayers: ['application'],
    nodeTypes: ['single-choice'],
  };
}

function mastery(
  skillId: string,
  score: number,
  sampleCount = 1,
): SkillMasteryRecord {
  return {
    userId: 'local-user',
    skillId,
    score,
    sampleCount,
    updatedAt: '2026-07-13T00:00:00.000Z',
  };
}

function progress(caseId: string, updatedAt: string): CaseProgressRecord {
  return {
    userId: 'local-user',
    caseId,
    caseVersion: 1,
    latestAttemptId: `${caseId}-attempt`,
    attemptCount: 1,
    completedCount: 1,
    highestScore: 80,
    latestScore: 80,
    latestVerdict: 'pass',
    hasCriticalError: false,
    updatedAt,
  };
}

function completedAttempt(
  caseId: string,
  completedAt: string,
  overrides: Partial<CompletedAttemptRecord> = {},
): CompletedAttemptRecord {
  return {
    id: `${caseId}-attempt`,
    userId: 'local-user',
    caseId,
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: completedAt,
    updatedAt: completedAt,
    completedAt,
    currentNodeId: null,
    score: 82,
    verdict: 'pass',
    criticalErrorIds: [],
    visitedNodeIds: [],
    roundHistory: [],
    ...overrides,
  };
}

describe('daily training plan', () => {
  const now = new Date(2026, 6, 13, 12);

  it('ranks critical mistakes, weak mastery, and recent failures in strict order', () => {
    const failed = progress('recent-failure', '2026-07-12T10:00:00.000Z');
    failed.latestVerdict = 'fail';

    const plan = buildDailyTrainingPlan(
      [
        caseSummary('recent-failure', ['steady']),
        caseSummary('weak-mastery', ['weak-skill']),
        caseSummary('critical-transfer', ['critical-skill']),
      ],
      [failed],
      [mastery('weak-skill', 32, 4)],
      [
        {
          caseId: 'historical-case',
          critical: true,
          skillIds: ['critical-skill'],
          createdAt: '2026-07-12T11:00:00.000Z',
        } as MistakeRecord,
      ],
      [],
      now,
    );

    expect([
      plan.focusCase?.caseSummary.id,
      ...plan.nextCases.map(({ caseSummary: item }) => item.id),
    ]).toEqual(['critical-transfer', 'weak-mastery', 'recent-failure']);
    expect(plan.focusCase?.reason).toMatch(/critical/i);
    expect(plan.nextCases[0]?.reason).toMatch(/below 40/i);
    expect(plan.nextCases[1]?.reason).toMatch(/failed/i);
  });

  it('ranks migration verification before unfinished work and fallback', () => {
    const fallback = progress('fallback', '2026-01-01T00:00:00.000Z');

    const plan = buildDailyTrainingPlan(
      [
        caseSummary('fallback', ['steady']),
        caseSummary('unfinished', ['unseen']),
        caseSummary('migration-check', ['newly-competent']),
      ],
      [fallback],
      [mastery('newly-competent', 65, 2), mastery('steady', 80, 8)],
      [],
      [],
      now,
    );

    expect([
      plan.focusCase?.caseSummary.id,
      ...plan.nextCases.map(({ caseSummary: item }) => item.id),
    ]).toEqual(['migration-check', 'unfinished', 'fallback']);
    expect(plan.focusCase?.reason).toMatch(/newly learned/i);
  });

  it('ranks a recent failure before migration verification', () => {
    const failed = progress('recent-failure', '2026-07-12T10:00:00.000Z');
    failed.latestVerdict = 'fail';

    const plan = buildDailyTrainingPlan(
      [
        caseSummary('migration-check', ['newly-competent']),
        caseSummary('recent-failure', ['steady']),
      ],
      [failed],
      [mastery('newly-competent', 65, 2)],
      [],
      [],
      now,
    );

    expect(plan.focusCase?.caseSummary.id).toBe('recent-failure');
    expect(plan.nextCases[0]?.caseSummary.id).toBe('migration-check');
  });

  it('does not let a repaired critical mistake permanently dominate the plan', () => {
    const repaired = progress('repaired-critical', '2026-07-12T10:00:00.000Z');
    repaired.hasCriticalError = true;
    repaired.latestVerdict = 'pass';

    const plan = buildDailyTrainingPlan(
      [
        caseSummary('repaired-critical', ['risk-skill']),
        caseSummary('uncompleted', ['steady']),
      ],
      [repaired],
      [mastery('risk-skill', 70, 3)],
      [
        {
          caseId: 'repaired-critical',
          nodeId: 'critical-node',
          critical: true,
          skillIds: ['risk-skill'],
          createdAt: '2026-07-11T10:00:00.000Z',
        } as MistakeRecord,
      ],
      [
        completedAttempt('repaired-critical', '2026-07-12T10:00:00.000Z', {
          criticalErrorIds: [],
          verdict: 'pass',
          roundHistory: [
            {
              nodeId: 'critical-node',
              attemptNumber: 1,
              submission: {
                type: 'choice',
                selectedOptionIds: ['correct'],
              },
              evaluation: {
                isCorrect: true,
                scoreRatio: 1,
                errorTypes: [],
                criticalErrorIds: [],
                consequences: [],
                branchKey: 'correct',
              },
              submittedAt: '2026-07-12T09:55:00.000Z',
              revealed: false,
            },
          ],
        }),
      ],
      now,
    );

    expect(plan.focusCase?.caseSummary.id).toBe('uncompleted');
    expect(plan.nextCases[0]?.caseSummary.id).toBe('repaired-critical');
    expect(plan.nextCases[0]?.reason).not.toMatch(/critical/i);
  });

  it('keeps a critical mistake unresolved when a later pass skips its node', () => {
    const plan = buildDailyTrainingPlan(
      [
        caseSummary('critical-origin', ['risk-skill']),
        caseSummary('uncompleted', ['steady']),
      ],
      [],
      [mastery('risk-skill', 50, 3)],
      [
        {
          caseId: 'critical-origin',
          nodeId: 'critical-node',
          critical: true,
          skillIds: ['risk-skill'],
          createdAt: '2026-07-11T10:00:00.000Z',
        } as MistakeRecord,
      ],
      [
        completedAttempt('critical-origin', '2026-07-12T10:00:00.000Z', {
          roundHistory: [
            {
              nodeId: 'different-branch-node',
              attemptNumber: 1,
              submission: {
                type: 'choice',
                selectedOptionIds: ['correct'],
              },
              evaluation: {
                isCorrect: true,
                scoreRatio: 1,
                errorTypes: [],
                criticalErrorIds: [],
                consequences: [],
                branchKey: 'correct',
              },
              submittedAt: '2026-07-12T09:55:00.000Z',
              revealed: false,
            },
          ],
        }),
      ],
      now,
    );

    expect(plan.focusCase?.caseSummary.id).toBe('critical-origin');
    expect(plan.focusCase?.reason).toMatch(/critical/i);
  });

  it('retains today completed cases with the latest review attempt and remaining estimate', () => {
    const plan = buildDailyTrainingPlan(
      [
        caseSummary('focus', ['risk']),
        caseSummary('completed-today', ['steady']),
        caseSummary('next', ['steady']),
      ],
      [],
      [],
      [
        {
          caseId: 'focus',
          critical: true,
          skillIds: ['risk'],
        } as MistakeRecord,
      ],
      [
        completedAttempt('completed-today', '2026-07-13T08:00:00.000Z', {
          id: 'older-attempt',
          score: 70,
        }),
        completedAttempt('completed-today', '2026-07-13T09:00:00.000Z', {
          id: 'review-attempt',
          score: 91,
        }),
      ],
      now,
    );

    expect(plan.focusCase).toMatchObject({
      caseSummary: { id: 'completed-today' },
      completedToday: true,
      attemptId: 'review-attempt',
      score: 91,
    });
    expect(plan.completedCount).toBe(1);
    expect(plan.plannedCount).toBe(3);
    expect(plan.estimatedMinutes).toBe(30);
  });

  it('ignores invalid completion dates and filters, de-duplicates, and orders cases deterministically', () => {
    const duplicateV2 = caseSummary('case-b', ['steady']);
    duplicateV2.version = 2;
    const expert = caseSummary('expert', ['steady']);
    expert.level = 'expert';
    const draft = caseSummary('draft', ['steady']);
    draft.status = 'draft';

    const plan = buildDailyTrainingPlan(
      [
        caseSummary('case-c', ['steady']),
        caseSummary('case-b', ['steady']),
        caseSummary('case-a', ['steady']),
        duplicateV2,
        expert,
        draft,
      ],
      [],
      [],
      [],
      [completedAttempt('case-a', 'not-a-date')],
      now,
    );

    const items = [plan.focusCase, ...plan.nextCases];
    expect(items.map((item) => item?.caseSummary.id)).toEqual([
      'case-a',
      'case-b',
      'case-c',
    ]);
    expect(items[1]?.caseSummary.version).toBe(2);
    expect(items.every((item) => item?.completedToday === false)).toBe(true);
    expect(plan.completedCount).toBe(0);
  });

  it('returns a safe empty plan when no eligible case exists', () => {
    const plan = buildDailyTrainingPlan([], [], [], [], [], now);

    expect(plan).toEqual({
      focusCase: undefined,
      nextCases: [],
      completedCount: 0,
      plannedCount: 0,
      estimatedMinutes: 0,
    });
  });
});

describe('mastery status boundaries', () => {
  it.each([
    [39, 'Weak'],
    [40, 'Learning'],
    [59, 'Learning'],
    [60, 'Competent'],
    [79, 'Competent'],
    [80, 'Proficient'],
  ] as const)('maps %s to %s', (score, status) => {
    expect(masteryStatus(score, 1)).toBe(status);
  });

  it('keeps a real zero score distinct from not started', () => {
    expect(masteryStatus(0, 1)).toBe('Weak');
    expect(masteryStatus(undefined, 0)).toBe('Not started');
  });

  it('ranks the five recommendation layers deterministically', () => {
    const cases = [
      caseSummary('critical-cross-case', ['critical-skill']),
      caseSummary('weak', ['weak-skill']),
      caseSummary('newly-competent', ['competent-skill']),
      caseSummary('stale-old', ['steady-skill']),
      caseSummary('stale-new', ['steady-skill']),
      caseSummary('fallback-a', ['unseen']),
      caseSummary('fallback-b', ['unseen']),
    ];
    const criticalMistake = {
      caseId: 'different-source-case',
      critical: true,
      skillIds: ['critical-skill'],
    } as MistakeRecord;

    const recommendations = recommendCases(
      cases,
      [
        progress('stale-old', '2026-01-01T00:00:00.000Z'),
        progress('stale-new', '2026-06-01T00:00:00.000Z'),
      ],
      [
        mastery('weak-skill', 39, 5),
        mastery('competent-skill', 60, 2),
        mastery('steady-skill', 75, 8),
      ],
      [criticalMistake],
    );

    expect(recommendations.map(({ caseSummary: item }) => item.id)).toEqual([
      'critical-cross-case',
      'weak',
      'newly-competent',
      'stale-old',
      'stale-new',
      'fallback-a',
      'fallback-b',
    ]);
    expect(recommendations.map(({ priority }) => priority)).toEqual([
      0, 1, 2, 3, 3, 4, 4,
    ]);
    expect(recommendations.every(({ reason }) => reason.length > 0)).toBe(true);
    expect(recommendations.map(({ rankTuple }) => rankTuple)).toEqual([
      [0, '', 'critical-cross-case'],
      [1, '', 'weak'],
      [2, '', 'newly-competent'],
      [3, '2026-01-01T00:00:00.000Z', 'stale-old'],
      [3, '2026-06-01T00:00:00.000Z', 'stale-new'],
      [4, '', 'fallback-a'],
      [4, '', 'fallback-b'],
    ]);
  });

  it('does not classify score 40 as weak or score 60 with many samples as newly competent', () => {
    const recommendations = recommendCases(
      [
        caseSummary('learning', ['learning']),
        caseSummary('established', ['established']),
      ],
      [],
      [mastery('learning', 40, 1), mastery('established', 60, 3)],
      [],
    );

    expect(recommendations.map(({ priority }) => priority)).toEqual([4, 4]);
  });

  it('keeps progress-only critical history at the highest priority', () => {
    const riskProgress = progress(
      'progress-only-critical',
      '2026-07-01T00:00:00.000Z',
    );
    riskProgress.hasCriticalError = true;

    const [recommendation] = recommendCases(
      [caseSummary('progress-only-critical', ['risk-awareness'])],
      [riskProgress],
      [],
      [],
    );

    expect(recommendation?.priority).toBe(0);
    expect(recommendation?.reason).toMatch(/revisit/i);
  });

  it('uses the revisit reason when the original critical case also shares the skill', () => {
    const [recommendation] = recommendCases(
      [caseSummary('critical-origin', ['risk-awareness'])],
      [],
      [],
      [
        {
          caseId: 'critical-origin',
          critical: true,
          skillIds: ['risk-awareness'],
        } as MistakeRecord,
      ],
    );

    expect(recommendation?.priority).toBe(0);
    expect(recommendation?.reason).toMatch(/revisit/i);
    expect(recommendation?.reason).not.toMatch(/another scenario/i);
  });

  it('anchors a local-calendar streak on today or yesterday', () => {
    const now = new Date(2026, 6, 13, 12);
    const localIso = (daysAgo: number) => {
      const value = new Date(2026, 6, 13 - daysAgo, 9);
      return value.toISOString();
    };

    expect(calculateTrainingStreak([localIso(1), localIso(2)], now)).toBe(2);
    expect(calculateTrainingStreak([localIso(2)], now)).toBe(0);
    expect(
      calculateTrainingStreak([localIso(0), localIso(1), localIso(2)], now),
    ).toBe(3);
  });
});
