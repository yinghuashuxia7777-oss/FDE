import type {
  CaseProgressRecord,
  CaseSummary,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import {
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
