import 'fake-indexeddb/auto';

import { render, screen } from '@testing-library/react';
import { deleteDB, type IDBPDatabase } from 'idb';
import { MemoryRouter } from 'react-router-dom';

import {
  ContentManagementService,
  type ProductRepositories,
} from '../application/product';
import type { FdeCase } from '../domain/cases/types';
import { CaseLibraryPage } from '../pages/cases';
import { ProfilePage } from '../pages/profile';
import { SkillsPage } from '../pages/skills';
import {
  createIndexedDbRepositories,
  IndexedDbContentRepository,
} from '../repositories/indexeddb';
import type {
  CompletedAttemptRecord,
  StoredMistakeRecord,
} from '../repositories/contracts';
import {
  openFdeArenaDatabase,
  type FdeArenaDatabase,
} from '../storage/database';
import { createMinimalValidCase } from '../tests/fixtures/cases';
import type {
  ActiveCaseReference,
  ContentPack,
  ContentSource,
  DomainDefinition,
  SkillDefinition,
} from './contracts';
import { sha256Content } from './hash';
import { ContentInstaller } from './installer';

const USER_ID = 'local-user';
const timestamp = '2026-07-13T00:00:00.000Z';

let database: IDBPDatabase<FdeArenaDatabase> | undefined;
let databaseName = '';
let nextDatabaseId = 0;

async function openTestDatabase() {
  nextDatabaseId += 1;
  databaseName = `content-lifecycle-${String(nextDatabaseId)}`;
  database = await openFdeArenaDatabase({ name: databaseName });
  return database;
}

afterEach(async () => {
  database?.close();
  database = undefined;
  if (databaseName !== '') await deleteDB(databaseName);
});

function domainDefinition(
  id: string,
  label: string,
  status: DomainDefinition['status'] = 'active',
): DomainDefinition {
  return {
    schemaVersion: 1,
    id,
    label,
    description: `${label} capability domain.`,
    status,
  };
}

function skillDefinition(
  id: string,
  domainId: string,
  label: string,
  status: SkillDefinition['status'] = 'active',
): SkillDefinition {
  return {
    schemaVersion: 1,
    id,
    domainId,
    label,
    description: `${label} capability skill.`,
    status,
  };
}

function publishedCase(
  caseId: string,
  title: string,
  domainId: string,
  skillId: string,
  version = 1,
): FdeCase {
  const content = createMinimalValidCase();
  const node = content.nodes[0]!;
  content.id = caseId;
  content.slug = caseId;
  content.title = title;
  content.status = 'published';
  content.domains = [domainId];
  content.skills = [skillId];
  content.metadata.version = version;
  content.metadata.reviewedAt = timestamp;
  content.metadata.reviewer = 'FDE Arena reviewer';
  node.id = `${caseId}-node-01`;
  node.skillWeights = { [skillId]: 1 };
  node.options[0]!.id = `${caseId}-option-a`;
  node.options[1]!.id = `${caseId}-option-b`;
  node.evidence[0]!.id = `${caseId}-evidence-01`;
  node.answer = { correctOptionId: `${caseId}-option-a` };
  node.scoring.criticalErrorOptionIds = [`${caseId}-option-b`];
  node.consequences = [
    {
      optionId: `${caseId}-option-b`,
      timeDelta: 5,
      riskDelta: 1,
      message: 'The unsupported action delays diagnosis.',
    },
  ];
  content.startNodeId = node.id;
  return content;
}

interface PackOptions {
  cases: FdeCase[];
  domains: DomainDefinition[];
  skills: SkillDefinition[];
  activeCases?: ActiveCaseReference[];
  contentVersion?: string;
  packId?: string;
}

