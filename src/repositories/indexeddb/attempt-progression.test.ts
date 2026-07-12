import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import type {
  AttemptRoundRecord,
  CaseProgressRecord,
  CompletedAttemptRecord,
  InProgressAttemptRecord,
} from '../contracts';
import { openFdeArenaDatabase } from '../../storage/database';
import { createIndexedDbRepositories } from './index';

const USER_ID = 'local-user';
const CASE_ID = 'case-progression';
const STARTED_AT = '2026-07-13T00:00:00.000Z';

function correctRound(nodeId: string, submittedAt: string): AttemptRoundRecord {
  return {
    nodeId,
    attemptNumber: 1,
    submission: { type: 'choice', selectedOptionIds: ['good'] },
    evaluation: {
      isCorrect: true,
      scoreRatio: 1,
      errorTypes: [],
      criticalErrorIds: [],
      consequences: [],
      branchKey: 'correct',
    },
    submittedAt,
    revealed: false,
  };
}

function wrongRound(nodeId = 'node-1'): AttemptRoundRecord {
  return {
    nodeId,
    attemptNumber: 1,
    submission: { type: 'choice', selectedOptionIds: ['danger'] },
    evaluation: {
      isCorrect: false,
      scoreRatio: 0,
      errorTypes: ['risk-error'],
      criticalErrorIds: ['danger'],
      consequences: [{ riskDelta: 1, message: 'Risk increased.' }],
      branchKey: 'critical',
    },
    submittedAt: '2026-07-13T00:01:00.000Z',
    revealed: false,
  };
}

function checkpoint(
  overrides: Partial<InProgressAttemptRecord> = {},
): InProgressAttemptRecord {
  return {
    id: 'attempt-progression',
    userId: USER_ID,
    caseId: CASE_ID,
    caseVersion: 1,
    status: 'in-progress',
    startedAt: STARTED_AT,
    updatedAt: '2026-07-13T00:00:00.000Z',
    currentNodeId: 'node-1',
    criticalErrorIds: [],
    visitedNodeIds: ['node-1'],
    roundHistory: [],
    consequences: [],
    ...overrides,
  };
}

function completion(
  source: InProgressAttemptRecord,
  overrides: Partial<CompletedAttemptRecord> = {},
): CompletedAttemptRecord {
  return {
    ...source,
    status: 'completed',
    currentNodeId: null,
    completedAt: source.updatedAt,
    score: 100,
    verdict: 'excellent',
    ...overrides,
  };
}

function progressFor(attempt: CompletedAttemptRecord): CaseProgressRecord {
  return {
    userId: attempt.userId,
    caseId: attempt.caseId,
    caseVersion: attempt.caseVersion,
    latestAttemptId: attempt.id,
    attemptCount: 1,
    completedCount: 1,
    highestScore: attempt.score,
    latestScore: attempt.score,
    latestVerdict: attempt.verdict,
    hasCriticalError: attempt.criticalErrorIds.length > 0,
    updatedAt: attempt.completedAt,
  };
}

function mergeFor(attempt: CompletedAttemptRecord) {
  return {
    progress: progressFor(attempt),
    mastery: [],
    mistakes: [],
  };
}

let nextDatabaseId = 0;

async function withRepositories(
  test: (
    repositories: ReturnType<typeof createIndexedDbRepositories>,
  ) => Promise<void>,
): Promise<void> {
  nextDatabaseId += 1;
  const name = `fde-arena-attempt-progression-${nextDatabaseId}`;
  const database = await openFdeArenaDatabase({ name });
  try {
    await test(createIndexedDbRepositories(database));
  } finally {
    database.close();
    await deleteDB(name);
  }
}

it('rejects direct creation or overwrite of a completed attempt', async () => {
  await withRepositories(async (repositories) => {
    const active = checkpoint();
    const completed = completion(active);

    await expect(repositories.attempts.save(completed)).rejects.toThrow(
      /completion|completed|commit/i,
    );
    await repositories.attempts.save(active);
    await expect(repositories.attempts.save(completed)).rejects.toThrow(
      /completion|completed|commit/i,
    );
    expect(await repositories.attempts.get(active.id)).toEqual(active);
  });
});

it('rejects equal-history pollution of critical errors or consequences', async () => {
  await withRepositories(async (repositories) => {
    const round = wrongRound();
    const existing = checkpoint({
      updatedAt: round.submittedAt,
      roundHistory: [round],
      criticalErrorIds: ['danger'],
      consequences: [{ riskDelta: 1, message: 'Risk increased.' }],
    });
    await repositories.attempts.save(checkpoint());
    await repositories.attempts.save(existing);

    await expect(
      repositories.attempts.save({
        ...existing,
        criticalErrorIds: ['danger', 'polluted'],
      }),
    ).rejects.toThrow(/critical|history|effect|checkpoint/i);
    await expect(
      repositories.attempts.save({
        ...existing,
        consequences: [
          ...existing.consequences!,
          { riskDelta: 99, message: 'Polluted.' },
        ],
      }),
    ).rejects.toThrow(/consequence|history|effect|checkpoint/i);
  });
});

it('rejects a current node that is not the last visited node', async () => {
  await withRepositories(async (repositories) => {
    await expect(
      repositories.attempts.save(checkpoint({ currentNodeId: 'node-other' })),
    ).rejects.toThrow(/current|visited|path/i);
  });
});

