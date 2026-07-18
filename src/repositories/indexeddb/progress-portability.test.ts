import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import type { IDBPDatabase } from 'idb';
import type { FdeArenaDatabase } from '../../storage/database';
import { openFdeArenaDatabase } from '../../storage/database';
import type { LocalDataBundle } from '../contracts';
import { createIndexedDbRepositories } from './index';
import { IndexedDbProgressRepository } from './progress-repository';

let database: IDBPDatabase<FdeArenaDatabase> | undefined;
let databaseName = '';

afterEach(async () => {
  database?.close();
  if (databaseName !== '') await deleteDB(databaseName);
});

function validBundle(): LocalDataBundle {
  return {
    userId: 'local-user',
    attempts: [],
    progress: [],
    mastery: [],
    mistakes: [],
    settings: {
      userId: 'local-user',
      theme: 'dark',
      updatedAt: '2026-07-13T00:00:00.000Z',
    },
  };
}

function completedBundle(): LocalDataBundle {
  const attempt = {
    id: 'attempt-complete',
    userId: 'local-user' as const,
    caseId: 'case-one',
    caseVersion: 1,
    schemaVersion: 1 as const,
    status: 'completed' as const,
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 90,
    verdict: 'excellent' as const,
    criticalErrorIds: [],
    visitedNodeIds: ['node-one'],
    roundHistory: [
      {
        nodeId: 'node-one',
        attemptNumber: 1 as const,
        submission: {
          type: 'choice' as const,
          selectedOptionIds: ['option-correct'],
        },
        evaluation: {
          isCorrect: true,
          scoreRatio: 1,
          errorTypes: [],
          criticalErrorIds: [],
          consequences: [],
          branchKey: 'correct',
        },
        submittedAt: '2026-07-13T00:05:00.000Z',
        revealed: false,
      },
    ],
    consequences: [],
  };
  return {
    userId: 'local-user',
    attempts: [attempt],
    progress: [
      {
        userId: 'local-user',
        caseId: 'case-one',
        caseVersion: 1,
        latestAttemptId: attempt.id,
        attemptCount: 1,
        completedCount: 1,
        highestScore: 90,
        latestScore: 90,
        latestVerdict: 'excellent',
        hasCriticalError: false,
        updatedAt: attempt.completedAt,
      },
    ],
    mastery: [],
    mistakes: [],
    settings: null,
  };
}

function completedOrderingMistakeBundle(): LocalDataBundle {
  const submittedAt = [
    '2026-07-13T00:03:00.000Z',
    '2026-07-13T00:06:00.000Z',
    '2026-07-13T00:09:00.000Z',
  ];
  const submission = {
    type: 'ordering' as const,
    orderedOptionIds: ['repair', 'inspect', 'verify'],
  };
  const correctSubmission = {
    type: 'ordering' as const,
    orderedOptionIds: ['inspect', 'repair', 'verify'],
  };
  const attempt = {
    id: 'attempt-ordering-wrong',
    userId: 'local-user' as const,
    caseId: 'case-ordering',
    caseVersion: 1,
    schemaVersion: 1 as const,
    status: 'completed' as const,
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 0,
    verdict: 'fail' as const,
    criticalErrorIds: [],
    visitedNodeIds: ['node-ordering'],
    roundHistory: submittedAt.map((timestamp, index) => ({
      nodeId: 'node-ordering',
      attemptNumber: (index + 1) as 1 | 2 | 3,
      submission: structuredClone(submission),
      evaluation: {
        isCorrect: false,
        scoreRatio: 0,
        errorTypes: [],
        criticalErrorIds: [],
        consequences: [],
        branchKey: 'incorrect',
      },
      submittedAt: timestamp,
      revealed: index === 2,
    })),
    consequences: [],
  };
  return {
    userId: 'local-user',
    attempts: [attempt],
    progress: [
      {
        userId: 'local-user',
        caseId: attempt.caseId,
        caseVersion: attempt.caseVersion,
        latestAttemptId: attempt.id,
        attemptCount: 1,
        completedCount: 1,
        highestScore: 0,
        latestScore: 0,
        latestVerdict: 'fail',
        hasCriticalError: false,
        updatedAt: attempt.completedAt,
      },
    ],
    mastery: [],
    mistakes: submittedAt.map((createdAt, index) => ({
      id: `mistake:${attempt.id}:0:${String(index + 1)}`,
      userId: 'local-user',
      attemptId: attempt.id,
      caseId: attempt.caseId,
      caseVersion: attempt.caseVersion,
      nodeId: 'node-ordering',
      submission: structuredClone(submission),
      correctSubmission: structuredClone(correctSubmission),
      errorTypes: ['incorrect-submission'],
      evidenceIds: ['ordering-evidence'],
      skillIds: ['diagnosis'],
      critical: false,
      createdAt,
      redoScores: [],
    })),
    settings: null,
  };
}

