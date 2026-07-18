import type { SkillDefinition } from '../../content/contracts';
import type {
  CompletedAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import type { TrustedAttempt } from './analysis';
import {
  buildCapabilityEvidenceRecords,
  buildCompletedChallengeProfiles,
  buildSkillEvidenceProfiles,
  calculateEvidenceReadiness,
  compareCompletedAttemptsNewestFirst,
  evidenceConfidence,
  evidenceToneForVerdict,
  rankSampledMastery,
} from './capability-evidence';

function mastery(
  skillId: string,
  score: number,
  sampleCount: number,
): SkillMasteryRecord {
  return {
    userId: 'local-user',
    skillId,
    score,
    sampleCount,
    updatedAt: '2026-07-16T08:00:00.000Z',
  };
}

function skill(id: string, label = id): SkillDefinition {
  return {
    schemaVersion: 1,
    id,
    domainId: 'domain-one',
    label,
    description: `${label} description`,
    status: 'active',
  };
}

function completedAttempt(
  id: string,
  caseId: string,
  completedAt: string,
  score = 80,
  caseVersion = 1,
): CompletedAttemptRecord {
  return {
    id,
    userId: 'local-user',
    caseId,
    caseVersion,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-16T07:00:00.000Z',
    updatedAt: completedAt,
    completedAt,
    currentNodeId: null,
    score,
    verdict: score >= 80 ? 'excellent' : score >= 60 ? 'pass' : 'fail',
    criticalErrorIds: [],
    visitedNodeIds: ['node-1'],
    roundHistory: [],
  };
}

function trustedAttempt({
  attemptId,
  caseId,
  completedAt,
  score,
  skills,
  title,
  version = 1,
}: {
  attemptId: string;
  caseId: string;
  completedAt: string;
  score: number;
  skills: string[];
  title: string;
  version?: number;
}): TrustedAttempt {
  const caseContent = createMinimalValidCase();
  caseContent.id = caseId;
  caseContent.slug = caseId;
  caseContent.title = title;
  caseContent.skills = skills;
  caseContent.metadata.version = version;
  return {
    attempt: completedAttempt(attemptId, caseId, completedAt, score, version),
    caseContent,
  };
}

function criticalMistake(skillId: string): MistakeRecord {
  return {
    id: `mistake-${skillId}`,
    userId: 'local-user',
    attemptId: 'attempt-critical',
    caseId: 'case-critical',
    caseVersion: 1,
    nodeId: 'node-critical',
    submission: { type: 'choice', selectedOptionIds: ['option-b'] },
    correctSubmission: { type: 'choice', selectedOptionIds: ['option-a'] },
    errorTypes: ['unsafe-action'],
    evidenceIds: [],
    skillIds: [skillId],
    critical: true,
    createdAt: '2026-07-16T08:00:00.000Z',
    redoScores: [],
  };
}

describe('capability evidence analysis', () => {
  it('uses the Dashboard sample-weighted readiness formula for active skills', () => {
    const result = calculateEvidenceReadiness(new Set(['skill-a', 'skill-b']), [
      mastery('skill-a', 80, 3),
      mastery('skill-b', 20, 1),
      mastery('inactive-skill', 100, 10),
      mastery('zero-sample', 100, 0),
    ]);

    expect(result).toBe(65);
    expect(
      calculateEvidenceReadiness(new Set(['skill-a']), []),
    ).toBeUndefined();
  });

  it('ranks sampled active mastery deterministically and exposes evidence tiers', () => {
    expect(
      rankSampledMastery(new Set(['skill-a', 'skill-b']), [
        mastery('skill-b', 40, 1),
        mastery('skill-a', 40, 2),
        mastery('inactive', 10, 4),
      ]).map(({ skillId }) => skillId),
    ).toEqual(['skill-a', 'skill-b']);
    expect([0, 1, 2, 4].map(evidenceConfidence)).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);
  });

  it('shares newest-first ordering and verdict tone without UI copy', () => {
    const older = completedAttempt(
      'attempt-z',
      'case-one',
      '2026-07-15T08:00:00.000Z',
    );
    const newestA = completedAttempt(
      'attempt-a',
      'case-one',
      '2026-07-16T08:00:00.000Z',
    );
    const newestB = completedAttempt(
      'attempt-b',
      'case-one',
      '2026-07-16T08:00:00.000Z',
    );
    expect(
      [older, newestB, newestA]
        .sort(compareCompletedAttemptsNewestFirst)
        .map(({ id }) => id),
    ).toEqual(['attempt-b', 'attempt-a', 'attempt-z']);
    expect(
      (['excellent', 'pass', 'marginal', 'fail', 'critical-risk'] as const).map(
        evidenceToneForVerdict,
      ),
    ).toEqual(['positive', 'positive', 'warning', 'negative', 'negative']);
  });

  it('builds real skill evidence, gives critical history growth priority, and keeps stable ID fallbacks', () => {
    const trusted = [
      trustedAttempt({
        attemptId: 'attempt-older',
        caseId: 'case-older',
        completedAt: '2026-07-15T08:00:00.000Z',
        score: 70,
        skills: ['skill-strong'],
        title: 'Older architecture case',
      }),
      trustedAttempt({
        attemptId: 'attempt-latest',
        caseId: 'case-latest',
        completedAt: '2026-07-16T08:00:00.000Z',
        score: 92,
        skills: ['skill-strong', 'historical-skill'],
        title: 'Exact historical case',
      }),
    ];

    const profiles = buildSkillEvidenceProfiles(
      [skill('skill-strong', 'Agent Engineering')],
      [mastery('skill-strong', 72, 3)],
      [criticalMistake('skill-strong')],
      trusted,
    );

    expect(
      profiles.find(({ skillId }) => skillId === 'skill-strong'),
    ).toMatchObject({
      label: 'Agent Engineering',
      score: 72,
      sampleCount: 3,
      status: 'Competent',
      criticalMistakeCount: 1,
      isStrength: false,
      isGrowthArea: true,
      risk: 'critical',
      latestEvidence: {
        attemptId: 'attempt-latest',
        title: 'Exact historical case',
      },
    });
    expect(
      profiles.find(({ skillId }) => skillId === 'historical-skill'),
    ).toMatchObject({
      label: 'historical-skill',
      sampleCount: 0,
      status: 'Not started',
      latestEvidence: { title: 'Exact historical case' },
    });
  });

  it('builds a verified timeline and deduplicates completed challenges by stable case ID', () => {
    const trusted = [
      trustedAttempt({
        attemptId: 'attempt-old',
        caseId: 'case-one',
        completedAt: '2026-07-14T08:00:00.000Z',
        score: 92,
        skills: ['skill-a'],
        title: 'Case one v1',
      }),
      trustedAttempt({
        attemptId: 'attempt-new-version',
        caseId: 'case-one',
        completedAt: '2026-07-16T08:00:00.000Z',
        score: 70,
        skills: ['skill-a', 'skill-b'],
        title: 'Case one v2',
        version: 2,
      }),
      trustedAttempt({
        attemptId: 'attempt-two',
        caseId: 'case-two',
        completedAt: '2026-07-15T08:00:00.000Z',
        score: 85,
        skills: ['skill-b'],
        title: 'Case two',
      }),
    ];

    expect(
      buildCapabilityEvidenceRecords(trusted).map(({ attemptId }) => attemptId),
    ).toEqual(['attempt-new-version', 'attempt-two', 'attempt-old']);
    expect(buildCompletedChallengeProfiles(trusted)).toEqual([
      expect.objectContaining({
        caseId: 'case-one',
        attemptId: 'attempt-old',
        score: 92,
        title: 'Case one v1',
      }),
      expect.objectContaining({
        caseId: 'case-two',
        attemptId: 'attempt-two',
        score: 85,
        title: 'Case two',
      }),
    ]);
  });

  it('keeps the newest attempt when equal scores compete for one stable case ID', () => {
    const trusted = [
      trustedAttempt({
        attemptId: 'attempt-equal-old',
        caseId: 'case-one',
        completedAt: '2026-07-14T08:00:00.000Z',
        score: 92,
        skills: ['skill-a'],
        title: 'Case one v1',
      }),
      trustedAttempt({
        attemptId: 'attempt-equal-new',
        caseId: 'case-one',
        completedAt: '2026-07-16T08:00:00.000Z',
        score: 92,
        skills: ['skill-a'],
        title: 'Case one v2',
        version: 2,
      }),
    ];

    expect(buildCompletedChallengeProfiles(trusted)).toEqual([
      expect.objectContaining({
        caseId: 'case-one',
        attemptId: 'attempt-equal-new',
        title: 'Case one v2',
      }),
    ]);
  });
});
