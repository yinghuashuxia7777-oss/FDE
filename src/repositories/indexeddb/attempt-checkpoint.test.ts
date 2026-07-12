import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import type {
  CompletedAttemptRecord,
  InProgressAttemptRecord,
} from '../contracts';
import { openFdeArenaDatabase } from '../../storage/database';
import { IndexedDbAttemptRepository } from './attempt-repository';

const COMPLETED: CompletedAttemptRecord = {
  id: 'attempt-completed',
  userId: 'local-user',
  caseId: 'case-training',
  caseVersion: 1,
  status: 'completed',
  startedAt: '2026-07-13T08:00:00.000Z',
  updatedAt: '2026-07-13T09:00:00.000Z',
  completedAt: '2026-07-13T09:00:00.000Z',
  currentNodeId: null,
  score: 100,
  verdict: 'excellent',
  criticalErrorIds: [],
  visitedNodeIds: ['node-1'],
  roundHistory: [],
  consequences: [],
};

const STALE_CHECKPOINT: InProgressAttemptRecord = {
  id: COMPLETED.id,
  userId: COMPLETED.userId,
  caseId: COMPLETED.caseId,
  caseVersion: COMPLETED.caseVersion,
  status: 'in-progress',
  startedAt: COMPLETED.startedAt,
  updatedAt: '2026-07-13T08:30:00.000Z',
  currentNodeId: 'node-1',
  criticalErrorIds: [],
  visitedNodeIds: ['node-1'],
  roundHistory: [],
  consequences: [],
};

const RESOLVED_ROUND: InProgressAttemptRecord['roundHistory'][number] = {
  nodeId: 'node-1',
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
  submittedAt: '2026-07-13T08:30:00.000Z',
  revealed: false,
};

it('does not let a stale in-progress checkpoint overwrite a completed attempt', async () => {
  const name = 'fde-arena-attempt-checkpoint-test';
  const database = await openFdeArenaDatabase({ name });
  const repository = new IndexedDbAttemptRepository(database);
  try {
    await repository.save(COMPLETED);
    await repository.save(STALE_CHECKPOINT);

    expect(await repository.get(COMPLETED.id)).toEqual(COMPLETED);
  } finally {
    database.close();
    await deleteDB(name);
  }
});

it('rejects a checkpoint whose history or path rolls an in-progress attempt back', async () => {
  const name = 'fde-arena-attempt-history-rollback-test';
  const database = await openFdeArenaDatabase({ name });
  const repository = new IndexedDbAttemptRepository(database);
  const newer: InProgressAttemptRecord = {
    ...STALE_CHECKPOINT,
    id: 'attempt-newer',
    updatedAt: '2026-07-13T08:40:00.000Z',
    currentNodeId: 'node-2',
    visitedNodeIds: ['node-1', 'node-2'],
    roundHistory: [RESOLVED_ROUND],
  };
  const rollback: InProgressAttemptRecord = {
    ...STALE_CHECKPOINT,
    id: newer.id,
  };
  try {
    await repository.save(newer);

    await expect(repository.save(rollback)).rejects.toThrow(
      /checkpoint|history|stale|rollback/i,
    );
    expect(await repository.get(newer.id)).toEqual(newer);
  } finally {
    database.close();
    await deleteDB(name);
  }
});

it('rejects a stale checkpoint that collides with a completed attempt identity', async () => {
  const name = 'fde-arena-attempt-identity-collision-test';
  const database = await openFdeArenaDatabase({ name });
  const repository = new IndexedDbAttemptRepository(database);
  try {
    await repository.save(COMPLETED);

    await expect(
      repository.save({
        ...STALE_CHECKPOINT,
        caseId: 'case-other',
      }),
    ).rejects.toThrow(/identity|user|case|version/i);
    expect(await repository.get(COMPLETED.id)).toEqual(COMPLETED);
  } finally {
    database.close();
    await deleteDB(name);
  }
});
