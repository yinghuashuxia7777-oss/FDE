import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  ContentStatus,
  PreparedContentInstallation,
  ProductRepositories,
} from '../../application/product';
import type { CaseLevel } from '../../domain/cases/types';
import type { CaseSummary } from '../../repositories/contracts';
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher';
import { I18nProvider } from '../../i18n';
import { SettingsPage } from './SettingsPage';

const checksum = `sha256:${'0'.repeat(64)}`;

function caseSummary(
  id: string,
  level: CaseLevel,
  domains: string[],
): CaseSummary {
  return {
    id,
    slug: id,
    title: id,
    summary: id,
    level,
    status: 'published',
    version: 1,
    estimatedMinutes: 15,
    domains,
    skills: [],
    riskTypes: [],
    scenarioSummary: id,
    technicalLayers: ['application'],
    nodeTypes: ['single-choice'],
  };
}

function activeCaseSummaries(): CaseSummary[] {
  return [
    ...Array.from({ length: 12 }, (_, index) =>
      caseSummary(`beginner-${String(index + 1)}`, 'beginner', ['rag-search']),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      caseSummary(`intermediate-rag-${String(index + 1)}`, 'intermediate', [
        'rag-search',
      ]),
    ),
    ...Array.from({ length: 2 }, (_, index) =>
      caseSummary(`intermediate-api-${String(index + 1)}`, 'intermediate', [
        'api-integration',
      ]),
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      caseSummary(`advanced-${String(index + 1)}`, 'advanced', [
        'api-integration',
      ]),
    ),
  ];
}

function contentStatus(): ContentStatus {
  const activeCases = activeCaseSummaries();
  const manifest = {
    packId: 'fde-arena-bundled',
    displayName: 'FDE Arena 内置题库',
    contentVersion: '1.0.0',
    schemaVersion: 1,
    releasedAt: '2026-07-13T00:00:00.000Z',
    activePublishedCaseCount: activeCases.length,
    caseVersionCount: activeCases.length,
    activeCases: activeCases.map(({ id }) => ({ caseId: id, version: 1 })),
    activeCaseIds: activeCases.map(({ id }) => id),
    allCaseIds: activeCases.map(({ id }) => id),
    domains: ['rag-search', 'api-integration', 'reliability'],
    domainCaseCounts: {
      'rag-search': 18,
      'api-integration': 6,
      reliability: 0,
    },
    cases: [],
    checksum,
  };
  return {
    catalog: {
      packId: manifest.packId,
      contentVersion: manifest.contentVersion,
      schemaVersion: 1,
      sourceKind: 'bundled',
      activeCases: manifest.activeCases,
      activeDomainIds: ['rag-search', 'api-integration', 'reliability'],
      activeSkillIds: ['rag.search'],
      installedAt: '2026-07-13T00:01:00.000Z',
      checksum,
    },
    pack: {
      packId: manifest.packId,
      contentVersion: manifest.contentVersion,
      schemaVersion: 1,
      sourceKind: 'bundled',
      manifest,
      domains: [
        {
          schemaVersion: 1,
          id: 'rag-search',
          label: 'RAG and enterprise search',
          description: 'Retrieval systems.',
          status: 'active',
        },
        {
          schemaVersion: 1,
          id: 'api-integration',
          label: 'API integration',
          description: 'HTTP and service integration.',
          status: 'active',
        },
        {
          schemaVersion: 1,
          id: 'reliability',
          label: 'Reliability',
          description: 'Observability and reliable operations.',
          status: 'active',
        },
      ],
      skills: [],
      coverage: {
        schemaVersion: 1,
        targetCaseCount: 362,
        domains: [
          { domainId: 'rag-search', targetCaseCount: 25 },
          { domainId: 'api-integration', targetCaseCount: 24 },
          { domainId: 'reliability', targetCaseCount: 24 },
        ],
      },
      installedAt: '2026-07-13T00:01:00.000Z',
      checksum,
    },
    historicalCaseVersionCount: 7,
    checksumMatchesCatalog: true,
  };
}

function management(status = contentStatus()) {
  return {
    getStatus: vi.fn().mockResolvedValue(status),
    prepareFile: vi.fn(),
    install: vi.fn(),
    restoreBundled: vi.fn(),
    ensureBundledInitialized: vi.fn(),
    exportStatus: vi.fn(),
  };
}

