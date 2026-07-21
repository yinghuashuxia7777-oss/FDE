import type { SkillDefinition } from '../../content/contracts';
import { createTranslator } from '../../i18n';
import type {
  AttemptRecord,
  CompletedAttemptRecord,
  InProgressAttemptRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import {
  capabilitySkillIds,
  hasRealCapabilityEvidence,
  provideCapabilityMapData,
} from './capability-map-data';

const t = createTranslator('en-US');

function skill(id: string): SkillDefinition {
  return {
    schemaVersion: 1,
    id,
    domainId: 'ai-engineering',
    label: `Source ${id}`,
    description: `${id} capability`,
    status: 'active',
  };
}

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
    updatedAt: '2026-07-17T08:00:00.000Z',
  };
}

function inProgressAttempt(): InProgressAttemptRecord {
  return {
    id: 'attempt-in-progress',
    userId: 'local-user',
    caseId: 'case-current',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'in-progress',
    startedAt: '2026-07-17T08:00:00.000Z',
    updatedAt: '2026-07-17T08:05:00.000Z',
    currentNodeId: 'node-one',
    criticalErrorIds: [],
    visitedNodeIds: ['node-one'],
    roundHistory: [],
  };
}

function completedHistoricalAttempt(): CompletedAttemptRecord {
  return {
    id: 'attempt-historical',
    userId: 'local-user',
    caseId: 'deprecated-case',
    caseVersion: 3,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-16T08:30:00.000Z',
    completedAt: '2026-07-16T08:30:00.000Z',
    currentNodeId: null,
    score: 82,
    verdict: 'pass',
    criticalErrorIds: [],
    visitedNodeIds: ['node-one'],
    roundHistory: [],
  };
}

function provide(
  masteryRecords: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
  realReadiness: number | undefined,
) {
  return provideCapabilityMapData({
    attempts,
    definitions: capabilitySkillIds.map(skill),
    mastery: masteryRecords,
    realReadiness,
    t,
  });
}

describe('Capability Map data provider', () => {
  it('provides the explicit seven-node Demo Profile when real evidence is absent', () => {
    const result = provide([], [], undefined);

    expect(result.mode).toBe('demo');
    expect(result.mapReadiness).toBe(72);
    expect(result.profile).toEqual({
      goal: 'Production AI Engineer',
      name: 'Alex Chen',
      completedCases: 20,
      projects: 1,
    });
    expect(result.signals.map(({ skillId }) => skillId)).toEqual(
      capabilitySkillIds,
    );
    expect(result.signals).toHaveLength(7);
    expect(result.signals[0]).toMatchObject({
      skillId: 'llm.applications',
      score: 85,
      level: 4,
      mastery: 'proficient',
    });
    expect(result.signals[1]).toMatchObject({
      skillId: 'agents.evaluation',
      score: 75,
      level: 3,
      mastery: 'competent',
    });
  });

  it('keeps Demo mode for zero-sample mastery and an in-progress attempt', () => {
    const attempts = [inProgressAttempt()];
    const records = [mastery('llm.applications', 0, 0)];

    expect(hasRealCapabilityEvidence(records, attempts)).toBe(false);
    expect(provide(records, attempts, undefined).mode).toBe('demo');
  });

  it('gives real evidence priority for a zero score with a positive sample', () => {
    const records = [mastery('llm.applications', 0, 1)];
    const result = provide(records, [], 0);

    expect(hasRealCapabilityEvidence(records, [])).toBe(true);
    expect(result.mode).toBe('real');
    expect(result.mapReadiness).toBe(0);
    expect(result.profile).toBeUndefined();
    expect(
      result.signals.find(({ skillId }) => skillId === 'llm.applications'),
    ).toMatchObject({
      score: 0,
      level: 1,
      mastery: 'learning',
    });
  });

  it('gives a hidden historical completed attempt priority without inventing readiness', () => {
    const attempts = [completedHistoricalAttempt()];
    const result = provide([], attempts, undefined);

    expect(hasRealCapabilityEvidence([], attempts)).toBe(true);
    expect(result.mode).toBe('real');
    expect(result.mapReadiness).toBeUndefined();
    expect(result.profile).toBeUndefined();
    expect(result.signals).toHaveLength(7);
    expect(result.signals.every(({ score }) => score === undefined)).toBe(true);
  });

  it('shows mapped MVP Leaf evidence on the existing capability node', () => {
    const result = provideCapabilityMapData({
      attempts: [completedHistoricalAttempt()],
      definitions: capabilitySkillIds.map(skill),
      mastery: [],
      realReadiness: undefined,
      mvpLeafEvidence: [
        {
          skillId: 'rag.retrieval',
          label: 'RAG Retrieval',
          parentSkillId: 'rag.search',
          score: 84,
          primaryEvidenceCount: 1,
          supportingEvidenceCount: 0,
          sourceAttemptIds: ['attempt-historical'],
        },
      ],
      t,
    });

    expect(result.mode).toBe('real');
    expect(
      result.signals.find(({ skillId }) => skillId === 'rag.search'),
    ).toMatchObject({
      score: 84,
      mastery: 'proficient',
    });
  });

  it('localizes the four map states and evidence language in English and Chinese', () => {
    const english = provideCapabilityMapData({
      attempts: [],
      definitions: capabilitySkillIds.map(skill),
      mastery: [],
      realReadiness: undefined,
      t: createTranslator('en-US'),
    });
    const chinese = provideCapabilityMapData({
      attempts: [],
      definitions: capabilitySkillIds.map(skill),
      mastery: [],
      realReadiness: undefined,
      t: createTranslator('zh-CN'),
    });

    expect(english.signals[0]).toMatchObject({
      statusLabel: 'Proficient',
      evidence: '12 engineering evidence records',
    });
    expect(english.signals[1]).toMatchObject({
      statusLabel: 'Competent',
      evidence: '8 trusted evidence records',
    });
    expect(english.signals[6]).toMatchObject({
      statusLabel: 'Learning',
      evidence: '3 training samples',
    });
    expect(chinese.signals[0]).toMatchObject({
      statusLabel: '熟练',
      evidence: '12 个工程证据',
    });
    expect(chinese.signals[1]).toMatchObject({
      statusLabel: '胜任',
      evidence: '8 个可信证据',
    });
    expect(chinese.signals[6]).toMatchObject({
      statusLabel: '学习中',
      evidence: '3 个训练样本',
    });

    const realEmpty = provideCapabilityMapData({
      attempts: [completedHistoricalAttempt()],
      definitions: capabilitySkillIds.map(skill),
      mastery: [],
      realReadiness: undefined,
      t: createTranslator('en-US'),
    });
    expect(realEmpty.signals[0]).toMatchObject({
      statusLabel: 'No evidence yet',
      evidence: 'Complete challenges to build evidence',
    });
  });
});
