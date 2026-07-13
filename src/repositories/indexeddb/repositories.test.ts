import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import type { FdeCase } from '../../domain/cases/types';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import type {
  AttemptRecord,
  CaseProgressRecord,
  CompletedAttemptRecord,
  CoverageRecord,
  InProgressAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
  UserSettings,
} from '../contracts';
import { createIndexedDbRepositories } from './index';
import {
  DATABASE_VERSION,
  openFdeArenaDatabase,
  type FdeArenaDatabase,
} from '../../storage/database';
import {
  bootstrapDatabase,
  CaseVersionConflictError,
} from '../../storage/seed';
import type { IDBPDatabase } from 'idb';

const USER_ID = 'local-user';
let nextDatabaseId = 0;
let database: IDBPDatabase<FdeArenaDatabase> | undefined;
let databaseName = '';

function createDatabaseName() {
  nextDatabaseId += 1;
  return `fde-arena-repository-test-${nextDatabaseId}`;
}

async function openTestDatabase() {
  databaseName = createDatabaseName();
  database = await openFdeArenaDatabase({ name: databaseName });
  return database;
}

function buildAttempt(
  overrides: Partial<CompletedAttemptRecord> = {},
): CompletedAttemptRecord {
  return {
    id: 'attempt-1',
    userId: USER_ID,
    caseId: 'case-minimal',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 88,
    verdict: 'excellent',
    criticalErrorIds: [],
    visitedNodeIds: ['node-1'],
    roundHistory: [
      {
        nodeId: 'node-1',
        attemptNumber: 1,
        submission: { type: 'choice', selectedOptionIds: ['option-a'] },
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
    ...overrides,
  };
}

type RepositoryBundle = ReturnType<typeof createIndexedDbRepositories>;

function createCaseForAttempt(
  attempt: Pick<AttemptRecord, 'caseId' | 'caseVersion'>,
): FdeCase {
  const fdeCase = createMinimalValidCase();
  fdeCase.id = attempt.caseId;
  fdeCase.slug = attempt.caseId;
  fdeCase.metadata.version = attempt.caseVersion;
  return fdeCase;
}

async function saveCompletionCheckpoint(
  repositories: RepositoryBundle,
  attempt: CompletedAttemptRecord,
  caseContent = createCaseForAttempt(attempt),
): Promise<InProgressAttemptRecord> {
  const firstNodeId = attempt.visitedNodeIds[0]!;
  const fresh: InProgressAttemptRecord = {
    id: attempt.id,
    userId: attempt.userId,
    caseId: attempt.caseId,
    caseVersion: attempt.caseVersion,
    schemaVersion: attempt.schemaVersion,
    status: 'in-progress',
    startedAt: attempt.startedAt,
    updatedAt: attempt.startedAt,
    currentNodeId: firstNodeId,
    criticalErrorIds: [],
    visitedNodeIds: [firstNodeId],
    roundHistory: [],
    consequences: [],
  };
  await repositories.attempts.save(fresh, caseContent);
  const checkpoint: InProgressAttemptRecord = {
    ...fresh,
    updatedAt: attempt.roundHistory.at(-1)?.submittedAt ?? attempt.startedAt,
    currentNodeId: attempt.visitedNodeIds.at(-1)!,
    criticalErrorIds: [...attempt.criticalErrorIds],
    visitedNodeIds: [...attempt.visitedNodeIds],
    roundHistory: structuredClone(attempt.roundHistory),
    consequences: structuredClone(attempt.consequences ?? []),
  };
  await repositories.attempts.save(checkpoint, caseContent);
  return checkpoint;
}

async function commitCompleted(
  repositories: RepositoryBundle,
  attempt: CompletedAttemptRecord,
): Promise<CompletedAttemptRecord> {
  const caseContent = createCaseForAttempt(attempt);
  await saveCompletionCheckpoint(repositories, attempt, caseContent);
  return repositories.progress.commitCompletion(attempt, caseContent, () => ({
    progress: buildProgress({
      userId: attempt.userId,
      caseId: attempt.caseId,
      caseVersion: attempt.caseVersion,
      latestAttemptId: attempt.id,
      highestScore: attempt.score,
      latestScore: attempt.score,
      latestVerdict: attempt.verdict,
      hasCriticalError: attempt.criticalErrorIds.length > 0,
      updatedAt: attempt.completedAt,
    }),
    mastery: [],
    mistakes: [],
  }));
}

function buildInProgressAttempt(
  overrides: Partial<InProgressAttemptRecord> = {},
): InProgressAttemptRecord {
  return {
    id: 'attempt-1',
    userId: USER_ID,
    caseId: 'case-minimal',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'in-progress',
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:05:00.000Z',
    currentNodeId: 'node-1',
    criticalErrorIds: [],
    visitedNodeIds: ['node-1'],
    roundHistory: [],
    ...overrides,
  };
}

function buildProgress(
  overrides: Partial<CaseProgressRecord> = {},
): CaseProgressRecord {
  return {
    userId: USER_ID,
    caseId: 'case-minimal',
    caseVersion: 1,
    latestAttemptId: 'attempt-1',
    attemptCount: 1,
    completedCount: 1,
    highestScore: 88,
    latestScore: 88,
    latestVerdict: 'excellent',
    hasCriticalError: false,
    updatedAt: '2026-07-13T00:10:00.000Z',
    ...overrides,
  };
}

function buildMastery(
  overrides: Partial<SkillMasteryRecord> = {},
): SkillMasteryRecord {
  return {
    userId: USER_ID,
    skillId: 'evidence-assessment',
    score: 82,
    sampleCount: 2,
    updatedAt: '2026-07-13T00:10:00.000Z',
    ...overrides,
  };
}

function buildMistake(overrides: Partial<MistakeRecord> = {}): MistakeRecord {
  return {
    id: 'mistake-1',
    userId: USER_ID,
    attemptId: 'attempt-1',
    caseId: 'case-minimal',
    caseVersion: 1,
    nodeId: 'node-1',
    submission: { type: 'choice', selectedOptionIds: ['option-b'] },
    correctSubmission: { type: 'choice', selectedOptionIds: ['option-a'] },
    errorTypes: ['evidence-insufficient'],
    evidenceIds: ['evidence-1'],
    skillIds: ['evidence-assessment'],
    critical: true,
    createdAt: '2026-07-13T00:05:00.000Z',
    redoScores: [],
    ...overrides,
  };
}

afterEach(async () => {
  database?.close();
  database = undefined;
  if (databaseName) {
    await deleteDB(databaseName);
  }
});

describe('IndexedDB schema version 2', () => {
  it('creates the required stores and query indexes', async () => {
    const db = await openTestDatabase();

    expect(db.version).toBe(DATABASE_VERSION);
    expect(Array.from(db.objectStoreNames)).toEqual([
      'appMeta',
      'attempts',
      'caseVersions',
      'contentPacks',
      'coverage',
      'mastery',
      'mistakes',
      'progress',
      'settings',
    ]);

    const transaction = db.transaction(
      ['caseVersions', 'attempts', 'mistakes'],
      'readonly',
    );
    expect(
      Array.from(transaction.objectStore('caseVersions').indexNames),
    ).toEqual(expect.arrayContaining(['by-case', 'by-status']));
    expect(Array.from(transaction.objectStore('attempts').indexNames)).toEqual(
      expect.arrayContaining([
        'by-user',
        'by-case',
        'by-status',
        'by-completed-at',
      ]),
    );
    expect(Array.from(transaction.objectStore('mistakes').indexNames)).toEqual(
      expect.arrayContaining([
        'by-user',
        'by-skill',
        'by-error',
        'by-critical',
      ]),
    );
    await transaction.done;
  });
});

describe('case versions and bootstrap', () => {
  it('seeds once, repeats idempotently, and keeps a new version beside history', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const versionOne = createMinimalValidCase();
    const versionTwo = createMinimalValidCase();
    versionTwo.metadata.version = 2;
    versionTwo.title = 'Minimal diagnostic case v2';

    await bootstrapDatabase(db, [versionOne]);
    await bootstrapDatabase(db, [versionOne]);
    await bootstrapDatabase(db, [versionTwo]);

    expect(await repositories.cases.getVersion(versionOne.id, 1)).toEqual(
      versionOne,
    );
    expect(await repositories.cases.getVersion(versionOne.id, 2)).toEqual(
      versionTwo,
    );
    expect(await repositories.cases.getVersion(versionOne.id)).toBeUndefined();
    expect(await repositories.cases.list()).toEqual([]);
    expect(await repositories.users.getLocal()).toEqual(
      expect.objectContaining({ id: USER_ID }),
    );
  });

  it('rejects changed content for the same immutable version and rolls back the batch', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const original = createMinimalValidCase();
    const conflicting = createMinimalValidCase();
    conflicting.title = 'Silently replaced title';
    const unrelated = createMinimalValidCase();
    unrelated.id = 'case-unrelated';
    unrelated.slug = 'case-unrelated';

    await repositories.cases.seed([original]);

    await expect(
      repositories.cases.seed([unrelated, conflicting]),
    ).rejects.toBeInstanceOf(CaseVersionConflictError);
    expect(await repositories.cases.getVersion(original.id, 1)).toEqual(
      original,
    );
    expect(
      await repositories.cases.getVersion(unrelated.id, 1),
    ).toBeUndefined();
  });

  it('lists only explicitly active matching case summaries', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const beginner = createMinimalValidCase();
    const advanced = createMinimalValidCase();
    advanced.id = 'case-advanced';
    advanced.slug = 'case-advanced';
    advanced.level = 'advanced';
    advanced.status = 'published';
    advanced.metadata = {
      ...advanced.metadata,
      version: 3,
      reviewedAt: '2026-07-13T01:00:00.000Z',
      reviewer: 'Reviewer',
    };

    await repositories.cases.seed([beginner, advanced]);
    await db.put('appMeta', {
      key: 'active-content-catalog',
      value: {
        packId: 'test-pack',
        contentVersion: '1.0.0',
        schemaVersion: 1,
        sourceKind: 'bundled',
        activeCases: [
          { caseId: beginner.id, version: beginner.metadata.version },
          { caseId: advanced.id, version: advanced.metadata.version },
        ],
        activeDomainIds: ['diagnostics'],
        activeSkillIds: ['evidence-assessment'],
        installedAt: '2026-07-13T01:00:00.000Z',
        checksum:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      },
      updatedAt: '2026-07-13T01:00:00.000Z',
    });

    expect(await repositories.cases.list({ level: 'advanced' })).toEqual([
      expect.objectContaining({ id: 'case-advanced', version: 3 }),
    ]);
    expect(await repositories.cases.list({ status: 'published' })).toHaveLength(
      1,
    );
    expect(
      await repositories.cases.list({ domain: 'diagnostics' }),
    ).toHaveLength(2);
  });
});

