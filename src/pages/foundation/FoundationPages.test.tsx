/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ProductRepositories } from '../../application/product';
import type { FoundationSource } from '../../content/foundation-source';
import type {
  FoundationKnowledge,
  FoundationTrack,
} from '../../domain/foundation/types';
import { I18nProvider } from '../../i18n';
import type {
  CaseSummary,
  CompletedAttemptRecord,
  ContentRepository,
} from '../../repositories/contracts';
import { FoundationDetailPage, FoundationLibraryPage } from './index';

const authoredContent = {
  simpleExplanation: '这是作者编写的中文简单解释，不应随着英文界面被翻译。',
  analogy: '这个类比通过日常场景说明系统边界，也应保持作者原文。',
  technicalExplanation: '技术解释描述稳定标识、运行契约和验证证据之间的关系。',
  example: '示例展示客户现场如何根据证据定位问题并安全验证修复。',
  commonMistakes: '常见错误是只处理表面症状，却没有确认根因和回归结果。',
};

function foundationItem(
  order: number,
  track: FoundationTrack,
): FoundationKnowledge {
  const primary = order === 1;
  const learning = order === 2;
  return {
    schemaVersion: 1,
    id: primary
      ? 'api-basic'
      : `foundation-item-${String(order).padStart(2, '0')}`,
    type: 'foundation',
    title: primary ? '作者编写的 API 基础' : `Foundation item ${order}`,
    domain:
      track === 'computer-basics'
        ? 'computer-basics'
        : track === 'network-api'
          ? 'network'
          : 'ai-basics',
    track,
    skills: [
      primary
        ? 'api.integration'
        : learning
          ? 'software.foundations'
          : `skill.${order}`,
    ],
    level: order > 20 ? 'intermediate' : 'beginner',
    order,
    estimatedMinutes: 8,
    content: authoredContent,
    relatedCases: primary
      ? ['case-active', 'case-deprecated', 'case-missing']
      : [learning ? 'case-learning' : `case-${order}`],
  };
}

function thirtyItems(): FoundationKnowledge[] {
  return Array.from({ length: 30 }, (_, index) => {
    const order = index + 1;
    const track: FoundationTrack =
      order <= 10
        ? 'computer-basics'
        : order <= 20
          ? 'network-api'
          : 'ai-basics';
    return foundationItem(order, track);
  });
}

function source(items = thirtyItems()): FoundationSource {
  return {
    loadAll: vi.fn().mockResolvedValue(items),
    findById: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(items.find((item) => item.id === id)),
      ),
  };
}

function caseSummary(
  id: string,
  status: CaseSummary['status'] = 'published',
): CaseSummary {
  return {
    id,
    slug: id,
    title: id === 'case-active' ? 'Active API incident' : id,
    summary: 'A related FDE decision scenario.',
    scenarioSummary: 'A related FDE decision scenario.',
    level: 'beginner',
    status,
    version: 1,
    estimatedMinutes: 10,
    domains: ['api-integration'],
    skills: ['api.integration'],
    riskTypes: ['operational'],
    technicalLayers: ['application'],
    nodeTypes: ['single-choice'],
  };
}

function completedAttempt(): CompletedAttemptRecord {
  return {
    id: 'attempt-pass',
    userId: 'local-user',
    caseId: 'case-active',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-14T08:00:00.000Z',
    updatedAt: '2026-07-14T08:10:00.000Z',
    completedAt: '2026-07-14T08:10:00.000Z',
    currentNodeId: null,
    score: 80,
    verdict: 'pass',
    criticalErrorIds: [],
    visitedNodeIds: [],
    roundHistory: [],
  };
}

function repositories(): ProductRepositories {
  const content: ContentRepository = {
    getActiveCatalog: vi.fn().mockResolvedValue(undefined),
    getActivePack: vi.fn().mockResolvedValue(undefined),
    getInstalledPack: vi.fn().mockResolvedValue(undefined),
    listInstalledPacks: vi.fn().mockResolvedValue([]),
    countHistoricalCaseVersions: vi.fn().mockResolvedValue(0),
    listActiveDomains: vi.fn().mockResolvedValue([]),
    listActiveSkills: vi.fn().mockResolvedValue([
      {
        schemaVersion: 1,
        id: 'api.integration',
        domainId: 'api-integration',
        label: 'API integration',
        description: 'Build reliable API integrations.',
        status: 'active',
      },
      {
        schemaVersion: 1,
        id: 'software.foundations',
        domainId: 'software-foundations',
        label: 'Software foundations',
        description: 'Build reliable software.',
        status: 'active',
      },
    ]),
    findDomainDefinition: vi.fn().mockResolvedValue(undefined),
    findSkillDefinition: vi.fn().mockResolvedValue(undefined),
  };
  return {
    attempts: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([completedAttempt()]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue([]),
      listActive: vi
        .fn()
        .mockResolvedValue([
          caseSummary('case-active'),
          caseSummary('case-deprecated', 'deprecated'),
        ]),
      getVersion: vi.fn().mockResolvedValue(undefined),
      seed: vi.fn(),
    },
    content,
    contentManagement: {} as ProductRepositories['contentManagement'],
    mistakes: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    progress: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      commitCompletion: vi.fn(),
      clear: vi.fn(),
      exportUserData: vi.fn(),
      replaceUserData: vi.fn(),
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
    },
    skills: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([
        {
          userId: 'local-user',
          skillId: 'api.integration',
          score: 72,
          sampleCount: 2,
          updatedAt: '2026-07-14T08:10:00.000Z',
        },
        {
          userId: 'local-user',
          skillId: 'software.foundations',
          score: 35,
          sampleCount: 1,
          updatedAt: '2026-07-14T08:10:00.000Z',
        },
      ]),
      save: vi.fn(),
      saveMany: vi.fn(),
    },
  };
}