type TestRepositories = ProductRepositories & {
  listActiveMock: ReturnType<typeof vi.fn>;
};

function repositories(cases = activeCaseSummaries()): TestRepositories {
  const listActiveMock = vi.fn().mockResolvedValue(cases);
  return {
    listActiveMock,
    cases: {
      list: vi.fn().mockResolvedValue(cases),
      listActive: listActiveMock,
      getVersion: vi.fn(),
      seed: vi.fn(),
    },
    progress: {
      get: vi.fn(),
      list: vi.fn(),
      commitCompletion: vi.fn(),
      clear: vi.fn(),
      exportUserData: vi.fn().mockResolvedValue({
        userId: 'local-user',
        attempts: [],
        progress: [],
        mastery: [],
        mistakes: [],
        settings: null,
      }),
      replaceUserData: vi.fn(),
    },
  } as unknown as TestRepositories;
}

function prepared(): PreparedContentInstallation {
  const status = contentStatus();
  return {
    pack: {
      formatVersion: 1,
      manifest: status.pack!.manifest,
      cases: [],
      domains: status.pack!.domains,
      skills: status.pack!.skills,
      coverage: status.pack!.coverage,
    },
    sourceKind: 'file',
    preview: {
      packId: 'imported-pack',
      displayName: 'Imported review pack',
      contentVersion: '2.0.0',
      schemaVersion: 1,
      sourceKind: 'file',
      activeCaseCount: 4,
      caseVersionCount: 5,
      newCaseVersionCount: 5,
      existingCaseVersionCount: 0,
      domainCount: 2,
      skillCount: 4,
      releasedAt: '2026-07-13T02:00:00.000Z',
      checksum,
    },
  };
}

