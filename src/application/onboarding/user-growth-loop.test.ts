import {
  LEARNER_PREFERENCE_STORAGE_KEY,
  learnerPreferenceStore,
} from './learner-preferences';
import {
  buildDailyGrowthMission,
  growthJourneyStages,
  starterJourneyDays,
} from './growth-loop';

describe('user growth loop projections', () => {
  beforeEach(() => localStorage.clear());

  it('persists only a validated goal and experience level', () => {
    learnerPreferenceStore.write({
      goal: 'become-ai-engineer',
      experienceLevel: 'beginner',
    });
    expect(learnerPreferenceStore.read()).toMatchObject({
      goal: 'become-ai-engineer',
      experienceLevel: 'beginner',
      schemaVersion: 1,
    });
    localStorage.setItem(
      LEARNER_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ goal: 'admin', experienceLevel: 'expert' }),
    );
    expect(learnerPreferenceStore.read()).toBeUndefined();
  });

  it('defines five capability stages and a seven-day starter path', () => {
    expect(growthJourneyStages).toHaveLength(5);
    expect(growthJourneyStages.map(({ id }) => id)).toEqual([
      'engineering-foundation',
      'ai-application',
      'agent-engineering',
      'production-ai',
      'fde-delivery',
    ]);
    expect(starterJourneyDays).toHaveLength(7);
    expect(starterJourneyDays[6]?.projectId).toBe(
      'project.ai-customer-solution',
    );
  });

  it('selects the first incomplete Learn → Practice → Challenge → Evidence bundle', () => {
    const first = buildDailyGrowthMission({
      completedCaseIds: [],
      completedPracticeIds: [],
      completedProjectIds: [],
    });
    expect(first).toMatchObject({
      foundationId: 'api.timeout-retry',
      practiceId: 'practice.software.distributed-reliability',
      caseId: 'api-timeout-budget-cascade-001',
      evidenceSkillId: 'software.distributed-reliability',
    });
    const second = buildDailyGrowthMission({
      completedCaseIds: ['api-timeout-budget-cascade-001'],
      completedPracticeIds: ['practice.software.distributed-reliability'],
      completedProjectIds: [],
    });
    expect(second?.day).toBe(2);
  });
});
