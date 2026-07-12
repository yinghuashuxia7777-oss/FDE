import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import { createMinimalValidCase } from '../../tests/fixtures/cases';
import type {
  AttemptRecord,
  CaseProgressRecord,
  CompletedAttemptRecord,
  CoverageRecord,
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
    status: 'completed',
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 88,
    verdict: 'excellent',
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

describe('IndexedDB schema version 1', () => {
  it('creates the required stores and query indexes', async () => {
    const db = await openTestDatabase();

    expect(db.version).toBe(DATABASE_VERSION);
    expect(Array.from(db.objectStoreNames)).toEqual([
      'appMeta',
      'attempts',
      'caseVersions',
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
    expect(await repositories.cases.getVersion(versionOne.id)).toEqual(
      versionTwo,
    );
    expect(await repositories.cases.list()).toEqual([
      expect.objectContaining({
        id: versionOne.id,
        version: 2,
        title: versionTwo.title,
      }),
    ]);
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

  it('lists only latest matching case summaries', async () => {
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
  it('creates, reads, lists, updates, and deletes persisted records', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const attempt = buildAttempt();
    const progress = buildProgress();
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

    await repositories.attempts.save(attempt);
    await repositories.progress.save(progress);
    await repositories.skills.save(mastery);
    await repositories.mistakes.save(mistake);
    await repositories.settings.save(settings);
    await repositories.coverage.saveMany([coverage]);
    await repositories.users.ensureLocalUser();

    expect(await repositories.attempts.get(attempt.id)).toEqual(attempt);
    expect(await repositories.progress.get(USER_ID, progress.caseId)).toEqual(
      progress,
    );
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

  it('uses case, status, completion, skill, error, and critical indexes', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    await repositories.attempts.save(
      buildAttempt({
        id: 'attempt-complete',
        completedAt: '2026-07-13T02:00:00.000Z',
      }),
    );
    await repositories.attempts.save({
      id: 'attempt-active',
      userId: USER_ID,
      caseId: 'case-other',
      caseVersion: 1,
      status: 'in-progress',
      startedAt: '2026-07-13T01:00:00.000Z',
      updatedAt: '2026-07-13T01:05:00.000Z',
      currentNodeId: 'node-1',
      criticalErrorIds: [],
      visitedNodeIds: ['node-1'],
      roundHistory: [],
    });
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
      repositories.attempts.save(missingCompletedResult),
    ).rejects.toThrow(/completed attempt/i);
    await expect(
      repositories.attempts.save(activeWithCompletedResult),
    ).rejects.toThrow(/in-progress attempt/i);
    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
  });

  it('rejects contradictory attempt status records through saveSnapshot', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const invalidAttempt = {
      ...buildAttempt(),
      status: 'in-progress',
      currentNodeId: 'node-1',
    } as unknown as AttemptRecord;

    await expect(
      repositories.progress.saveSnapshot({
        attempt: invalidAttempt,
        progress: buildProgress(),
        mastery: [],
        mistakes: [],
      }),
    ).rejects.toThrow(/in-progress attempt/i);
    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    expect(await repositories.progress.list(USER_ID)).toEqual([]);
  });

  it('normalizes attempt timestamps before filtering and sorting by absolute time', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    await repositories.attempts.save(
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
              branchKey: 'complete',
            },
            submittedAt: '2026-07-13T03:00:00+02:00',
            revealed: false,
          },
        ],
      }),
    );
    await repositories.attempts.save(
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
            submittedAt: '2026-07-13T01:00:00.000Z',
          }),
        ],
      }),
    );
  });

  it('rejects invalid attempt and completion-filter timestamps', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);

    await expect(
      repositories.attempts.save(
        buildAttempt({ updatedAt: 'not-a-timestamp' }),
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

      await expect(
        repositories.attempts.save(buildAttempt({ startedAt: timestamp })),
      ).rejects.toThrow(/startedAt/i);
      expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    },
  );

  it('rolls back a multi-store progress snapshot if one write is invalid', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);
    const invalidMastery = {
      userId: USER_ID,
      score: 10,
      sampleCount: 1,
      updatedAt: '2026-07-13T00:10:00.000Z',
    } as SkillMasteryRecord;

    await expect(
      repositories.progress.saveSnapshot({
        attempt: buildAttempt(),
        progress: buildProgress(),
        mastery: [invalidMastery],
        mistakes: [buildMistake()],
      }),
    ).rejects.toThrow();

    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    expect(await repositories.progress.list(USER_ID)).toEqual([]);
    expect(await repositories.skills.list(USER_ID)).toEqual([]);
    expect(await repositories.mistakes.list({ userId: USER_ID })).toEqual([]);
  });

  it('rejects a snapshot whose progress points at a different case version', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);

    await expect(
      repositories.progress.saveSnapshot({
        attempt: buildAttempt({ caseVersion: 2 }),
        progress: buildProgress({ caseVersion: 1 }),
        mastery: [],
        mistakes: [],
      }),
    ).rejects.toThrow(/same user, case, and case version/i);

    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    expect(await repositories.progress.list(USER_ID)).toEqual([]);
  });

  it('rejects a snapshot whose latest attempt id does not match the attempt', async () => {
    const db = await openTestDatabase();
    const repositories = createIndexedDbRepositories(db);

    await expect(
      repositories.progress.saveSnapshot({
        attempt: buildAttempt(),
        progress: buildProgress({ latestAttemptId: 'attempt-other' }),
        mastery: [],
        mistakes: [],
      }),
    ).rejects.toThrow(/latest attempt id/i);

    expect(await repositories.attempts.list({ userId: USER_ID })).toEqual([]);
    expect(await repositories.progress.list(USER_ID)).toEqual([]);
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
    await repositories.progress.saveSnapshot({
      attempt: buildAttempt(),
      progress: buildProgress(),
      mastery: [buildMastery()],
      mistakes: [buildMistake()],
    });

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