async function createPack({
  cases,
  domains,
  skills,
  activeCases = cases
    .filter(({ status }) => status === 'published')
    .map(({ id, metadata }) => ({ caseId: id, version: metadata.version })),
  contentVersion = '1.0.0',
  packId = 'lifecycle-test-pack',
}: PackOptions): Promise<ContentPack> {
  const manifestCases = await Promise.all(
    cases.map(async (content) => ({
      caseId: content.id,
      version: content.metadata.version,
      schemaVersion: content.schemaVersion,
      status: content.status,
      path: `content/cases/${content.level}/${content.id}-v${String(content.metadata.version)}.json`,
      contentHash: await sha256Content(content),
    })),
  );
  const activeCaseIds = activeCases.map(({ caseId }) => caseId);
  const domainCaseCounts = Object.fromEntries(
    domains.map(({ id }) => [
      id,
      activeCases.filter(({ caseId, version }) =>
        cases
          .find(
            (candidate) =>
              candidate.id === caseId && candidate.metadata.version === version,
          )
          ?.domains.includes(id),
      ).length,
    ]),
  );
  const coverageDomains = domains.map(({ id, status }) => ({
    domainId: id,
    targetCaseCount: status === 'active' ? 1 : 0,
  }));
  const manifestWithoutChecksum = {
    packId,
    displayName: 'Lifecycle test content pack',
    contentVersion,
    schemaVersion: 1,
    releasedAt: timestamp,
    activePublishedCaseCount: activeCases.length,
    caseVersionCount: cases.length,
    activeCases,
    activeCaseIds,
    allCaseIds: [...new Set(cases.map(({ id }) => id))].sort(),
    domains: domains.map(({ id }) => id).sort(),
    domainCaseCounts,
    cases: manifestCases,
  };
  const packWithoutChecksum = {
    formatVersion: 1 as const,
    manifest: manifestWithoutChecksum,
    cases,
    domains,
    skills,
    coverage: {
      schemaVersion: 1 as const,
      targetCaseCount: coverageDomains.reduce(
        (sum, entry) => sum + entry.targetCaseCount,
        0,
      ),
      domains: coverageDomains,
    },
  };
  return {
    ...packWithoutChecksum,
    manifest: {
      ...manifestWithoutChecksum,
      checksum: await sha256Content(packWithoutChecksum),
    },
  };
}

function source(pack: ContentPack): ContentSource {
  return { sourceKind: 'file', loadPack: () => Promise.resolve(pack) };
}

