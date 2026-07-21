import 'fake-indexeddb/auto';

import { render, screen, within } from '@testing-library/react';
import { deleteDB, type IDBPDatabase } from 'idb';
import { MemoryRouter } from 'react-router-dom';

import {
  buildDailyTrainingPlan,
  ContentManagementService,
  correctSubmissionForNode,
  type ProductRepositories,
} from '../application/product';
import {
  createTrainingSession,
  submitNode,
  type TrainingDependencies,
  type TrainingState,
} from '../application/training';
import { DashboardPage } from '../pages/dashboard';
import { DebriefPage } from '../pages/debrief';
import { LOCAL_USER_ID } from '../repositories/contracts';
import { createIndexedDbRepositories } from '../repositories/indexeddb';
import {
  openFdeArenaDatabase,
  type FdeArenaDatabase,
} from '../storage/database';
import { ContentInstaller } from './installer';
import { LocalContentSource } from './local-content-source';

const CASE_ID = 'rag-stale-policy-cache-001';
const ATTEMPT_ID = 'mvp-real-content-attempt';
const TEST_DAY = new Date('2026-07-13T12:00:00.000Z');

let database: IDBPDatabase<FdeArenaDatabase> | undefined;
let databaseName = '';
let databaseSequence = 0;

afterEach(async () => {
  database?.close();
  database = undefined;
  if (databaseName !== '') await deleteDB(databaseName);
});

async function openTestDatabase() {
  databaseSequence += 1;
  databaseName = `mvp-training-flow-${String(databaseSequence)}`;
  database = await openFdeArenaDatabase({ name: databaseName });
  return database;
}

function productRepositories(
  db: IDBPDatabase<FdeArenaDatabase>,
  installer: ContentInstaller,
): ProductRepositories {
  const repositories = createIndexedDbRepositories(db);
  return {
    ...repositories,
    contentManagement: new ContentManagementService(
      repositories.content,
      installer,
    ),
  };
}

async function finishCorrectPath(
  initialState: TrainingState,
  dependencies: TrainingDependencies,
): Promise<Extract<TrainingState, { phase: 'completed' }>> {
  let state = initialState;
  let operations = 0;
  while (state.phase !== 'completed') {
    if (state.phase !== 'active') {
      throw new Error(`Correct path stopped in unexpected ${state.phase}.`);
    }
    state = await submitNode(
      state,
      correctSubmissionForNode(state.currentNode),
      dependencies,
    );
    operations += 1;
    if (operations > initialState.caseContent.nodes.length + 1) {
      throw new Error('Correct path exceeded its bounded node count.');
    }
  }
  return state;
}

describe('real bundled MVP training flow', () => {
  it('loads, trains, scores, updates mastery, debriefs, and records dashboard evidence', async () => {
    const db = await openTestDatabase();
    const source = new LocalContentSource();
    const pack = await source.loadPack();
    const installer = new ContentInstaller(db, {
      now: () => '2026-07-13T08:59:00.000Z',
    });
    const catalog = await installer.install(await installer.prepare(source));
    const repositories = productRepositories(db, installer);

    expect(pack.manifest.contentVersion).toBe('1.3.0');
    expect(pack.manifest.activePublishedCaseCount).toBe(50);
    expect(pack.manifest.caseVersionCount).toBe(53);
    expect(catalog.activeCases).toContainEqual({ caseId: CASE_ID, version: 1 });

    const summary = (await repositories.cases.listActive()).find(
      ({ id }) => id === CASE_ID,
    );
    expect(summary).toBeDefined();
    const content = await repositories.cases.getVersion(
      CASE_ID,
      summary!.version,
    );
    expect(content).toBeDefined();

    let clock = Date.parse('2026-07-13T09:00:00.000Z');
    const dependencies: TrainingDependencies = {
      attemptRepository: repositories.attempts,
      progressRepository: repositories.progress,
      createId: () => ATTEMPT_ID,
      now: () => {
        const timestamp = new Date(clock).toISOString();
        clock += 1_000;
        return timestamp;
      },
    };
    const completed = await finishCorrectPath(
      await createTrainingSession(content!, dependencies),
      dependencies,
    );

    expect(completed.completedAttempt).toMatchObject({
      id: ATTEMPT_ID,
      caseId: CASE_ID,
      caseVersion: 1,
      schemaVersion: 1,
      status: 'completed',
      score: 100,
      verdict: 'excellent',
    });
    expect(await repositories.attempts.get(ATTEMPT_ID)).toEqual(
      completed.completedAttempt,
    );
    expect(await repositories.progress.get(LOCAL_USER_ID, CASE_ID)).toEqual(
      expect.objectContaining({
        latestAttemptId: ATTEMPT_ID,
        completedCount: 1,
        latestScore: 100,
      }),
    );
    expect(await repositories.skills.get(LOCAL_USER_ID, 'rag.search')).toEqual(
      expect.objectContaining({ score: 100, sampleCount: 1 }),
    );
    expect(
      await repositories.cases.getVersion(
        completed.completedAttempt.caseId,
        completed.completedAttempt.caseVersion,
      ),
    ).toEqual(content);

    const debrief = render(
      <MemoryRouter>
        <DebriefPage attemptId={ATTEMPT_ID} repositories={repositories} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Case assessment' }),
    ).toBeVisible();
    expect(screen.getByText(content!.debrief.rootCause)).toBeVisible();
    debrief.unmount();

    const [activeCases, progress, mastery, mistakes, attempts] =
      await Promise.all([
        repositories.cases.listActive({ status: 'published' }),
        repositories.progress.list(LOCAL_USER_ID),
        repositories.skills.list(LOCAL_USER_ID),
        repositories.mistakes.list({ userId: LOCAL_USER_ID }),
        repositories.attempts.list({
          userId: LOCAL_USER_ID,
          status: 'completed',
        }),
      ]);
    const plan = buildDailyTrainingPlan(
      activeCases,
      progress,
      mastery,
      mistakes,
      attempts,
      TEST_DAY,
    );
    const completedPlanItem = [plan.focusCase, ...plan.nextCases].find(
      (item) => item?.caseSummary.id === CASE_ID,
    );
    expect(completedPlanItem).toMatchObject({
      caseSummary: { id: CASE_ID },
      completedToday: true,
      attemptId: ATTEMPT_ID,
      score: 100,
    });

    render(
      <MemoryRouter>
        <DashboardPage repositories={repositories} now={TEST_DAY} />
      </MemoryRouter>,
    );
    const challenge = await screen.findByRole('region', {
      name: "Today's challenge",
    });
    expect(within(challenge).getByText(content!.title)).toBeVisible();
    expect(
      within(challenge).getByText(content!.title).closest('a'),
    ).toHaveAttribute('href', `/debrief/${ATTEMPT_ID}`);

    const evidence = await screen.findByRole('region', {
      name: 'Evidence timeline',
    });
    expect(within(evidence).getByText(content!.title)).toBeVisible();
    expect(evidence).toHaveTextContent(/Excellent\s*·\s*Score 100/i);
    expect(
      within(evidence).getByRole('link', { name: 'Review evidence' }),
    ).toHaveAttribute('href', `/debrief/${ATTEMPT_ID}`);
  });
});
