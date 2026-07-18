import 'fake-indexeddb/auto';

import { deleteDB, type IDBPDatabase } from 'idb';

import type { FdeCase } from '../domain/cases/types';
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
import {
  createIndexedDbRepositories,
  IndexedDbContentRepository,
} from '../repositories/indexeddb';
import {
  openFdeArenaDatabase,
  type FdeArenaDatabase,
} from '../storage/database';

let database: IDBPDatabase<FdeArenaDatabase> | undefined;
let databaseName = '';
let nextDatabaseId = 0;

async function openTestDatabase() {
  nextDatabaseId += 1;
  databaseName = `content-installer-test-${nextDatabaseId}`;
  database = await openFdeArenaDatabase({ name: databaseName });
  return database;
}

afterEach(async () => {
  database?.close();
  database = undefined;
  if (databaseName !== '') await deleteDB(databaseName);
});

function publishedCase(caseId: string, version = 1): FdeCase {
  const content = createMinimalValidCase();
  content.id = caseId;
  content.slug = caseId;
  content.status = 'published';
  content.metadata.version = version;
  content.metadata.reviewedAt = '2026-07-13T00:00:00.000Z';
  content.metadata.reviewer = 'FDE Arena reviewer';
  content.domains = ['rag-search'];
  content.skills = ['rag.search'];
  content.nodes[0]!.id = `${caseId}-node-01`;
  content.startNodeId = content.nodes[0]!.id;
  content.nodes[0]!.options[0]!.id = `${caseId}-option-a`;
  content.nodes[0]!.options[1]!.id = `${caseId}-option-b`;
  content.nodes[0]!.evidence[0]!.id = `${caseId}-evidence-01`;
  content.nodes[0]!.answer = {
    correctOptionId: `${caseId}-option-a`,
  };
  content.nodes[0]!.scoring.criticalErrorOptionIds = [`${caseId}-option-b`];
  content.nodes[0]!.consequences = [
    {
      optionId: `${caseId}-option-b`,
      timeDelta: 5,
      riskDelta: 1,
      message: 'The unsupported change delays diagnosis.',
    },
  ];
  content.nodes[0]!.skillWeights = { 'rag.search': 1 };
  return content;
}

const domain: DomainDefinition = {
  schemaVersion: 1,
  id: 'rag-search',
  label: 'RAG and enterprise search',
  description: 'Retrieval and grounded enterprise knowledge systems.',
  status: 'active',
};

const skill: SkillDefinition = {
  schemaVersion: 1,
  id: 'rag.search',
  domainId: domain.id,
  label: 'RAG search design',
  description: 'Design grounded retrieval behavior.',
  status: 'active',
};

interface PackOptions {
  cases: FdeCase[];
  activeCases?: ActiveCaseReference[];
  contentVersion?: string;
  domains?: DomainDefinition[];
  skills?: SkillDefinition[];
}

async function createPack({
  cases,
  activeCases = cases
    .filter(({ status }) => status === 'published')
    .map(({ id, metadata }) => ({ caseId: id, version: metadata.version })),
  contentVersion = '1.0.0',
  domains = [domain],
  skills = [skill],
}: PackOptions): Promise<ContentPack> {
  const manifestCases = await Promise.all(
    cases.map(async (content) => ({
      caseId: content.id,
      version: content.metadata.version,
      schemaVersion: content.schemaVersion,
      status: content.status,
      path: `content/cases/${content.level}/${content.id}-v${content.metadata.version}.json`,
      contentHash: await sha256Content(content),
    })),
  );
  const activeCaseIds = activeCases.map(({ caseId }) => caseId);
  const domainCaseCounts = Object.fromEntries(
    domains.map(({ id }) => [
      id,
      activeCases.filter(({ caseId, version }) => {
        const content = cases.find(
          (candidate) =>
            candidate.id === caseId && candidate.metadata.version === version,
        );
        return content?.domains.includes(id) === true;
      }).length,
    ]),
  );
  const manifestWithoutChecksum = {
    packId: 'test-pack',
    displayName: 'Test content pack',
    contentVersion,
    schemaVersion: 1,
    releasedAt: '2026-07-13T00:00:00.000Z',
    activePublishedCaseCount: activeCases.length,
    caseVersionCount: cases.length,
    activeCases,
    activeCaseIds,
    allCaseIds: [...new Set(cases.map(({ id }) => id))].sort(),
    domains: domains.map(({ id }) => id).sort(),
    domainCaseCounts,
    cases: manifestCases,
  };
  const checksum = await sha256Content({
    formatVersion: 1,
    manifest: manifestWithoutChecksum,
    cases,
    domains,
    skills,
    coverage: {
      schemaVersion: 1,
      targetCaseCount: 1,
      domains: [{ domainId: domain.id, targetCaseCount: 1 }],
    },
  });
  return {
    formatVersion: 1,
    manifest: { ...manifestWithoutChecksum, checksum },
    cases,
    domains,
    skills,
    coverage: {
      schemaVersion: 1,
      targetCaseCount: 1,
      domains: [{ domainId: domain.id, targetCaseCount: 1 }],
    },
  };
}

