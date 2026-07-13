import type { FoundationKnowledge } from '../../domain/foundation/types';
import type {
  AttemptRecord,
  CompletedAttemptRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';

import {
  buildFoundationTrackProgress,
  foundationStatus,
  prerequisitesForCase,
  selectNextFoundation,
} from './analysis';

function item(
  id: string,
  order: number,
  overrides: Partial<FoundationKnowledge> = {},
): FoundationKnowledge {
  return {
    schemaVersion: 1,
    id,
    type: 'foundation',
    title: id,
    domain: 'computer-basics',
    track: 'computer-basics',
    skills: [`${id}.skill`],
    level: 'beginner',
    order,
    estimatedMinutes: 6,
    content: {
      simpleExplanation: 'simple',
      analogy: 'analogy',
      technicalExplanation: 'technical',
      example: 'example',
      commonMistakes: 'mistakes',
    },
    relatedCases: [`${id}-case`],
    ...overrides,
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
    updatedAt: '2026-07-14T00:00:00.000Z',
  };
}

function completedAttempt(
  caseId: string,
  verdict: CompletedAttemptRecord['verdict'] = 'pass',
  suffix: string = verdict,
): CompletedAttemptRecord {
  return {
    id: `${caseId}-${suffix}`,
    userId: 'local-user',
    caseId,
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:05:00.000Z',
    completedAt: '2026-07-14T00:05:00.000Z',
    currentNodeId: null,
    score: verdict === 'excellent' ? 90 : verdict === 'pass' ? 75 : 30,
    verdict,
    criticalErrorIds: [],
    visitedNodeIds: [],
    roundHistory: [],
  };
}

describe('Foundation progress analysis', () => {
  it('distinguishes not-started from learning through Skill samples or Case attempts', () => {
    const target = item('computer-basics.logs', 1);

    expect(foundationStatus(target, [], [])).toBe('not-started');
    expect(foundationStatus(target, [mastery(target.skills[0]!, 35)], [])).toBe(
      'learning',
    );
    expect(
      foundationStatus(
        target,
        [],
        [completedAttempt(target.relatedCases[0]!, 'fail')],
      ),
    ).toBe('learning');
  });

  it('requires every linked Skill at 60+ with samples and historical pass evidence', () => {
    const target = item('network-api.http', 2, {
      skills: ['systems.networking', 'api.integration'],
      relatedCases: ['dns-private-endpoint-001'],
    });
    const pass = completedAttempt('dns-private-endpoint-001');

    expect(
      foundationStatus(
        target,
        [mastery('systems.networking', 80), mastery('api.integration', 60)],
        [pass],
      ),
    ).toBe('mastered');
    expect(
      foundationStatus(target, [mastery('systems.networking', 80)], [pass]),
    ).toBe('learning');
    expect(
      foundationStatus(
        target,
        [mastery('systems.networking', 80), mastery('api.integration', 90, 0)],
        [pass],
      ),
    ).toBe('learning');
    expect(
      foundationStatus(
        target,
        [mastery('systems.networking', 80), mastery('api.integration', 60)],
        [completedAttempt('dns-private-endpoint-001', 'marginal')],
      ),
    ).toBe('learning');
  });

  it('preserves historical pass evidence after a failed retry but still uses current mastery', () => {
    const target = item('ai-basics.rag', 3, {
      skills: ['rag.search'],
      relatedCases: ['rag-stale-policy-cache-001'],
    });
    const history: AttemptRecord[] = [
      completedAttempt('rag-stale-policy-cache-001', 'pass', 'first'),
      completedAttempt('rag-stale-policy-cache-001', 'fail', 'retry'),
    ];

    expect(foundationStatus(target, [mastery('rag.search', 70)], history)).toBe(
      'mastered',
    );
    expect(foundationStatus(target, [mastery('rag.search', 59)], history)).toBe(
      'learning',
    );
  });

  it('aggregates exactly ten authored items in each track', () => {
    const tracks = ['computer-basics', 'network-api', 'ai-basics'] as const;
    const items = tracks.flatMap((track, trackIndex) =>
      Array.from({ length: 10 }, (_, itemIndex) =>
        item(
          `${track}.item-${itemIndex + 1}`,
          trackIndex * 10 + itemIndex + 1,
          {
            track,
          },
        ),
      ),
    );

    expect(buildFoundationTrackProgress(items, [], [])).toEqual(
      tracks.map((track) => ({
        track,
        total: 10,
        mastered: 0,
        learning: 0,
        notStarted: 10,
        percent: 0,
      })),
    );
  });

  it('selects learning before not-started, then authored order and stable ID', () => {
    const untouched = item('computer-basics.a', 1);
    const laterLearning = item('computer-basics.z', 2);
    const firstLearning = item('computer-basics.b', 2);
    const records = [
      mastery(laterLearning.skills[0]!, 30),
      mastery(firstLearning.skills[0]!, 30),
    ];

    expect(
      selectNextFoundation(
        [untouched, laterLearning, firstLearning],
        records,
        [],
      )?.id,
    ).toBe('computer-basics.b');
  });

  it('sorts case prerequisites learning, not-started, mastered and omits unrelated items', () => {
    const caseId = 'shared-case';
    const learning = item('foundation.learning', 3, {
      skills: ['skill.learning'],
      relatedCases: [caseId],
    });
    const untouched = item('foundation.untouched', 1, {
      skills: ['skill.untouched'],
      relatedCases: [caseId],
    });
    const mastered = item('foundation.mastered', 2, {
      skills: ['skill.mastered'],
      relatedCases: [caseId, 'mastery-evidence'],
    });
    const unrelated = item('foundation.unrelated', 0 + 4);
    const records = [
      mastery('skill.learning', 20),
      mastery('skill.mastered', 75),
    ];

    expect(
      prerequisitesForCase(
        [mastered, unrelated, untouched, learning],
        caseId,
        records,
        [completedAttempt('mastery-evidence', 'pass')],
      ).map(({ item: candidate, status }) => [candidate.id, status]),
    ).toEqual([
      ['foundation.learning', 'learning'],
      ['foundation.untouched', 'not-started'],
      ['foundation.mastered', 'mastered'],
    ]);
  });
});