function productRepositories(
  db: IDBPDatabase<FdeArenaDatabase>,
  installer = new ContentInstaller(db),
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

function completedAttempt(caseId: string): CompletedAttemptRecord {
  return {
    id: `${caseId}-attempt-01`,
    userId: USER_ID,
    caseId,
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: timestamp,
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 88,
    verdict: 'excellent',
    criticalErrorIds: [],
    visitedNodeIds: [`${caseId}-node-01`],
    roundHistory: [],
    consequences: [],
  };
}

async function seedEveryUserStore(
  db: IDBPDatabase<FdeArenaDatabase>,
  caseId: string,
  skillId: string,
): Promise<void> {
  await db.put('attempts', completedAttempt(caseId));
  await db.put('progress', {
    userId: USER_ID,
    caseId,
    caseVersion: 1,
    latestAttemptId: `${caseId}-attempt-01`,
    attemptCount: 1,
    completedCount: 1,
    highestScore: 88,
    latestScore: 88,
    latestVerdict: 'excellent',
    hasCriticalError: false,
    updatedAt: '2026-07-13T00:10:00.000Z',
  });
  await db.put('mastery', {
    userId: USER_ID,
    skillId,
    score: 82,
    sampleCount: 2,
    updatedAt: '2026-07-13T00:10:00.000Z',
  });
  const mistake: StoredMistakeRecord = {
    id: `${caseId}-mistake-01`,
    userId: USER_ID,
    attemptId: `${caseId}-attempt-01`,
    caseId,
    caseVersion: 1,
    nodeId: `${caseId}-node-01`,
    submission: {
      type: 'choice',
      selectedOptionIds: [`${caseId}-option-b`],
    },
    correctSubmission: {
      type: 'choice',
      selectedOptionIds: [`${caseId}-option-a`],
    },
    errorTypes: ['unsupported-action'],
    evidenceIds: [`${caseId}-evidence-01`],
    skillIds: [skillId],
    critical: true,
    criticalIndex: 'critical',
    createdAt: '2026-07-13T00:05:00.000Z',
    redoScores: [],
  };
  await db.put('mistakes', mistake);
  await db.put('settings', {
    userId: USER_ID,
    theme: 'dark',
    updatedAt: timestamp,
  });
}

async function userStoreSnapshot(db: IDBPDatabase<FdeArenaDatabase>) {
  const [attempts, progress, mastery, mistakes, settings] = await Promise.all([
    db.getAll('attempts'),
    db.getAll('progress'),
    db.getAll('mastery'),
    db.getAll('mistakes'),
    db.getAll('settings'),
  ]);
  return { attempts, progress, mastery, mistakes, settings };
}

describe('content lifecycle integration', () => {
  it('T1/T7/T18 imports JSON and exposes a new case, domain, and skill through unchanged pages', async () => {
    const db = await openTestDatabase();
    const domain = domainDefinition('agent-systems', 'Imported Agent Systems');
    const skill = skillDefinition(
      'agent.tool-routing',
      domain.id,
      'Imported Tool Routing',
    );
    const addedCase = publishedCase(
      'agent-routing-001',
      'Imported Agent Routing Case',
      domain.id,
      skill.id,
    );
    const pack = await createPack({
      cases: [addedCase],
      domains: [domain],
      skills: [skill],
    });
    const repositories = productRepositories(db);
    const serialized = JSON.stringify(pack);

    const prepared = await repositories.contentManagement.prepareFile({
      size: new TextEncoder().encode(serialized).byteLength,
      text: () => Promise.resolve(serialized),
    });
    await repositories.contentManagement.install(prepared);

    const caseView = render(
      <MemoryRouter>
        <CaseLibraryPage repositories={repositories} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: addedCase.title }),
    ).toBeVisible();
    caseView.unmount();

    render(
      <MemoryRouter>
        <SkillsPage repositories={repositories} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: domain.label }),
    ).toBeVisible();
    expect(screen.getByText(skill.label)).toBeVisible();
  });

  it('T2 keeps every user store unchanged and marks only the added case unstarted', async () => {
    const db = await openTestDatabase();
    const domain = domainDefinition('rag-search', 'RAG Search');
    const skill = skillDefinition('rag.search', domain.id, 'RAG Search Design');
    const caseA = publishedCase(
      'rag-case-a',
      'Existing RAG Case',
      domain.id,
      skill.id,
    );
    const installer = new ContentInstaller(db);
    await installer.install(
      await installer.prepare(
        source(
          await createPack({
            cases: [caseA],
            domains: [domain],
            skills: [skill],
          }),
        ),
      ),
    );
    await seedEveryUserStore(db, caseA.id, skill.id);
    const before = await userStoreSnapshot(db);
    const caseB = publishedCase(
      'rag-case-b',
      'New RAG Case',
      domain.id,
      skill.id,
    );

    await installer.install(
      await installer.prepare(
        source(
          await createPack({
            cases: [caseA, caseB],
            domains: [domain],
            skills: [skill],
            contentVersion: '1.1.0',
          }),
        ),
      ),
    );

    expect(await userStoreSnapshot(db)).toEqual(before);
    const repositories = createIndexedDbRepositories(db);
    expect((await repositories.cases.listActive()).map(({ id }) => id)).toEqual(
      [caseA.id, caseB.id],
    );
    expect(await repositories.progress.get(USER_ID, caseA.id)).toEqual(
      expect.objectContaining({ completedCount: 1, caseVersion: 1 }),
    );
    expect(await repositories.progress.get(USER_ID, caseB.id)).toBeUndefined();
  });

  it('T3/T14 hides a deprecated case while retaining its exact attempt and historical labels', async () => {
    const db = await openTestDatabase();
    const domain = domainDefinition('legacy-domain', 'Historical Domain Label');
    const skill = skillDefinition(
      'legacy-domain.diagnosis',
      domain.id,
      'Historical Skill Label',
    );
    const versionOne = publishedCase(
      'legacy-case-001',
      'Historical Published Case',
      domain.id,
      skill.id,
      1,
    );
    const installer = new ContentInstaller(db);
    await installer.install(
      await installer.prepare(
        source(
          await createPack({
            cases: [versionOne],
            domains: [domain],
            skills: [skill],
          }),
        ),
      ),
    );
    await seedEveryUserStore(db, versionOne.id, skill.id);

    const versionTwo = publishedCase(
      versionOne.id,
      'Deprecated Replacement',
      domain.id,
      skill.id,
      2,
    );
    versionTwo.status = 'deprecated';
    await installer.install(
      await installer.prepare(
        source(
          await createPack({
            cases: [versionOne, versionTwo],
            domains: [{ ...domain, status: 'deprecated' }],
            skills: [{ ...skill, status: 'deprecated' }],
            activeCases: [],
            contentVersion: '2.0.0',
          }),
        ),
      ),
    );

    const repositories = productRepositories(db, installer);
    expect(await repositories.cases.listActive()).toEqual([]);
    expect(await repositories.cases.getVersion(versionOne.id, 1)).toEqual(
      versionOne,
    );
    expect(await repositories.cases.getVersion(versionOne.id, 2)).toEqual(
      versionTwo,
    );
    expect(
      await repositories.attempts.get(`${versionOne.id}-attempt-01`),
    ).toEqual(
      expect.objectContaining({ caseId: versionOne.id, caseVersion: 1 }),
    );

    const caseView = render(
      <MemoryRouter>
        <CaseLibraryPage repositories={repositories} />
      </MemoryRouter>,
    );
    expect(await screen.findByText('No cases match')).toBeVisible();
    expect(screen.queryByText(versionOne.title)).not.toBeInTheDocument();
    caseView.unmount();

    render(
      <MemoryRouter>
        <ProfilePage repositories={repositories} />
      </MemoryRouter>,
    );
    const historicalSkill = await screen.findByRole('article', {
      name: skill.label,
    });
    expect(historicalSkill).toHaveTextContent(versionOne.title);
    expect(
      screen.getByText('Evidence collected').parentElement,
    ).toHaveTextContent('1');
  });

  it('T11 restores bundled content without deleting imported versions or user history', async () => {
    const db = await openTestDatabase();
    const domain = domainDefinition('restore-domain', 'Restore Domain');
    const skill = skillDefinition(
      'restore-domain.switching',
      domain.id,
      'Catalog Switching',
    );
    const importedCase = publishedCase(
      'restore-case-001',
      'Imported Restore Case',
      domain.id,
      skill.id,
    );
    const repositories = productRepositories(db);
    const importedPack = await createPack({
      cases: [importedCase],
      domains: [domain],
      skills: [skill],
      packId: 'imported-restore-pack',
    });
    await repositories.contentManagement.install(
      await new ContentInstaller(db).prepare(source(importedPack)),
    );
    await seedEveryUserStore(db, importedCase.id, skill.id);
    const before = await userStoreSnapshot(db);

    const catalog = await repositories.contentManagement.restoreBundled();

    expect(catalog.sourceKind).toBe('bundled');
    expect(catalog.packId).toBe('fde-arena-bundled');
    expect(await userStoreSnapshot(db)).toEqual(before);
    expect(await repositories.cases.getVersion(importedCase.id, 1)).toEqual(
      importedCase,
    );
    const activeCases = await repositories.cases.listActive();
    expect(
      activeCases.map(({ id, version }) => ({ caseId: id, version })),
    ).toEqual(catalog.activeCases);
    expect(activeCases).not.toContainEqual(
      expect.objectContaining({ id: importedCase.id }),
    );
  });

  it('T10 rolls back content atomically without touching any user store', async () => {
    const db = await openTestDatabase();
    const domain = domainDefinition('rollback-domain', 'Rollback Domain');
    const skill = skillDefinition(
      'rollback-domain.validation',
      domain.id,
      'Rollback Validation',
    );
    await seedEveryUserStore(db, 'rollback-case-a', skill.id);
    const before = await userStoreSnapshot(db);
    const pack = await createPack({
      cases: [
        publishedCase(
          'rollback-case-a',
          'Rollback Case A',
          domain.id,
          skill.id,
        ),
        publishedCase(
          'rollback-case-b',
          'Rollback Case B',
          domain.id,
          skill.id,
        ),
      ],
      domains: [domain],
      skills: [skill],
    });
    const installer = new ContentInstaller(db, {
      onInstallStep(step) {
        if (step === 'case:1') throw new Error('Injected rollback failure');
      },
    });

    await expect(
      installer.install(await installer.prepare(source(pack))),
    ).rejects.toThrow('Injected rollback failure');

    expect(await userStoreSnapshot(db)).toEqual(before);
    expect(await db.count('caseVersions')).toBe(0);
    expect(await db.count('contentPacks')).toBe(0);
    expect(
      await new IndexedDbContentRepository(db).getActiveCatalog(),
    ).toBeUndefined();
  });
});
