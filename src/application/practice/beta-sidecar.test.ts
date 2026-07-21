import {
  BETA_STORAGE_KEYS,
  feedbackStore,
  practiceCompletionStore,
  projectEvidenceStore,
  serializeFeedbackExport,
} from './beta-sidecar';

describe('Beta local sidecars', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips independent practice, project, and feedback records', () => {
    practiceCompletionStore.write([
      {
        id: 'p1',
        practiceId: 'practice.one',
        leafSkillId: 'leaf.one',
        completedAt: '2026-07-18T00:00:00.000Z',
        evaluationResult: { outcome: 'passed', score: 90 },
        evidenceOutput: { artifactType: 'decision', response: 'evidence' },
        provenance: 'local-practice',
      },
    ]);
    projectEvidenceStore.write([
      {
        projectId: 'project.one',
        completedMilestones: ['architecture'],
        updatedAt: '2026-07-18T00:00:00.000Z',
      },
    ]);
    feedbackStore.write([
      {
        id: 'f1',
        category: 'content-issue',
        message: 'Fix this',
        contextPath: '/cases',
        createdAt: '2026-07-18T00:00:00.000Z',
      },
    ]);
    expect(practiceCompletionStore.read()).toHaveLength(1);
    expect(projectEvidenceStore.read()[0]?.completedMilestones).toEqual([
      'architecture',
    ]);
    expect(feedbackStore.read()[0]?.message).toBe('Fix this');
  });

  it('fails closed for malformed or schema-drifted local data', () => {
    localStorage.setItem(BETA_STORAGE_KEYS.practice, '{bad');
    localStorage.setItem(
      BETA_STORAGE_KEYS.project,
      JSON.stringify([{ projectId: 'x', completedMilestones: ['unknown'] }]),
    );
    expect(practiceCompletionStore.read()).toEqual([]);
    expect(projectEvidenceStore.read()).toEqual([]);
  });

  it('serializes feedback into a deterministic versioned export', () => {
    const records = [
      {
        id: 'f1',
        category: 'content-issue' as const,
        message: 'Fix this',
        contextPath: '/cases',
        createdAt: '2026-07-18T00:00:00.000Z',
      },
    ];

    expect(
      JSON.parse(serializeFeedbackExport(records, '2026-07-21T08:00:00.000Z')),
    ).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-07-21T08:00:00.000Z',
      records,
    });
  });
});