describe('SettingsPage content management', () => {
  it('keeps Settings radios synchronized with the shared language control', async () => {
    const user = userEvent.setup();
    const contentManagement = management();
    contentManagement.restoreBundled.mockResolvedValue(undefined);
    render(
      <I18nProvider initialLanguage="zh-CN">
        <LanguageSwitcher />
        <SettingsPage
          contentManagement={contentManagement}
          repositories={repositories()}
        />
      </I18nProvider>,
    );

    expect(await screen.findByRole('heading', { name: '设置' })).toBeVisible();
    expect(screen.getByRole('radio', { name: '简体中文' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: '恢复内置内容' }));
    expect(
      await screen.findByText('已恢复内置内容，用户历史保持不变。'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(
      screen.getByRole('button', { name: 'English', pressed: true }),
    ).toBeVisible();
    expect(
      screen.getByText('Bundled content restored without deleting history.'),
    ).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Simplified Chinese' }));

    expect(screen.getByRole('heading', { name: '设置' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: '简体中文', pressed: true }),
    ).toBeVisible();
  });

  it('shows active manifest, source, checksum, history, and per-domain counts', async () => {
    render(
      <SettingsPage
        contentManagement={management()}
        repositories={repositories()}
      />,
    );

    expect(await screen.findByText('FDE Arena 内置题库')).toBeVisible();
    expect(screen.getByText('fde-arena-bundled')).toBeVisible();
    expect(screen.getByText('1.0.0')).toBeVisible();
    expect(screen.getByText('bundled')).toBeVisible();
    expect(screen.getByText(/verified/i)).toBeVisible();
    const history = screen.getByText('Historical case versions').closest('div');
    expect(history).not.toBeNull();
    expect(within(history!).getByText('7')).toBeVisible();
    const domain = screen.getByText('RAG and enterprise search').closest('tr');
    expect(domain).not.toBeNull();
    expect(within(domain!).getByText('18')).toBeVisible();
  });

  it('derives level and coverage progress from the active cases and content pack', async () => {
    const source = repositories();
    render(
      <SettingsPage contentManagement={management()} repositories={source} />,
    );

    const heading = await screen.findByRole('heading', {
      name: /content coverage/i,
    });
    const coverage = heading.closest('section');
    expect(coverage).not.toBeNull();

    const active = within(coverage!).getByText('Active cases').closest('div');
    const beginner = within(coverage!).getByText('Beginner').closest('div');
    const intermediate = within(coverage!)
      .getByText('Intermediate')
      .closest('div');
    const advanced = within(coverage!).getByText('Advanced').closest('div');
    expect(within(active!).getByText('24')).toBeVisible();
    expect(within(beginner!).getByText('12')).toBeVisible();
    expect(within(intermediate!).getByText('8')).toBeVisible();
    expect(within(advanced!).getByText('4')).toBeVisible();

    expect(within(coverage!).getByText('24 / 362')).toBeVisible();
    expect(within(coverage!).getByText(/338 remaining/i)).toBeVisible();
    expect(within(coverage!).getByText('7%')).toBeVisible();
    expect(
      within(coverage!).getByRole('progressbar', {
        name: /overall content coverage/i,
      }),
    ).toHaveAttribute('value', '24');
    expect(
      within(coverage!).getByRole('progressbar', {
        name: /overall content coverage/i,
      }),
    ).toHaveAttribute('max', '362');

    const rag = within(coverage!)
      .getByText('RAG and enterprise search')
      .closest('tr');
    expect(within(rag!).getByText('18')).toBeVisible();
    expect(within(rag!).getByText('25')).toBeVisible();
    expect(within(rag!).getByText('7')).toBeVisible();
    const api = within(coverage!).getByText('API integration').closest('tr');
    expect(within(api!).getByText('6')).toBeVisible();
    expect(within(api!).getByText('24')).toBeVisible();
    expect(within(api!).getByText('18')).toBeVisible();
    const reliability = within(coverage!)
      .getByText('Reliability')
      .closest('tr');
    expect(within(reliability!).getByText('0')).toBeVisible();
    expect(within(reliability!).getAllByText('24')).toHaveLength(2);
    expect(source.listActiveMock.mock.calls).toEqual([[]]);
  });

  it('includes an expert level when the active content pack provides one', async () => {
    const source = repositories([
      ...activeCaseSummaries(),
      caseSummary('expert-1', 'expert', ['reliability']),
    ]);
    render(
      <SettingsPage contentManagement={management()} repositories={source} />,
    );

    const heading = await screen.findByRole('heading', {
      name: /content coverage/i,
    });
    const expert = within(heading.closest('section')!)
      .getByText('Expert')
      .closest('div');
    expect(within(expert!).getByText('1')).toBeVisible();
  });

  it('keeps settings usable when no active content catalog exists', async () => {
    const source = repositories([]);
    render(
      <SettingsPage
        contentManagement={management({
          catalog: undefined,
          pack: undefined,
          historicalCaseVersionCount: 0,
          checksumMatchesCatalog: false,
        })}
        repositories={source}
      />,
    );

    expect(
      await screen.findByText(/no content catalog is active/i),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: /export content status/i }),
    ).toBeVisible();
    expect(source.listActiveMock).toHaveBeenCalledOnce();
  });

  it('previews a local content pack and installs only after confirmation', async () => {
    const user = userEvent.setup();
    const service = management();
    vi.mocked(service.prepareFile).mockResolvedValue(prepared());
    vi.mocked(service.install).mockResolvedValue(contentStatus().catalog!);
    render(
      <SettingsPage
        contentManagement={service}
        repositories={repositories()}
      />,
    );

    const file = new File(['{}'], 'content-pack.json', {
      type: 'application/json',
    });
    await user.upload(
      await screen.findByLabelText(/select content pack/i),
      file,
    );

    expect(await screen.findByText('Imported review pack')).toBeVisible();
    expect(vi.mocked(service.install)).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: /install content pack/i }),
    );
    expect(vi.mocked(service.install)).toHaveBeenCalledWith(
      expect.objectContaining({ sourceKind: 'file' }),
    );
  });

  it('keeps restore, content import, and user progress controls explicitly separate', async () => {
    const user = userEvent.setup();
    const service = management();
    vi.mocked(service.restoreBundled).mockResolvedValue(
      contentStatus().catalog!,
    );
    render(
      <SettingsPage
        contentManagement={service}
        repositories={repositories()}
      />,
    );

    expect(await screen.findByLabelText(/select content pack/i)).toBeVisible();
    expect(screen.getByLabelText(/select user progress backup/i)).toBeVisible();
    expect(
      screen.getByRole('button', { name: /export user progress/i }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: /restore bundled content/i }),
    );
    expect(vi.mocked(service.restoreBundled)).toHaveBeenCalledTimes(1);
  });
});
