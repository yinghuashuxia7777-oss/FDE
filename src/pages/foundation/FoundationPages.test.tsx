/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ProductRepositories } from '../../application/product';
import type { ConceptSource } from '../../content/concept-source';
import type { FoundationSource } from '../../content/foundation-source';
import type { ConceptKnowledge } from '../../domain/concepts/types';
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

const relatedConcept: ConceptKnowledge = {
  schemaVersion: 1,
  id: 'concept.api',
  type: 'concept',
  category: 'api-backend',
  order: 1,
  title: 'API：系统之间的可验证协作边界',
  technicalTerm: 'API',
  simpleExplanation: 'API 是两个系统约定如何交换请求与结果的边界。',
  analogy: '像餐厅菜单，明确可点什么、如何点以及会返回什么。',
  technicalExplanation: 'API 契约定义输入、输出、错误与兼容规则。',
  whyItMatters: 'FDE 需要沿接口边界定位客户系统与产品之间的问题。',
  commonMistakes: '不要把能连通误认为业务契约已经满足。',
  relatedFoundation: ['api-basic'],
  relatedCases: ['case-active'],
};

function concepts(
  loadAll: () => Promise<readonly ConceptKnowledge[]> = () =>
    Promise.resolve([relatedConcept]),
): ConceptSource {
  return {
    loadAll: vi.fn(loadAll),
    findById: vi.fn().mockResolvedValue(undefined),
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
    const { container } = render(
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
    const overview = container.querySelector('.foundation-library-overview');
    expect(overview).not.toBeNull();
    const overall = screen.getByRole('region', {
      name: 'Overall progress',
    });
    expect(overview).toContainElement(overall);
    expect(overview).toContainElement(
      screen.getByRole('region', { name: 'Foundation item 2' }),
    );
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
    expect(computer).toHaveClass('foundation-track--computer-basics');
    expect(network).toHaveClass('foundation-track--network-api');
    expect(ai).toHaveClass('foundation-track--ai-basics');
    expect(computer).toHaveAttribute('data-track', 'computer-basics');
    expect(network).toHaveAttribute('data-track', 'network-api');
    expect(ai).toHaveAttribute('data-track', 'ai-basics');
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
    expect(
      container.querySelector('.foundation-card[data-status="mastered"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('.foundation-card[data-status="learning"]'),
    ).not.toBeNull();
  });

  it('renders authored sections explicitly and joins active Skills and Cases by ID', async () => {
    const { container } = render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            conceptSource={concepts()}
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
    const detailLayout = container.querySelector('.foundation-detail-layout');
    const article = detailLayout?.querySelector(':scope > article');
    const aside = detailLayout?.querySelector(':scope > aside');
    expect(detailLayout).not.toBeNull();
    expect(article).not.toBeNull();
    expect(aside).not.toBeNull();
    const chapterNavigation = screen.getByRole('navigation', {
      name: 'Foundation chapters',
    });
    expect(
      within(chapterNavigation).getByRole('link', {
        name: 'Simple explanation',
      }),
    ).toHaveAttribute('href', '#foundation-chapter-simple-explanation');
    expect(
      within(chapterNavigation).getByRole('link', {
        name: 'Common mistakes',
      }),
    ).toHaveAttribute('href', '#foundation-chapter-common-mistakes');
    expect(
      Array.from(
        article?.querySelectorAll('[data-foundation-chapter]') ?? [],
      ).map((section) => section.getAttribute('data-foundation-chapter')),
    ).toEqual([
      'simple-explanation',
      'analogy',
      'technical-explanation',
      'example',
      'common-mistakes',
    ]);
    expect(
      article?.querySelector('#foundation-chapter-simple-explanation'),
    ).not.toBeNull();
    expect(
      within(article as HTMLElement)
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
      screen.getByText('Current knowledge: 作者编写的 API 基础'),
    ).toBeVisible();
    expect(screen.getByText('Recommended practice')).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'Related Concepts' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'API：系统之间的可验证协作边界（API）',
      }),
    ).toBeVisible();
    const conceptNextStep = screen.getByRole('region', {
      name: 'Active API incident',
    });
    expect(conceptNextStep).toHaveTextContent(
      'After understanding these engineering concepts, challenge:',
    );
    expect(
      within(conceptNextStep).getByRole('link', {
        name: 'Challenge Case: Active API incident',
      }),
    ).toHaveAttribute('href', '/training/case-active');
    expect(
      screen.getByRole('link', { name: 'Start Case: Active API incident' }),
    ).toHaveAttribute('href', '/training/case-active');
    expect(aside).toContainElement(
      screen.getByRole('link', { name: 'Start Case: Active API incident' }),
    );
    expect(screen.queryByText('case-deprecated')).not.toBeInTheDocument();
    expect(screen.queryByText('case-missing')).not.toBeInTheDocument();
    const nextStep = screen.getByRole('region', {
      name: 'Foundation item 2',
    });
    expect(nextStep).toHaveTextContent(
      'After understanding this knowledge, continue with:',
    );
    expect(
      within(nextStep).getByRole('link', { name: 'Learn Foundation item 2' }),
    ).toHaveAttribute('href', '/foundation/foundation-item-02');
  });

  it('explains that reading and guide completion do not create Mastery evidence', async () => {
    const repository = repositories();
    vi.mocked(repository.attempts.list).mockResolvedValue([]);
    vi.mocked(repository.skills.list).mockResolvedValue([]);
    const { container } = render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            conceptSource={concepts(() => Promise.resolve([]))}
            foundationId="api-basic"
            foundationSource={source([foundationItem(1, 'computer-basics')])}
            repositories={repository}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: '作者编写的 API 基础' }),
    ).toBeVisible();
    const readingNote = screen.getByRole('note', {
      name: 'Reading and Mastery',
    });
    expect(readingNote).toHaveTextContent(
      'Reading helps you understand the concept',
    );
    expect(readingNote).toHaveTextContent('does not directly increase Mastery');
    expect(readingNote).toHaveTextContent(
      'Completing this guide does not mean the skill is mastered',
    );
    expect(readingNote).toHaveTextContent(
      'Training evidence from a related Case updates your capabilities',
    );
    const facts = container.querySelector('.foundation-facts');
    expect(facts).not.toBeNull();
    expect(within(facts as HTMLElement).getByText('Not started')).toBeVisible();
    expect(repository.attempts.save).not.toHaveBeenCalled();
    expect(repository.skills.save).not.toHaveBeenCalled();
    expect(repository.skills.saveMany).not.toHaveBeenCalled();
    expect(repository.progress.commitCompletion).not.toHaveBeenCalled();
  });

  it('keeps authored Foundation content usable when the optional next-step source fails', async () => {
    const failingSource = source();
    vi.mocked(failingSource.loadAll).mockRejectedValue(
      new Error('Foundation recommendation unavailable'),
    );

    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            foundationId="api-basic"
            foundationSource={failingSource}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByText(authoredContent.technicalExplanation),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Start Case: Active API incident' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'Foundation item 2' }),
    ).not.toBeInTheDocument();
  });

  it('fails open when optional Foundation and Concept sidecars throw synchronously', async () => {
    const throwingFoundationSource = source();
    vi.mocked(throwingFoundationSource.loadAll).mockImplementation(() => {
      throw new Error('Synchronous Foundation sidecar failure');
    });
    const throwingConceptSource = concepts(() => {
      throw new Error('Synchronous Concept sidecar failure');
    });

    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            conceptSource={throwingConceptSource}
            foundationId="api-basic"
            foundationSource={throwingFoundationSource}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByText(authoredContent.technicalExplanation),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Start Case: Active API incident' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Related Concepts' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Foundation item 2' }),
    ).not.toBeInTheDocument();
  });

  it('fails open when related Concepts cannot load', async () => {
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            conceptSource={concepts(() =>
              Promise.reject(new Error('Concept source unavailable')),
            )}
            foundationId="api-basic"
            foundationSource={source()}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByText(authoredContent.technicalExplanation),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Start Case: Active API incident' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Related Concepts' }),
    ).not.toBeInTheDocument();
  });

  it('renders Foundation content without waiting for a slow Concept source', async () => {
    const neverLoads = new Promise<readonly ConceptKnowledge[]>(() => {
      // Intentionally unresolved: the sidecar cannot block authored content.
    });
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <FoundationDetailPage
            conceptSource={concepts(() => neverLoads)}
            foundationId="api-basic"
            foundationSource={source()}
            repositories={repositories()}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByText(authoredContent.technicalExplanation),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Related Concepts' }),
    ).not.toBeInTheDocument();
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
