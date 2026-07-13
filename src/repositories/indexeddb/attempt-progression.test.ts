import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import type {
  AttemptRecord,
  AttemptRoundRecord,
  CaseProgressRecord,
  CompletedAttemptRecord,
  CompletionMerge,
  InProgressAttemptRecord,
} from '../contracts';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import type { FdeCase } from '../../domain/cases/types';
import { openFdeArenaDatabase } from '../../storage/database';
import { createIndexedDbRepositories } from './index';

const USER_ID = 'local-user';
const CASE_ID = 'case-progression';
const STARTED_AT = '2026-07-13T00:00:00.000Z';

function createProgressionCase(branching: boolean): FdeCase {
  const result = createMinimalValidCase();
  result.id = CASE_ID;
  const first = result.nodes[0]!;
  if (first.type !== 'single-choice') {
    throw new Error(
      'Expected the minimal fixture to start with a choice node.',
    );
  }
  first.options = [
    { id: 'good', label: 'Good', explanation: 'Correct.' },
    {
      id: 'danger',
      label: 'Danger',
      explanation: 'Risky.',
      errorType: 'risk-error',
    },
  ];
  first.answer = { correctOptionId: 'good' };
  first.scoring.criticalErrorOptionIds = ['danger'];
  first.consequences = [
    {
      optionId: 'danger',
      riskDelta: 1,
      message: 'Risk increased.',
    },
  ];
  first.branches = [
    { key: 'correct', nextNodeId: branching ? 'node-2' : null },
    { key: 'critical', nextNodeId: null },
  ];
  const second = structuredClone(first);
  second.id = 'node-2';
  second.branches = [
    { key: 'correct', nextNodeId: null },
    { key: 'critical', nextNodeId: null },
  ];
  result.nodes = branching ? [first, second] : [first];
  return result;
}

const CASE_CONTENT = createProgressionCase(false);
const BRANCH_CASE_CONTENT = createProgressionCase(true);
const SELF_LOOP_CASE_CONTENT = createProgressionCase(false);
SELF_LOOP_CASE_CONTENT.nodes[0]!.branches = [
  { key: 'correct', nextNodeId: 'node-1' },
  { key: 'critical', nextNodeId: null },
];
type RepositoryBundle = ReturnType<typeof createIndexedDbRepositories>;

function saveAttempt(
  repositories: RepositoryBundle,
  attempt: AttemptRecord,
  caseContent = CASE_CONTENT,
): Promise<void> {
  return repositories.attempts.save(attempt, caseContent);
}

function commitCompletion(
  repositories: RepositoryBundle,
  attempt: CompletedAttemptRecord,
  merge: CompletionMerge,
  caseContent = CASE_CONTENT,
): Promise<CompletedAttemptRecord> {
  return repositories.progress.commitCompletion(attempt, caseContent, merge);
}

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
    schemaVersion: overrides.schemaVersion ?? 1,
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

    await expect(saveAttempt(repositories, completed)).rejects.toThrow(
      /completion|completed|commit/i,
    );
    await saveAttempt(repositories, active);
    await expect(saveAttempt(repositories, completed)).rejects.toThrow(
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
    await saveAttempt(repositories, checkpoint(), BRANCH_CASE_CONTENT);
    await saveAttempt(repositories, existing, BRANCH_CASE_CONTENT);

    await expect(
      saveAttempt(
        repositories,
        {
          ...existing,
          criticalErrorIds: ['danger', 'polluted'],
        },
        BRANCH_CASE_CONTENT,
      ),
    ).rejects.toThrow(/critical|history|effect|checkpoint/i);
    await expect(
      saveAttempt(
        repositories,
        {
          ...existing,
          consequences: [
            ...existing.consequences!,
            { riskDelta: 99, message: 'Polluted.' },
          ],
        },
        BRANCH_CASE_CONTENT,
      ),
    ).rejects.toThrow(/consequence|history|effect|checkpoint/i);
  });
});

