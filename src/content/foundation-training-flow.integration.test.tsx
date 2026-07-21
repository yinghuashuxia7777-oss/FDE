import 'fake-indexeddb/auto';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteDB, type IDBPDatabase } from 'idb';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  ContentManagementService,
  correctSubmissionForNode,
  ProductDataProvider,
  type ProductRepositories,
} from '../application/product';
import {
  resumeAttempt,
  submitNode,
  type TrainingDependencies,
  type TrainingState,
} from '../application/training';
import { foundationIndex } from '../generated/foundation-index';
import { DebriefPage } from '../pages/debrief';
import { FoundationDetailPage } from '../pages/foundation';
import { TrainingRoutePage } from '../pages/training/TrainingRoutePage';
import { LOCAL_USER_ID } from '../repositories/contracts';
import { createIndexedDbRepositories } from '../repositories/indexeddb';
import {
  openFdeArenaDatabase,
  type FdeArenaDatabase,
} from '../storage/database';
import { bundledFoundationSource } from './foundation-source';
import { ContentInstaller } from './installer';
import { LocalContentSource } from './local-content-source';

const FOUNDATION_ID = 'api-basic';
const CASE_ID = 'api-oauth-scope-mismatch-001';
const SKILL_ID = 'api.integration';
const ATTEMPT_ID = 'attempt-00000000-0000-4000-8000-000000000007';

let database: IDBPDatabase<FdeArenaDatabase> | undefined;
let databaseName = '';
let databaseSequence = 0;

afterEach(async () => {
  database?.close();
  database = undefined;
  if (databaseName !== '') await deleteDB(databaseName);
  databaseName = '';
  vi.restoreAllMocks();
});