describe('progress portability', () => {
  it('imports legacy attempts without schemaVersion as v1 and exports the normalized history', async () => {
    databaseName = 'fde-arena-portability-legacy-attempt-schema';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const legacyBundle = structuredClone(completedBundle()) as unknown as {
      attempts: Record<string, unknown>[];
    } & Omit<LocalDataBundle, 'attempts'>;
    delete legacyBundle.attempts[0]!.schemaVersion;

    await repositories.progress.replaceUserData(
      legacyBundle as unknown as LocalDataBundle,
    );

    const exported = await repositories.progress.exportUserData('local-user');
    expect(exported.attempts[0]).toMatchObject({
      id: 'attempt-complete',
      caseId: 'case-one',
      caseVersion: 1,
      schemaVersion: 1,
      completedAt: '2026-07-13T00:10:00.000Z',
      score: 90,
    });
  });

  it('round-trips mistakes whose evaluator uses the training fallback error type', async () => {
    databaseName = 'fde-arena-portability-fallback-error';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const bundle = completedOrderingMistakeBundle();

    await repositories.progress.replaceUserData(bundle);

    await expect(
      repositories.progress.exportUserData('local-user'),
    ).resolves.toEqual(bundle);
  });

  it('exports a transactionally consistent user-owned bundle without case content', async () => {
    databaseName = 'fde-arena-portability-export';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    await repositories.settings.save(validBundle().settings!);

    const exported = await repositories.progress.exportUserData('local-user');

    expect(exported).toEqual(validBundle());
    expect(JSON.stringify(exported)).not.toContain('caseVersions');
    expect(JSON.stringify(exported)).not.toContain('canonicalContent');
  });

  it('replaces all user-owned stores together and preserves installed cases', async () => {
    databaseName = 'fde-arena-portability-replace';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const installedCase = {
      caseId: 'installed-case',
      version: 1,
      schemaVersion: 1,
      contentHash:
        'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      status: 'draft' as const,
      level: 'beginner' as const,
      canonicalContent: '{}',
      content: {} as never,
    };
    await database.put('caseVersions', installedCase);
    await repositories.settings.save({
      userId: 'local-user',
      theme: 'light',
      updatedAt: '2026-07-12T00:00:00.000Z',
    });

    await repositories.progress.replaceUserData(validBundle());

    expect(await repositories.settings.get('local-user')).toEqual(
      validBundle().settings,
    );
    expect(await database.get('caseVersions', ['installed-case', 1])).toEqual(
      installedCase,
    );
  });

  it('rejects invalid references before mutation', async () => {
    databaseName = 'fde-arena-portability-invalid';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const original = validBundle().settings!;
    await repositories.settings.save(original);
    const invalid = {
      ...validBundle(),
      progress: [
        {
          userId: 'local-user',
          caseId: 'missing-attempt-case',
          caseVersion: 1,
          latestAttemptId: 'missing-attempt',
          attemptCount: 1,
          completedCount: 1,
          highestScore: 90,
          latestScore: 90,
          latestVerdict: 'excellent',
          hasCriticalError: false,
          updatedAt: '2026-07-13T00:00:00.000Z',
        },
      ],
    } as LocalDataBundle;

    await expect(
      repositories.progress.replaceUserData(invalid),
    ).rejects.toThrow(/attempt|reference/i);
    expect(await repositories.settings.get('local-user')).toEqual(original);
  });

  it('exports stable non-empty ordering and explicit null settings', async () => {
    databaseName = 'fde-arena-portability-order';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    await repositories.skills.saveMany([
      {
        userId: 'local-user',
        skillId: 'z-skill',
        score: 80,
        sampleCount: 1,
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
      {
        userId: 'local-user',
        skillId: 'a-skill',
        score: 60,
        sampleCount: 1,
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    ]);

    const exported = await repositories.progress.exportUserData('local-user');

    expect(exported.settings).toBeNull();
    expect(exported.mastery.map(({ skillId }) => skillId)).toEqual([
      'a-skill',
      'z-skill',
    ]);
  });

  it('deletes settings only after an explicit null replacement', async () => {
    databaseName = 'fde-arena-portability-null-settings';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    await repositories.settings.save(validBundle().settings!);

    await repositories.progress.replaceUserData({
      ...validBundle(),
      settings: null,
    });

    expect(await repositories.settings.get('local-user')).toBeUndefined();
    expect(
      (await repositories.progress.exportUserData('local-user')).settings,
    ).toBeNull();
  });

  it('rolls back old settings and mastery after a real mid-write transaction fault', async () => {
    databaseName = 'fde-arena-portability-rollback';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const oldSettings = validBundle().settings!;
    await repositories.settings.save(oldSettings);
    await repositories.skills.save({
      userId: 'local-user',
      skillId: 'old-skill',
      score: 70,
      sampleCount: 1,
      updatedAt: '2026-07-12T00:00:00.000Z',
    });
    const faulting = new IndexedDbProgressRepository(database, {
      afterReplaceDelete: () => {
        throw new Error('injected mid-write failure');
      },
    });

    await expect(
      faulting.replaceUserData({
        ...validBundle(),
        mastery: [
          {
            userId: 'local-user',
            skillId: 'new-skill',
            score: 90,
            sampleCount: 1,
            updatedAt: '2026-07-13T00:00:00.000Z',
          },
        ],
        settings: null,
      }),
    ).rejects.toThrow('injected mid-write failure');
    expect(await repositories.settings.get('local-user')).toEqual(oldSettings);
    expect(
      (await repositories.skills.list('local-user')).map(
        ({ skillId }) => skillId,
      ),
    ).toEqual(['old-skill']);
  });

  it('normalizes before intrinsic checks and preserves old data on reversed chronology', async () => {
    databaseName = 'fde-arena-portability-chronology';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const original = validBundle().settings!;
    await repositories.settings.save(original);
    const invalid: LocalDataBundle = {
      ...validBundle(),
      attempts: [
        {
          id: 'attempt-reversed',
          userId: 'local-user',
          caseId: 'case-one',
          caseVersion: 1,
          schemaVersion: 1,
          status: 'in-progress',
          startedAt: '2026-07-13T02:00:00+08:00',
          updatedAt: '2026-07-13T01:00:00+08:00',
          currentNodeId: 'node-one',
          criticalErrorIds: [],
          visitedNodeIds: ['node-one'],
          roundHistory: [],
        },
      ],
    };

    await expect(
      repositories.progress.replaceUserData(invalid),
    ).rejects.toThrow(/updatedAt|chronological|timestamp/i);
    expect(await repositories.settings.get('local-user')).toEqual(original);
  });

  it('rejects impossible verdicts and mistakes not tied to a specific wrong round', async () => {
    databaseName = 'fde-arena-portability-semantic';
    database = await openFdeArenaDatabase({ name: databaseName });
    const repositories = createIndexedDbRepositories(database);
    const impossibleVerdict = completedBundle();
    const completed = impossibleVerdict.attempts[0]!;
    if (completed.status !== 'completed') throw new Error('fixture');
    completed.verdict = 'fail';
    impossibleVerdict.progress[0]!.latestVerdict = 'fail';
    await expect(
      repositories.progress.replaceUserData(impossibleVerdict),
    ).rejects.toThrow(/verdict/i);

    const fakeMistake = completedBundle();
    fakeMistake.mistakes = [
      {
        id: 'mistake-fake',
        userId: 'local-user',
        attemptId: 'attempt-complete',
        caseId: 'case-one',
        caseVersion: 1,
        nodeId: 'node-one',
        submission: { type: 'choice', selectedOptionIds: ['option-wrong'] },
        correctSubmission: {
          type: 'choice',
          selectedOptionIds: ['option-correct'],
        },
        errorTypes: ['unsupported-action'],
        evidenceIds: [],
        skillIds: ['evidence-assessment'],
        critical: false,
        createdAt: '2026-07-13T00:05:00.000Z',
        redoScores: [],
      },
    ];
    await expect(
      repositories.progress.replaceUserData(fakeMistake),
    ).rejects.toThrow(/wrong round/i);
  });
});