it('rejects a current node that is not the last visited node', async () => {
  await withRepositories(async (repositories) => {
    await expect(
      saveAttempt(repositories, checkpoint({ currentNodeId: 'node-other' })),
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
    await saveAttempt(repositories, checkpoint(), BRANCH_CASE_CONTENT);
    await saveAttempt(repositories, existing, BRANCH_CASE_CONTENT);

    await expect(
      saveAttempt(
        repositories,
        {
          ...existing,
          updatedAt: '2026-07-13T00:02:00.000Z',
          currentNodeId: 'node-2',
          visitedNodeIds: ['node-1', 'node-2'],
        },
        BRANCH_CASE_CONTENT,
      ),
    ).rejects.toThrow(/resolved|branch|path|checkpoint/i);
  });
});

it('rejects a resolved path advancing to a made-up branch target', async () => {
  await withRepositories(async (repositories) => {
    const round = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const resolved = checkpoint({
      updatedAt: round.submittedAt,
      roundHistory: [round],
    });
    await saveAttempt(repositories, checkpoint(), BRANCH_CASE_CONTENT);
    await saveAttempt(repositories, resolved, BRANCH_CASE_CONTENT);

    await expect(
      saveAttempt(
        repositories,
        {
          ...resolved,
          updatedAt: '2026-07-13T00:02:00.000Z',
          currentNodeId: 'made-up-node',
          visitedNodeIds: ['node-1', 'made-up-node'],
        },
        BRANCH_CASE_CONTENT,
      ),
    ).rejects.toThrow(/branch|case|node|path/i);
  });
});

it('rejects a stored evaluation that does not match its submission', async () => {
  await withRepositories(async (repositories) => {
    const round = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const corrupted = checkpoint({
      updatedAt: round.submittedAt,
      roundHistory: [
        {
          ...round,
          evaluation: { ...round.evaluation, branchKey: 'critical' },
        },
      ],
    });
    await saveAttempt(repositories, checkpoint());

    await expect(saveAttempt(repositories, corrupted)).rejects.toThrow(
      /evaluation|submission/i,
    );
  });
});

it('uses any critical round in a visit to resolve the actual branch', async () => {
  await withRepositories(async (repositories) => {
    const first = wrongRound();
    const final = {
      ...correctRound('node-1', '2026-07-13T00:02:00.000Z'),
      attemptNumber: 2,
    } satisfies AttemptRoundRecord;
    const wrongCheckpoint = checkpoint({
      updatedAt: first.submittedAt,
      roundHistory: [first],
      criticalErrorIds: ['danger'],
      consequences: [{ riskDelta: 1, message: 'Risk increased.' }],
    });
    const resolved = {
      ...wrongCheckpoint,
      updatedAt: final.submittedAt,
      roundHistory: [first, final],
    } satisfies InProgressAttemptRecord;
    await saveAttempt(repositories, checkpoint(), BRANCH_CASE_CONTENT);
    await saveAttempt(repositories, wrongCheckpoint, BRANCH_CASE_CONTENT);
    await saveAttempt(repositories, resolved, BRANCH_CASE_CONTENT);

    await expect(
      saveAttempt(
        repositories,
        {
          ...resolved,
          updatedAt: '2026-07-13T00:03:00.000Z',
          currentNodeId: 'node-2',
          visitedNodeIds: ['node-1', 'node-2'],
        },
        BRANCH_CASE_CONTENT,
      ),
    ).rejects.toThrow(/critical|terminal|branch|path/i);
  });
});

it('supports self-loop paths by visit ordinal', async () => {
  await withRepositories(async (repositories) => {
    const first = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const resolved = checkpoint({
      updatedAt: first.submittedAt,
      roundHistory: [first],
    });
    const looped = {
      ...resolved,
      updatedAt: '2026-07-13T00:02:00.000Z',
      visitedNodeIds: ['node-1', 'node-1'],
    } satisfies InProgressAttemptRecord;
    const second = correctRound('node-1', '2026-07-13T00:03:00.000Z');
    const secondResolved = {
      ...looped,
      updatedAt: second.submittedAt,
      roundHistory: [first, second],
    } satisfies InProgressAttemptRecord;

    await saveAttempt(repositories, checkpoint(), SELF_LOOP_CASE_CONTENT);
    await saveAttempt(repositories, resolved, SELF_LOOP_CASE_CONTENT);
    await saveAttempt(repositories, looped, SELF_LOOP_CASE_CONTENT);
    await expect(
      saveAttempt(repositories, secondResolved, SELF_LOOP_CASE_CONTENT),
    ).resolves.toBeUndefined();
  });
});

it('rejects a stale completion and preserves the newer checkpoint', async () => {
  await withRepositories(async (repositories) => {
    const firstRound = correctRound('node-1', '2026-07-13T00:01:00.000Z');
    const firstResolved = checkpoint({
      updatedAt: firstRound.submittedAt,
      roundHistory: [firstRound],
    });
    const newer = {
      ...firstResolved,
      updatedAt: '2026-07-13T00:02:00.000Z',
    } satisfies InProgressAttemptRecord;
    await saveAttempt(repositories, checkpoint());
    await saveAttempt(repositories, firstResolved);
    await saveAttempt(repositories, newer);
    const stale = completion(firstResolved);

    await expect(
      commitCompletion(repositories, stale, () => mergeFor(stale)),
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
    await saveAttempt(repositories, checkpoint());
    await saveAttempt(repositories, resolved);
    await commitCompletion(repositories, completed, () => mergeFor(completed));

    await expect(
      commitCompletion(
        repositories,
        {
          ...completed,
          completedAt: '2026-07-13T00:02:00.000Z',
          updatedAt: '2026-07-13T00:02:00.000Z',
        },
        () => mergeFor(completed),
      ),
    ).resolves.toEqual(completed);
    await expect(
      commitCompletion(
        repositories,
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
    await saveAttempt(repositories, checkpoint());
    await saveAttempt(repositories, resolved);

    await expect(
      commitCompletion(repositories, staleTime, () => mergeFor(staleTime)),
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
      await saveAttempt(repositories, checkpoint());
      await saveAttempt(repositories, resolved);

      await expect(
        commitCompletion(repositories, invalid, () => mergeFor(invalid)),
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
    await expect(saveAttempt(repositories, invalid)).rejects.toThrow(
      /startedAt|updatedAt|chronolog|round/i,
    );
    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
  });
});