it('rejects path advancement without a resolved final round', async () => {
  await withRepositories(async (repositories) => {
    const round = wrongRound();
    const existing = checkpoint({
      updatedAt: round.submittedAt,
      roundHistory: [round],
      criticalErrorIds: ['danger'],
      consequences: [{ riskDelta: 1, message: 'Risk increased.' }],
    });
    await repositories.attempts.save(checkpoint());
    await repositories.attempts.save(existing);

    await expect(
      repositories.attempts.save({
        ...existing,
        updatedAt: '2026-07-13T00:02:00.000Z',
        currentNodeId: 'node-2',
        visitedNodeIds: ['node-1', 'node-2'],
      }),
    ).rejects.toThrow(/resolved|branch|path|checkpoint/i);
  });
});

it('rejects a stale completion and preserves the newer checkpoint', async () => {
  await withRepositories(async (repositories) => {
    const firstRound = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const secondRound = correctRound('node-2', '2026-07-13T00:02:00.000Z');
    const firstResolved = checkpoint({
      updatedAt: firstRound.submittedAt,
      roundHistory: [firstRound],
    });
    const advanced = {
      ...firstResolved,
      currentNodeId: 'node-2',
      visitedNodeIds: ['node-1', 'node-2'],
    } satisfies InProgressAttemptRecord;
    const newer = {
      ...advanced,
      updatedAt: secondRound.submittedAt,
      roundHistory: [firstRound, secondRound],
    } satisfies InProgressAttemptRecord;
    await repositories.attempts.save(checkpoint());
    await repositories.attempts.save(firstResolved);
    await repositories.attempts.save(advanced);
    await repositories.attempts.save(newer);
    const stale = completion(firstResolved);

    await expect(
      repositories.progress.commitCompletion(stale, () => mergeFor(stale)),
    ).rejects.toThrow(/checkpoint|stale|history|completion/i);
    expect(await repositories.attempts.get(newer.id)).toEqual(newer);
  });
});

it('treats only the same completed core payload as an idempotent retry', async () => {
  await withRepositories(async (repositories) => {
    const round = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const resolved = checkpoint({
      updatedAt: round.submittedAt,
      roundHistory: [round],
    });
    const completed = completion(resolved);
    await repositories.attempts.save(checkpoint());
    await repositories.attempts.save(resolved);
    await repositories.progress.commitCompletion(completed, () =>
      mergeFor(completed),
    );

    await expect(
      repositories.progress.commitCompletion(
        {
          ...completed,
          completedAt: '2026-07-13T00:02:00.000Z',
          updatedAt: '2026-07-13T00:02:00.000Z',
        },
        () => mergeFor(completed),
      ),
    ).resolves.toEqual(completed);
    await expect(
      repositories.progress.commitCompletion(
        { ...completed, score: 10, verdict: 'fail' },
        () => mergeFor(completed),
      ),
    ).rejects.toThrow(/conflict|payload|completion/i);
  });
});

it('rejects completion timestamps that move behind the latest checkpoint update', async () => {
  await withRepositories(async (repositories) => {
    const round = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const resolved = checkpoint({
      updatedAt: '2026-07-13T00:10:00.000Z',
      roundHistory: [round],
    });
    const staleTime = completion(resolved, {
      completedAt: '2026-07-13T00:02:00.000Z',
      updatedAt: '2026-07-13T00:02:00.000Z',
    });
    await repositories.attempts.save(checkpoint());
    await repositories.attempts.save(resolved);

    await expect(
      repositories.progress.commitCompletion(staleTime, () =>
        mergeFor(staleTime),
      ),
    ).rejects.toThrow(/checkpoint|completedAt|updatedAt|time/i);
    expect(await repositories.attempts.get(resolved.id)).toEqual(resolved);
    expect(await repositories.attempts.list({ status: 'completed' })).toEqual(
      [],
    );
  });
});

it.each([
  [
    'completedAt before the last round',
    {
      completedAt: '2026-07-13T00:00:30.000Z',
      updatedAt: '2026-07-13T00:02:00.000Z',
    },
  ],
  [
    'updatedAt before completedAt',
    {
      completedAt: '2026-07-13T00:02:00.000Z',
      updatedAt: '2026-07-13T00:01:30.000Z',
    },
  ],
] as const)(
  'rejects %s without any completion writes',
  async (_label, times) => {
    await withRepositories(async (repositories) => {
      const round = correctRound('node-1', '2026-07-13T00:01:00.000Z');
      const resolved = checkpoint({
        updatedAt: round.submittedAt,
        roundHistory: [round],
      });
      const invalid = completion(resolved, times);
      await repositories.attempts.save(checkpoint());
      await repositories.attempts.save(resolved);

      await expect(
        repositories.progress.commitCompletion(invalid, () =>
          mergeFor(invalid),
        ),
      ).rejects.toThrow(/completedAt|updatedAt|chronolog|time/i);
      expect(await repositories.attempts.get(resolved.id)).toEqual(resolved);
      expect(await repositories.progress.list(USER_ID)).toEqual([]);
    });
  },
);

it.each([
  [
    'a round before startedAt',
    checkpoint({
      startedAt: '2026-07-13T00:02:00.000Z',
      updatedAt: '2026-07-13T00:03:00.000Z',
      roundHistory: [wrongRound()],
      criticalErrorIds: ['danger'],
      consequences: [{ riskDelta: 1, message: 'Risk increased.' }],
    }),
  ],
  [
    'updatedAt before the latest round',
    checkpoint({
      updatedAt: '2026-07-13T00:00:30.000Z',
      roundHistory: [wrongRound()],
      criticalErrorIds: ['danger'],
      consequences: [{ riskDelta: 1, message: 'Risk increased.' }],
    }),
  ],
] as const)('rejects %s for an in-progress record', async (_label, invalid) => {
  await withRepositories(async (repositories) => {
    await expect(repositories.attempts.save(invalid)).rejects.toThrow(
      /startedAt|updatedAt|chronolog|round/i,
    );
    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
  });
});