describe('repository contracts', () => {
  it('interprets legacy IndexedDB attempts without schemaVersion as v1 on get and list', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const legacyAttempt = buildInProgressAttempt({
      id: 'attempt-legacy-schema',
      caseId: 'case-legacy-schema',
      caseVersion: 4,
      startedAt: '2025-01-02T03:04:05.000Z',
      updatedAt: '2025-01-02T03:04:05.000Z',
    });
    const { schemaVersion: _legacySchemaVersion, ...rawLegacyAttempt } =
      legacyAttempt;
    void _legacySchemaVersion;

    await db.put('attempts', rawLegacyAttempt as AttemptRecord);

    await expect(repositories.attempts.get(legacyAttempt.id)).resolves.toEqual({
      ...legacyAttempt,
      schemaVersion: 1,
    });
    await expect(
      repositories.attempts.list({ caseId: legacyAttempt.caseId }),
    ).resolves.toEqual([
      {
        ...legacyAttempt,
        schemaVersion: 1,
      },
    ]);
  });

  it('creates, reads, lists, updates, and deletes persisted records', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const attempt = buildInProgressAttempt();
    const mastery = buildMastery();
    const mistake = buildMistake();
    const settings: UserSettings = {
      userId: USER_ID,
      theme: 'system',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    const coverage: CoverageRecord = {
      caseId: 'case-minimal',
      status: 'published',
      level: 'beginner',
      domains: ['diagnostics'],
      skills: ['evidence-assessment'],
      updatedAt: '2026-07-13T00:00:00.000Z',
    };

    await repositories.attempts.save(attempt, createCaseForAttempt(attempt));
    await repositories.skills.save(mastery);
    await repositories.mistakes.save(mistake);
    await repositories.settings.save(settings);
    await repositories.coverage.saveMany([coverage]);
    await repositories.users.ensureLocalUser();

    expect(await repositories.attempts.get(attempt.id)).toEqual(attempt);
    expect(await repositories.skills.get(USER_ID, mastery.skillId)).toEqual(
      mastery,
    );
    expect(await repositories.mistakes.get(mistake.id)).toEqual(mistake);
    expect(await repositories.settings.get(USER_ID)).toEqual(settings);
    expect(await repositories.coverage.get(coverage.caseId)).toEqual(coverage);
    expect((await repositories.coverage.list())[0]).toEqual(coverage);

    await repositories.attempts.delete(attempt.id);
    await repositories.mistakes.delete(mistake.id);
    expect(await repositories.attempts.get(attempt.id)).toBeUndefined();
    expect(await repositories.mistakes.get(mistake.id)).toBeUndefined();
  });

  it('rejects deleting a completed attempt without leaving dangling progress', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const completed = buildAttempt();
    await commitCompleted(repositories, completed);

    await expect(repositories.attempts.delete(completed.id)).rejects.toThrow(
      /completed|delete|clear/i,
    );
    expect(await repositories.attempts.get(completed.id)).toEqual(completed);
    expect(await repositories.progress.get(USER_ID, completed.caseId)).toEqual(
      expect.objectContaining({ latestAttemptId: completed.id }),
    );
  });

  it('rejects deleting abandoned attempts and treats missing IDs as a no-op', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const active = buildInProgressAttempt({ id: 'attempt-abandoned' });
    const caseContent = createCaseForAttempt(active);
    await repositories.attempts.save(active, caseContent);
    const abandoned = {
      ...active,
      status: 'abandoned',
    } satisfies AttemptRecord;
    await repositories.attempts.save(abandoned, caseContent);

    await expect(repositories.attempts.delete(abandoned.id)).rejects.toThrow(
      /terminal|delete|clear/i,
    );
    expect(await repositories.attempts.get(abandoned.id)).toEqual(abandoned);
    await expect(
      repositories.attempts.delete('attempt-missing'),
    ).resolves.toBeUndefined();
  });

  it('rejects deleting an in-progress attempt referenced by legacy progress', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const active = buildInProgressAttempt({ id: 'attempt-active-progress' });
    await repositories.attempts.save(active, createCaseForAttempt(active));
    const progress = buildProgress({ latestAttemptId: active.id });
    await db.put('progress', progress);

    await expect(repositories.attempts.delete(active.id)).rejects.toThrow(
      /progress|reference|delete|clear/i,
    );
    expect(await repositories.attempts.get(active.id)).toEqual(active);
    expect(await repositories.progress.get(USER_ID, progress.caseId)).toEqual(
      progress,
    );
  });

  it('uses case, status, completion, skill, error, and critical indexes', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    await commitCompleted(
      repositories,
      buildAttempt({
        id: 'attempt-complete',
        updatedAt: '2026-07-13T02:00:00.000Z',
        completedAt: '2026-07-13T02:00:00.000Z',
      }),
    );
    const activeAttempt = buildInProgressAttempt({
      id: 'attempt-active',
      caseId: 'case-other',
      startedAt: '2026-07-13T01:00:00.000Z',
      updatedAt: '2026-07-13T01:05:00.000Z',
    });
    await repositories.attempts.save(
      activeAttempt,
      createCaseForAttempt(activeAttempt),
    );
    await repositories.mistakes.save(buildMistake());
    await repositories.mistakes.save(
      buildMistake({
        id: 'mistake-2',
        errorTypes: ['priority-error'],
        skillIds: ['triage'],
        critical: false,
      }),
    );

    expect(
      await repositories.attempts.list({ caseId: 'case-minimal' }),
    ).toHaveLength(1);
    expect(await repositories.attempts.list({ status: 'in-progress' })).toEqual(
      [expect.objectContaining({ id: 'attempt-active' })],
    );
    expect(
      await repositories.attempts.list({
        completedAfter: '2026-07-13T01:00:00.000Z',
      }),
    ).toEqual([expect.objectContaining({ id: 'attempt-complete' })]);
    expect(
      await repositories.mistakes.list({ skillId: 'evidence-assessment' }),
    ).toHaveLength(1);
    expect(
      await repositories.mistakes.list({ errorType: 'priority-error' }),
    ).toHaveLength(1);
    expect(await repositories.mistakes.list({ critical: true })).toEqual([
      expect.objectContaining({ id: 'mistake-1' }),
    ]);
  });

  it('rejects contradictory attempt status records at the save boundary', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const missingCompletedResult = {
      ...buildAttempt(),
      verdict: undefined,
    } as unknown as AttemptRecord;
    const activeWithCompletedResult = {
      ...buildAttempt(),
      id: 'attempt-invalid-active',
      status: 'in-progress',
      currentNodeId: 'node-1',
    } as unknown as AttemptRecord;

    await expect(
      repositories.attempts.save(
        missingCompletedResult,
        createCaseForAttempt(missingCompletedResult),
      ),
    ).rejects.toThrow(/completed attempt/i);
    await expect(
      repositories.attempts.save(
        activeWithCompletedResult,
        createCaseForAttempt(activeWithCompletedResult),
      ),
    ).rejects.toThrow(/in-progress attempt/i);
    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
  });

  it('normalizes attempt timestamps before filtering and sorting by absolute time', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    await commitCompleted(
      repositories,
      buildAttempt({
        id: 'attempt-earlier',
        startedAt: '2026-07-13T01:00:00+02:00',
        updatedAt: '2026-07-13T04:00:00+02:00',
        completedAt: '2026-07-13T02:00:00+02:00',
        roundHistory: [
          {
            nodeId: 'node-1',
            attemptNumber: 1,
            submission: {
              type: 'choice',
              selectedOptionIds: ['option-a'],
            },
            evaluation: {
              isCorrect: true,
              scoreRatio: 1,
              errorTypes: [],
              criticalErrorIds: [],
              consequences: [],
              branchKey: 'correct',
            },
            submittedAt: '2026-07-13T01:30:00+02:00',
            revealed: false,
          },
        ],
      }),
    );
    await commitCompleted(
      repositories,
      buildAttempt({
        id: 'attempt-later',
        startedAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T02:30:00.000Z',
        completedAt: '2026-07-13T00:30:00.000Z',
      }),
    );

    expect(
      await repositories.attempts.list({
        completedAfter: '2026-07-13T01:00:00+01:00',
      }),
    ).toEqual([expect.objectContaining({ id: 'attempt-later' })]);
    expect(
      (await repositories.attempts.list()).map((attempt) => attempt.id),
    ).toEqual(['attempt-later', 'attempt-earlier']);
    expect(await repositories.attempts.get('attempt-earlier')).toEqual(
      expect.objectContaining({
        startedAt: '2026-07-12T23:00:00.000Z',
        updatedAt: '2026-07-13T02:00:00.000Z',
        completedAt: '2026-07-13T00:00:00.000Z',
        roundHistory: [
          expect.objectContaining({
            submittedAt: '2026-07-12T23:30:00.000Z',
          }),
        ],
      }),
    );
  });

  it('preserves and exactly orders arbitrary fractional seconds in storage queries', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    await commitCompleted(
      repositories,
      buildAttempt({
        id: 'attempt-fraction-later',
        updatedAt: '2026-07-13T00:05:00.0009Z',
        completedAt: '2026-07-13T00:05:00.0009Z',
      }),
    );
    await commitCompleted(
      repositories,
      buildAttempt({
        id: 'attempt-fraction-earlier',
        updatedAt: '2026-07-13T00:05:00.0001Z',
        completedAt: '2026-07-13T00:05:00.0001Z',
      }),
    );

    expect((await repositories.attempts.list()).map(({ id }) => id)).toEqual([
      'attempt-fraction-later',
      'attempt-fraction-earlier',
    ]);
    expect(
      await repositories.attempts.list({
        completedAfter: '2026-07-13T00:05:00.0001Z',
      }),
    ).toEqual([expect.objectContaining({ id: 'attempt-fraction-later' })]);
    expect(
      await repositories.attempts.get('attempt-fraction-later'),
    ).toMatchObject({
      completedAt: '2026-07-13T00:05:00.0009Z',
      updatedAt: '2026-07-13T00:05:00.0009Z',
    });
  });

  it('rejects invalid attempt and completion-filter timestamps', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const invalidAttempt = buildInProgressAttempt({
      updatedAt: 'not-a-timestamp',
    });

    await expect(
      repositories.attempts.save(
        invalidAttempt,
        createCaseForAttempt(invalidAttempt),
      ),
    ).rejects.toThrow(/updatedAt/i);
    await expect(
      repositories.attempts.list({ completedAfter: 'not-a-timestamp' }),
    ).rejects.toThrow(/completedAfter/i);
    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
  });

  it.each(['July 13, 2026', '07/13/2026', '2026-02-30T00:00:00Z'])(
    'rejects non-RFC3339 or overflowing timestamp %s',
    async (timestamp) => {
      const db = await openTestDatabase();
      const repositories = createIndexedDbRepositories(db);
      const invalidAttempt = buildInProgressAttempt({ startedAt: timestamp });

      await expect(
        repositories.attempts.save(
          invalidAttempt,
          createCaseForAttempt(invalidAttempt),
        ),
      ).rejects.toThrow(/startedAt/i);
      expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    },
  );

  it('rolls back every completion write when the atomic commit fails', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const completed = buildAttempt();
    const invalidMastery = {
      userId: USER_ID,
      score: 82,
      sampleCount: 1,
      updatedAt: '2026-07-13T00:10:00.000Z',
    } as SkillMasteryRecord;
    const caseContent = createCaseForAttempt(completed);
    const checkpoint = await saveCompletionCheckpoint(
      repositories,
      completed,
      caseContent,
    );

    await expect(
      repositories.progress.commitCompletion(completed, caseContent, () => ({
        progress: buildProgress(),
        mastery: [invalidMastery],
        mistakes: [buildMistake()],
      })),
    ).rejects.toThrow();

    expect(await repositories.attempts.get(checkpoint.id)).toEqual(checkpoint);
    expect(await repositories.progress.list(USER_ID)).toEqual([]);
    expect(await repositories.skills.list(USER_ID)).toEqual([]);
    expect(await repositories.mistakes.list({ userId: USER_ID })).toEqual([]);
  });

  it('returns the stored completion without merging or counting the same attempt twice', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const completed = buildAttempt();
    const caseContent = createCaseForAttempt(completed);
    let mergeCalls = 0;
    await saveCompletionCheckpoint(repositories, completed, caseContent);

    const merge = repositories.progress.commitCompletion(
      completed,
      caseContent,
      ({ previousProgress, previousMastery }) => {
        mergeCalls += 1;
        const previousSkill = previousMastery.find(
          ({ skillId }) => skillId === 'evidence-assessment',
        );
        return {
          progress: buildProgress({
            attemptCount: (previousProgress?.attemptCount ?? 0) + 1,
            completedCount: (previousProgress?.completedCount ?? 0) + 1,
          }),
          mastery: [
            buildMastery({
              sampleCount: (previousSkill?.sampleCount ?? 0) + 1,
            }),
          ],
          mistakes: [buildMistake()],
        };
      },
    );
    const firstResult = await merge;
    const secondResult = await repositories.progress.commitCompletion(
      buildAttempt({
        updatedAt: '2026-07-13T00:20:00.000Z',
        completedAt: '2026-07-13T00:20:00.000Z',
      }),
      caseContent,
      () => {
        mergeCalls += 1;
        return {
          progress: buildProgress({ attemptCount: 99, completedCount: 99 }),
          mastery: [buildMastery({ sampleCount: 99 })],
          mistakes: [],
        };
      },
    );

    expect(firstResult).toEqual(completed);
    expect(secondResult).toEqual(completed);
    expect(mergeCalls).toBe(1);
    expect(await repositories.progress.get(USER_ID, completed.caseId)).toEqual(
      buildProgress(),
    );
    expect(
      await repositories.skills.get(USER_ID, 'evidence-assessment'),
    ).toEqual(buildMastery({ sampleCount: 1 }));
    expect(await repositories.mistakes.list({ userId: USER_ID })).toHaveLength(
      1,
    );
  });

  it('rejects a completed attempt ID collision before applying idempotency', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const completed = buildAttempt();
    const caseContent = createCaseForAttempt(completed);
    await saveCompletionCheckpoint(repositories, completed, caseContent);
    await repositories.progress.commitCompletion(
      completed,
      caseContent,
      () => ({
        progress: buildProgress(),
        mastery: [],
        mistakes: [],
      }),
    );

    const conflicting = buildAttempt({ caseId: 'case-other' });

    await expect(
      repositories.progress.commitCompletion(
        conflicting,
        createCaseForAttempt(conflicting),
        () => ({
          progress: buildProgress({ caseId: 'case-other' }),
          mastery: [],
          mistakes: [],
        }),
      ),
    ).rejects.toThrow(/same.*user.*case.*version|progression/i);
    expect(await repositories.attempts.get(completed.id)).toEqual(completed);
  });

  it('serializes concurrent completion merges for different attempts', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const first = buildAttempt({ id: 'attempt-concurrent-1' });
    const second = buildAttempt({
      id: 'attempt-concurrent-2',
      score: 72,
      verdict: 'pass',
      updatedAt: '2026-07-13T00:11:00.000Z',
      completedAt: '2026-07-13T00:11:00.000Z',
    });
    await saveCompletionCheckpoint(repositories, first);
    await saveCompletionCheckpoint(repositories, second);
    const observedCompletedCounts: number[] = [];

    const commit = (attempt: CompletedAttemptRecord) =>
      repositories.progress.commitCompletion(
        attempt,
        createCaseForAttempt(attempt),
        ({ previousProgress, previousMastery }) => {
          const completedCount = previousProgress?.completedCount ?? 0;
          const previousSkill = previousMastery.find(
            ({ skillId }) => skillId === 'evidence-assessment',
          );
          observedCompletedCounts.push(completedCount);
          return {
            progress: buildProgress({
              latestAttemptId: attempt.id,
              attemptCount: (previousProgress?.attemptCount ?? 0) + 1,
              completedCount: completedCount + 1,
              highestScore: Math.max(
                previousProgress?.highestScore ?? 0,
                attempt.score,
              ),
              latestScore: attempt.score,
              latestVerdict: attempt.verdict,
              updatedAt: attempt.completedAt,
            }),
            mastery: [
              buildMastery({
                sampleCount: (previousSkill?.sampleCount ?? 0) + 1,
                updatedAt: attempt.completedAt,
              }),
            ],
            mistakes: [
              buildMistake({
                id: `mistake-${attempt.id}`,
                attemptId: attempt.id,
                createdAt: attempt.completedAt,
              }),
            ],
          };
        },
      );

    await Promise.all([commit(first), commit(second)]);

    expect(observedCompletedCounts.sort()).toEqual([0, 1]);
    expect(await repositories.progress.get(USER_ID, first.caseId)).toEqual(
      expect.objectContaining({ attemptCount: 2, completedCount: 2 }),
    );
    expect(
      await repositories.skills.get(USER_ID, 'evidence-assessment'),
    ).toEqual(expect.objectContaining({ sampleCount: 2 }));
    expect(await repositories.mistakes.list({ userId: USER_ID })).toHaveLength(
      2,
    );
    expect(await repositories.attempts.get(first.id)).toEqual(first);
    expect(await repositories.attempts.get(second.id)).toEqual(second);
  });

  it('clears user progress atomically while retaining content and app-owned data', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const fdeCase = createMinimalValidCase();
    const settings: UserSettings = {
      userId: USER_ID,
      theme: 'dark',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    const coverage: CoverageRecord = {
      caseId: fdeCase.id,
      status: 'published',
      level: fdeCase.level,
      domains: fdeCase.domains,
      skills: fdeCase.skills,
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    await bootstrapDatabase(db, [fdeCase]);
    await repositories.settings.save(settings);
    await repositories.coverage.saveMany([coverage]);
    const completed = buildAttempt();
    await saveCompletionCheckpoint(repositories, completed, fdeCase);
    await repositories.progress.commitCompletion(completed, fdeCase, () => ({
      progress: buildProgress(),
      mastery: [buildMastery()],
      mistakes: [buildMistake()],
    }));

    await repositories.progress.clear(USER_ID);

    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    expect(await repositories.progress.list(USER_ID)).toEqual([]);
    expect(await repositories.skills.list(USER_ID)).toEqual([]);
    expect(await repositories.mistakes.list({ userId: USER_ID })).toEqual([]);
    expect(await repositories.cases.getVersion(fdeCase.id, 1)).toEqual(fdeCase);
    expect(await repositories.settings.get(USER_ID)).toEqual(settings);
    expect(await repositories.coverage.get(fdeCase.id)).toEqual(coverage);
    expect(await repositories.users.getLocal()).toEqual(
      expect.objectContaining({ id: USER_ID }),
    );
  });
});