async function openTestDatabase() {
  databaseSequence += 1;
  databaseName = `foundation-training-flow-${String(databaseSequence)}`;
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

async function expectNoTrainingWrites(
  repositories: ProductRepositories,
): Promise<void> {
  const [attempts, progress] = await Promise.all([
    repositories.attempts.list({ userId: LOCAL_USER_ID }),
    repositories.progress.list(LOCAL_USER_ID),
  ]);
  expect(attempts).toEqual([]);
  expect(progress).toEqual([]);
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

describe('real bundled Foundation to training flow', () => {
  it('keeps knowledge and its gate read-only, then persists training and reaches exact-version debrief', async () => {
    const db = await openTestDatabase();
    const contentSource = new LocalContentSource();
    const pack = await contentSource.loadPack();
    const installer = new ContentInstaller(db, {
      now: () => '2026-07-14T08:00:00.000Z',
    });
    const catalog = await installer.install(
      await installer.prepare(contentSource),
    );
    const repositories = productRepositories(db, installer);

    expect(foundationIndex).toHaveLength(100);
    expect(
      foundationIndex.find(({ id }) => id === FOUNDATION_ID),
    ).toMatchObject({
      id: FOUNDATION_ID,
      path: 'content/foundation/computer-basics/06-api.json',
    });
    const foundations = await bundledFoundationSource.loadAll();
    const foundation = foundations.find(({ id }) => id === FOUNDATION_ID);
    expect(foundation).toMatchObject({
      id: FOUNDATION_ID,
      skills: [SKILL_ID],
      relatedCases: [CASE_ID],
    });
    if (foundation === undefined) {
      throw new Error(`Missing bundled Foundation item ${FOUNDATION_ID}.`);
    }

    const skill = pack.skills.find(({ id }) => id === SKILL_ID);
    expect(skill).toMatchObject({ id: SKILL_ID, status: 'active' });
    expect(catalog.activeSkillIds).toContain(SKILL_ID);
    expect(catalog.activeCases).toContainEqual({ caseId: CASE_ID, version: 1 });
    const summary = (await repositories.cases.listActive()).find(
      ({ id }) => id === CASE_ID,
    );
    expect(summary).toMatchObject({
      id: CASE_ID,
      version: 1,
      status: 'published',
      skills: [SKILL_ID],
    });
    if (summary === undefined) {
      throw new Error(`Missing active bundled Case ${CASE_ID}.`);
    }
    const content = await repositories.cases.getVersion(
      summary.id,
      summary.version,
    );
    if (content === undefined) {
      throw new Error(`Missing exact Case ${summary.id}@${summary.version}.`);
    }
    const firstNodeTitle = content.nodes[0]?.title;
    if (firstNodeTitle === undefined) {
      throw new Error(
        `Case ${summary.id}@${summary.version} has no first-node title.`,
      );
    }

    await expectNoTrainingWrites(repositories);
    const foundationView = render(
      <MemoryRouter>
        <FoundationDetailPage
          foundationId={FOUNDATION_ID}
          foundationSource={bundledFoundationSource}
          repositories={repositories}
        />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: foundation.title }),
    ).toBeVisible();
    expect(
      screen.getByText(foundation.content.simpleExplanation),
    ).toBeVisible();
    expect(screen.getByText(skill!.label)).toBeVisible();
    expect(
      screen.getByRole('link', { name: `Start Case: ${content.title}` }),
    ).toHaveAttribute('href', `/training/${CASE_ID}`);
    await expectNoTrainingWrites(repositories);
    foundationView.unmount();

    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000007',
    );
    const user = userEvent.setup();
    const trainingView = render(
      <ProductDataProvider repositories={repositories}>
        <MemoryRouter initialEntries={[`/training/${CASE_ID}`]}>
          <Routes>
            <Route
              path="/training/:caseId"
              element={
                <TrainingRoutePage foundationSource={bundledFoundationSource} />
              }
            />
          </Routes>
        </MemoryRouter>
      </ProductDataProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Prerequisite Knowledge' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: `Learn ${foundation.title}` }),
    ).toHaveAttribute('href', `/foundation/${FOUNDATION_ID}`);
    await expectNoTrainingWrites(repositories);

    await user.click(screen.getByRole('button', { name: 'Continue Case' }));
    expect(
      await screen.findByRole('heading', {
        name: firstNodeTitle,
      }),
    ).toBeVisible();
    const inProgress = await repositories.attempts.list({
      userId: LOCAL_USER_ID,
      caseId: CASE_ID,
      status: 'in-progress',
    });
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0]?.id).toBe(ATTEMPT_ID);
    expect(await repositories.progress.list(LOCAL_USER_ID)).toEqual([]);
    const started = inProgress[0];
    if (started === undefined) {
      throw new Error('The guarded start did not persist an Attempt.');
    }
    trainingView.unmount();

    let clock = Date.parse(started.updatedAt) + 1_000;
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
      resumeAttempt(content, started),
      dependencies,
    );

    expect(completed.completedAttempt).toMatchObject({
      id: ATTEMPT_ID,
      caseId: CASE_ID,
      caseVersion: summary.version,
      schemaVersion: content.schemaVersion,
      status: 'completed',
      score: 100,
    });
    expect(completed.completedAttempt.completedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(await repositories.attempts.get(ATTEMPT_ID)).toEqual(
      completed.completedAttempt,
    );
    expect(await repositories.progress.get(LOCAL_USER_ID, CASE_ID)).toEqual(
      expect.objectContaining({
        caseVersion: summary.version,
        latestAttemptId: ATTEMPT_ID,
        attemptCount: 1,
        completedCount: 1,
        highestScore: 100,
        latestScore: 100,
      }),
    );
    expect(await repositories.skills.get(LOCAL_USER_ID, SKILL_ID)).toEqual(
      expect.objectContaining({
        skillId: SKILL_ID,
        score: 100,
        sampleCount: 1,
      }),
    );

    expect(
      await repositories.cases.getVersion(
        completed.completedAttempt.caseId,
        completed.completedAttempt.caseVersion,
      ),
    ).toEqual(content);
    const newerRootCause = 'NEWER VERSION ROOT CAUSE MUST NOT APPEAR';
    const newerContent = structuredClone(content);
    newerContent.title = `${content.title} v2`;
    newerContent.metadata.version = summary.version + 1;
    newerContent.debrief.rootCause = newerRootCause;
    await repositories.cases.seed([newerContent]);
    const activeCatalogRead = vi
      .spyOn(repositories.cases, 'listActive')
      .mockResolvedValue([
        {
          ...summary,
          title: newerContent.title,
          version: newerContent.metadata.version,
        },
      ]);
    const exactVersionRead = vi.spyOn(repositories.cases, 'getVersion');

    render(
      <MemoryRouter>
        <DebriefPage attemptId={ATTEMPT_ID} repositories={repositories} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Case assessment' }),
    ).toBeVisible();
    expect(screen.getByText(content.debrief.rootCause)).toBeVisible();
    expect(screen.queryByText(newerRootCause)).not.toBeInTheDocument();
    expect(screen.getByText(`${summary.version}`)).toBeVisible();
    expect(exactVersionRead).toHaveBeenCalledWith(CASE_ID, summary.version);
    expect(activeCatalogRead).toHaveBeenCalledWith({ status: 'published' });
  });
});
