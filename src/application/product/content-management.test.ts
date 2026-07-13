import type { ContentSource } from '../../content/contracts';
import type {
  ContentInstaller,
  PreparedContentInstallation,
} from '../../content/installer';
import type { ContentRepository } from '../../repositories/contracts';
import {
  ContentManagementService,
  type ContentStatus,
} from './content-management';

const checksum = `sha256:${'0'.repeat(64)}`;

function catalog(sourceKind: 'bundled' | 'file') {
  return {
    packId: 'fde-arena-bundled',
    contentVersion: '1.0.0',
    schemaVersion: 1,
    sourceKind,
    activeCases: [],
    activeDomainIds: [],
    activeSkillIds: [],
    installedAt: '2026-07-13T00:00:00.000Z',
    checksum,
  } as const;
}

function repository(
  active: ReturnType<typeof catalog> | undefined,
): ContentRepository {
  return {
    getActiveCatalog: vi.fn().mockResolvedValue(active),
    getActivePack: vi.fn().mockResolvedValue(undefined),
    getInstalledPack: vi.fn().mockResolvedValue(undefined),
    listInstalledPacks: vi.fn().mockResolvedValue([]),
    countHistoricalCaseVersions: vi.fn().mockResolvedValue(0),
    listActiveDomains: vi.fn().mockResolvedValue([]),
    listActiveSkills: vi.fn().mockResolvedValue([]),
    findDomainDefinition: vi.fn().mockResolvedValue(undefined),
    findSkillDefinition: vi.fn().mockResolvedValue(undefined),
  };
}

function harness(active: ReturnType<typeof catalog> | undefined) {
  const prepared = {} as PreparedContentInstallation;
  const pack = {
    manifest: { contentVersion: '1.0.0' },
  } as Awaited<ReturnType<ContentSource['loadPack']>>;
  const loadPack = vi.fn().mockResolvedValue(pack);
  const source: ContentSource = {
    sourceKind: 'bundled',
    loadPack,
  };
  const prepare = vi.fn().mockResolvedValue(prepared);
  const install = vi.fn().mockResolvedValue(catalog('bundled'));
  const installer = {
    prepare,
    install,
  } as unknown as ContentInstaller;
  const contentRepository = repository(active);
  const service = new ContentManagementService(
    contentRepository,
    installer,
    source,
    () => '2026-07-13T01:00:00.000Z',
  );
  return {
    contentRepository,
    install,
    loadPack,
    prepare,
    prepared,
    service,
    source,
  };
}

describe('ContentManagementService bootstrap boundary', () => {
  it('installs bundled content when no active catalog exists', async () => {
    const { install, loadPack, prepare, prepared, service, source } =
      harness(undefined);

    await service.ensureBundledInitialized();

    expect(loadPack).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith(source);
    expect(install).toHaveBeenCalledWith(prepared);
  });

  it('never replaces an active file catalog during bundled bootstrap', async () => {
    const { install, loadPack, prepare, service } = harness(catalog('file'));

    await service.ensureBundledInitialized();

    expect(loadPack).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  it('exports manifest status without case bodies or user records', async () => {
    const { contentRepository, service } = harness(catalog('bundled'));
    contentRepository.countHistoricalCaseVersions = vi
      .fn()
      .mockResolvedValue(7);

    const exported = await service.exportStatus();

    expect(exported).toEqual(
      expect.objectContaining({
        exportedAt: '2026-07-13T01:00:00.000Z',
        historicalCaseVersionCount: 7,
      }),
    );
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain('"nodes"');
    expect(serialized).not.toContain('"attempts"');
    expect(serialized).not.toContain('"progress"');
  });

  it('reports checksum agreement from one repository snapshot', async () => {
    const contentRepository = repository(catalog('bundled'));
    contentRepository.getActivePack = vi.fn().mockResolvedValue({
      packId: 'fde-arena-bundled',
      contentVersion: '1.0.0',
      schemaVersion: 1,
      sourceKind: 'bundled',
      manifest: { checksum } as never,
      domains: [],
      skills: [],
      coverage: {} as never,
      installedAt: '2026-07-13T00:00:00.000Z',
      checksum,
    });
    const service = new ContentManagementService(
      contentRepository,
      {} as ContentInstaller,
    );

    await expect(service.getStatus()).resolves.toEqual(
      expect.objectContaining<Partial<ContentStatus>>({
        checksumMatchesCatalog: true,
      }),
    );
  });
});