function source(
  pack: ContentPack,
  sourceKind: ContentSource['sourceKind'] = 'file',
): ContentSource {
  return {
    sourceKind,
    loadPack: vi.fn(() => Promise.resolve(pack)),
  };
}

describe('ContentInstaller', () => {
  it('uses only explicit active versions and keeps exact historical versions', async () => {
    const db = await openTestDatabase();
    const versionOne = publishedCase('case-a', 1);
    const versionTwo = publishedCase('case-a', 2);
    versionTwo.status = 'deprecated';
    const pack = await createPack({
      cases: [versionOne, versionTwo],
      activeCases: [],
    });
    const installer = new ContentInstaller(db);

    const prepared = await installer.prepare(source(pack));
    await installer.install(prepared);

    const repositories = createIndexedDbRepositories(db);
    expect(await repositories.cases.listActive()).toEqual([]);
    expect(await repositories.cases.list()).toEqual([]);
    expect(await repositories.cases.getVersion('case-a', 1)).toEqual(
      versionOne,
    );
    expect(await repositories.cases.getVersion('case-a', 2)).toEqual(
      versionTwo,
    );
  });

  it('rejects a changed immutable case version before installation', async () => {
    const db = await openTestDatabase();
    const installer = new ContentInstaller(db);
    const first = await createPack({ cases: [publishedCase('case-a')] });
    await installer.install(await installer.prepare(source(first)));

    const changed = publishedCase('case-a');
    changed.title = 'Silently replaced title';
    const conflicting = await createPack({
      cases: [changed],
      contentVersion: '1.1.0',
    });

    await expect(installer.prepare(source(conflicting))).rejects.toThrow(
      /case-a.*version 1.*different content/i,
    );
    expect(await db.count('contentPacks')).toBe(1);
  });

  it('rolls back every content write when one installation step fails', async () => {
    const db = await openTestDatabase();
    await db.put('appMeta', {
      key: 'user-owned-marker',
      value: { preserved: true },
      updatedAt: '2026-07-13T00:00:00.000Z',
    });
    const pack = await createPack({
      cases: [publishedCase('case-a'), publishedCase('case-b')],
    });
    const installer = new ContentInstaller(db, {
      onInstallStep(step) {
        if (step === 'case:1') throw new Error('Injected storage failure');
      },
    });

    const prepared = await installer.prepare(source(pack));
    await expect(installer.install(prepared)).rejects.toThrow(
      'Injected storage failure',
    );

    expect(await db.count('caseVersions')).toBe(0);
    expect(await db.count('contentPacks')).toBe(0);
    expect(
      await new IndexedDbContentRepository(db).getActiveCatalog(),
    ).toBeUndefined();
    expect(await db.get('appMeta', 'user-owned-marker')).toEqual(
      expect.objectContaining({ value: { preserved: true } }),
    );
  });

  it('switches back to bundled content without deleting imported history or user data', async () => {
    const db = await openTestDatabase();
    const installer = new ContentInstaller(db);
    const imported = await createPack({ cases: [publishedCase('case-a')] });
    await installer.install(await installer.prepare(source(imported)));
    await db.put('attempts', {
      id: 'historical-attempt',
      userId: 'local-user',
      caseId: 'case-a',
      caseVersion: 1,
      schemaVersion: 1,
      status: 'in-progress',
      startedAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
      currentNodeId: 'case-a-node-01',
      criticalErrorIds: [],
      visitedNodeIds: ['case-a-node-01'],
      roundHistory: [],
    });
    const bundled = await createPack({
      cases: [],
      activeCases: [],
      contentVersion: '2.0.0',
    });
    bundled.manifest.packId = 'fde-arena-bundled';
    const { checksum: oldChecksum, ...manifestWithoutChecksum } =
      bundled.manifest;
    void oldChecksum;
    bundled.manifest.checksum = await sha256Content({
      ...bundled,
      manifest: manifestWithoutChecksum,
    });

    await installer.install(
      await installer.prepare(source(bundled, 'bundled')),
    );

    const contentRepository = new IndexedDbContentRepository(db);
    expect(await contentRepository.getActiveCatalog()).toEqual(
      expect.objectContaining({
        packId: 'fde-arena-bundled',
        sourceKind: 'bundled',
      }),
    );
    expect(await db.get('caseVersions', ['case-a', 1])).toBeDefined();
    expect(await db.get('attempts', 'historical-attempt')).toEqual(
      expect.objectContaining({ caseId: 'case-a', caseVersion: 1 }),
    );
  });

  it('rejects an unknown future case schema before writing anything', async () => {
    const db = await openTestDatabase();
    const pack = await createPack({ cases: [publishedCase('case-a')] });
    const future = structuredClone(pack) as unknown as {
      cases: Record<string, unknown>[];
    };
    future.cases[0]!.schemaVersion = 99;
    const installer = new ContentInstaller(db);

    await expect(
      installer.prepare(source(future as unknown as ContentPack)),
    ).rejects.toThrow(/unsupported case schema version 99/i);
    expect(await db.count('caseVersions')).toBe(0);
    expect(await db.count('contentPacks')).toBe(0);
  });

  it.each([
    '<script>globalThis.pwned = true</script>',
    '<img src=x onerror="globalThis.pwned = true">',
    '[open me](javascript:globalThis.pwned=true)',
  ])(
    'rejects untrusted executable content before installation: %s',
    async (payload) => {
      const db = await openTestDatabase();
      const pack = await createPack({ cases: [publishedCase('case-a')] });
      pack.cases[0]!.title = payload;
      const installer = new ContentInstaller(db);

      await expect(installer.prepare(source(pack))).rejects.toThrow(/unsafe/i);
      expect(await db.count('caseVersions')).toBe(0);
      expect(Reflect.get(globalThis, 'pwned')).not.toBe(true);
    },
  );

  it('keeps deprecated definitions available for historical mastery labels', async () => {
    const db = await openTestDatabase();
    const installer = new ContentInstaller(db);
    const first = await createPack({ cases: [publishedCase('case-a')] });
    await installer.install(await installer.prepare(source(first)));
    await db.put('mastery', {
      userId: 'local-user',
      skillId: skill.id,
      score: 72,
      sampleCount: 2,
      updatedAt: '2026-07-13T00:00:00.000Z',
    });
    const deprecatedDomain = { ...domain, status: 'deprecated' as const };
    const deprecatedSkill = { ...skill, status: 'deprecated' as const };
    const second = await createPack({
      cases: [],
      activeCases: [],
      contentVersion: '2.0.0',
      domains: [deprecatedDomain],
      skills: [deprecatedSkill],
    });
    await installer.install(await installer.prepare(source(second)));

    const contentRepository = new IndexedDbContentRepository(db);
    expect(await contentRepository.listActiveSkills()).toEqual([]);
    expect(await contentRepository.findSkillDefinition(skill.id)).toEqual(
      expect.objectContaining({ label: skill.label, status: 'deprecated' }),
    );
    expect(await db.get('mastery', ['local-user', skill.id])).toEqual(
      expect.objectContaining({ score: 72 }),
    );
  });

  it('rejects a future manifest schema before any partial write', async () => {
    const db = await openTestDatabase();
    const pack = await createPack({ cases: [publishedCase('case-a')] });
    pack.manifest.schemaVersion = 99;
    const installer = new ContentInstaller(db);

    await expect(installer.prepare(source(pack))).rejects.toThrow(
      /unsupported content schema version 99/i,
    );
    expect(await db.count('caseVersions')).toBe(0);
    expect(await db.count('contentPacks')).toBe(0);
  });
});