describe('Foundation pages', () => {
  it('groups 10/10/10 dynamically, derives progress, and keeps stable links', async () => {
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationLibraryPage
            foundationSource={source()}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Foundation Knowledge' }),
    ).toBeVisible();
    const overall = screen.getByRole('region', {
      name: 'Overall progress',
    });
    expect(within(overall).getByText('1 / 30 mastered')).toBeVisible();
    expect(within(overall).getByRole('progressbar')).toHaveAttribute(
      'value',
      '1',
    );
    expect(within(overall).getByRole('progressbar')).toHaveAttribute(
      'max',
      '30',
    );
    const computer = screen.getByRole('region', { name: 'Computer basics' });
    const network = screen.getByRole('region', { name: 'Network and API' });
    const ai = screen.getByRole('region', { name: 'AI basics' });
    expect(within(computer).getAllByRole('article')).toHaveLength(10);
    expect(within(network).getAllByRole('article')).toHaveLength(10);
    expect(within(ai).getAllByRole('article')).toHaveLength(10);
    expect(within(computer).getByText('1 / 10 mastered')).toBeVisible();
    expect(within(computer).getByRole('progressbar')).toHaveAttribute(
      'value',
      '1',
    );
    expect(
      screen.getByRole('link', { name: '作者编写的 API 基础' }),
    ).toHaveAttribute('href', '/foundation/api-basic');
    expect(
      screen.getByRole('link', { name: 'Continue learning' }),
    ).toHaveAttribute('href', '/foundation/foundation-item-02');
    expect(screen.getByText('Mastered')).toBeVisible();
    expect(screen.getByText('Learning')).toBeVisible();
  });

  it('renders authored sections explicitly and joins active Skills and Cases by ID', async () => {
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            foundationId="api-basic"
            foundationSource={source()}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: '作者编写的 API 基础' }),
    ).toBeVisible();
    expect(screen.getByText(authoredContent.simpleExplanation)).toBeVisible();
    const article = screen.getByRole('article');
    expect(
      within(article)
        .getAllByRole('heading', { level: 2 })
        .slice(0, 5)
        .map((heading) => heading.textContent),
    ).toEqual([
      'Simple explanation',
      'Analogy',
      'Technical explanation',
      'Example',
      'Common mistakes',
    ]);
    expect(screen.getByText('API integration')).toBeVisible();
    expect(screen.getByText('72 / 100')).toBeVisible();
    expect(screen.getByText('Competent')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Start Case: Active API incident' }),
    ).toHaveAttribute('href', '/training/case-active');
    expect(screen.queryByText('case-deprecated')).not.toBeInTheDocument();
    expect(screen.queryByText('case-missing')).not.toBeInTheDocument();
  });

  it('keeps knowledge readable when a related Case is absent from the active pack', async () => {
    const item = {
      ...foundationItem(1, 'computer-basics'),
      relatedCases: ['third-party-case-not-installed'],
    };
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            foundationId="api-basic"
            foundationSource={source([item])}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByText(authoredContent.technicalExplanation),
    ).toBeVisible();
    expect(screen.getByText('No active related case.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /third-party/i })).toBeNull();
  });

  it('shows an explicit not-found state for an unknown stable ID', async () => {
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            foundationId="missing-foundation"
            foundationSource={source()}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Foundation item not found',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Back to Foundation Knowledge' }),
    ).toHaveAttribute('href', '/foundation');
  });

  it('replaces the loading heading with an explicit unavailable heading on failure', async () => {
    const failingRepositories = repositories();
    vi.mocked(failingRepositories.skills.list).mockRejectedValue(
      new Error('Repository unavailable'),
    );

    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            foundationId="api-basic"
            foundationSource={source()}
            repositories={failingRepositories}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Foundation Knowledge unavailable',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'Loading Foundation Knowledge',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
