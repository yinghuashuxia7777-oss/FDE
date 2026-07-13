/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  useLocation,
} from 'react-router-dom';

import type {
  ContentManagement,
  ProductRepositories,
} from '../application/product';
import type { FoundationSource } from '../content/foundation-source';
import type { FoundationKnowledge } from '../domain/foundation/types';
import type {
  CaseProgressRecord,
  CaseSummary,
  CompletedAttemptRecord,
  InProgressAttemptRecord,
} from '../repositories/contracts';
import type { ContentRepository } from '../repositories/contracts';
import { bundledDomains, bundledSkills } from '../generated/content-index';
import { I18nProvider } from '../i18n';
import { CaseLibraryPage } from './cases';
import { DashboardPage } from './dashboard';

function repositories(
  overrides: Partial<ProductRepositories> = {},
): ProductRepositories {
  const content: ContentRepository = {
    getActiveCatalog: vi.fn().mockResolvedValue(undefined),
    getActivePack: vi.fn().mockResolvedValue(undefined),
    getInstalledPack: vi.fn().mockResolvedValue(undefined),
    listInstalledPacks: vi.fn().mockResolvedValue([]),
    countHistoricalCaseVersions: vi.fn().mockResolvedValue(0),
    listActiveDomains: vi.fn().mockResolvedValue([...bundledDomains]),
    listActiveSkills: vi.fn().mockResolvedValue([...bundledSkills]),
    findDomainDefinition: vi.fn().mockResolvedValue(undefined),
    findSkillDefinition: vi.fn().mockResolvedValue(undefined),
  };
  return {
    attempts: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue([]),
      listActive: vi.fn().mockResolvedValue([]),
      getVersion: vi.fn().mockResolvedValue(undefined),
      seed: vi.fn(),
    },
    content,
    contentManagement: {} as ContentManagement,
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
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
    },
    skills: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      saveMany: vi.fn(),
    },
    ...overrides,
  };
}

function summary(
  id: string,
  overrides: Partial<CaseSummary> = {},
): CaseSummary {
  return {
    id,
    slug: id,
    title: id,
    summary: id,
    scenarioSummary: id,
    level: 'beginner',
    status: 'published',
    version: 1,
    estimatedMinutes: 10,
    domains: ['customer-discovery'],
    skills: ['requirements'],
    riskTypes: ['operational'],
    technicalLayers: ['application'],
    nodeTypes: ['single-choice'],
    ...overrides,
  };
}

function caseProgress(caseId: string): CaseProgressRecord {
  return {
    userId: 'local-user',
    caseId,
    caseVersion: 1,
    latestAttemptId: `${caseId}-attempt`,
    attemptCount: 1,
    completedCount: 1,
    highestScore: 80,
    latestScore: 80,
    latestVerdict: 'pass',
    hasCriticalError: false,
    updatedAt: '2026-07-13T00:00:00.000Z',
  };
}

function completedAttempt(
  caseId: string,
  completedAt = '2026-07-13T09:00:00.000Z',
): CompletedAttemptRecord {
  return {
    id: `${caseId}-today-attempt`,
    userId: 'local-user',
    caseId,
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-13T08:45:00.000Z',
    updatedAt: completedAt,
    completedAt,
    currentNodeId: null,
    score: 88,
    verdict: 'pass',
    criticalErrorIds: [],
    visitedNodeIds: [],
    roundHistory: [],
  };
}

function dashboardFoundationSource(): FoundationSource {
  const item: FoundationKnowledge = {
    schemaVersion: 1,
    id: 'api-basic',
    type: 'foundation',
    title: 'API foundation',
    domain: 'computer-basics',
    track: 'computer-basics',
    skills: ['api.integration'],
    level: 'beginner',
    order: 1,
    estimatedMinutes: 8,
    content: {
      simpleExplanation: 'A substantive authored explanation for the concept.',
      analogy: 'A substantive authored analogy for the concept.',
      technicalExplanation:
        'A substantive authored technical explanation for the concept.',
      example: 'A substantive authored applied example for the concept.',
      commonMistakes: 'A substantive authored description of common mistakes.',
    },
    relatedCases: ['case-active'],
  };
  return {
    loadAll: vi.fn().mockResolvedValue([item]),
    findById: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(id === item.id ? item : undefined),
      ),
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderCases(source: ProductRepositories, initialEntries = ['/cases']) {
  const router = createMemoryRouter(
    [
      {
        path: '/cases',
        element: (
          <>
            <CaseLibraryPage repositories={source} />
            <LocationProbe />
          </>
        ),
      },
    ],
    { initialEntries },
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Slice A product pages', () => {
  it('localizes program chrome while preserving Content Pack copy', async () => {
    const source = repositories();
    const authoredTitle = 'Content Pack authored title';
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('authored-case', { title: authoredTitle }),
    ]);

    const dashboard = render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <DashboardPage repositories={source} />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(await screen.findByRole('heading', { name: '首页' })).toBeVisible();
    expect(await screen.findByText(authoredTitle)).toBeVisible();
    expect(
      screen.getByText('今天继续训练一个尚未完成的 FDE 场景。'),
    ).toBeVisible();
    dashboard.unmount();

    render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <CaseLibraryPage repositories={source} />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: '案件库' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: authoredTitle })).toBeVisible();
    const passed = screen.getByRole('combobox', { name: '是否通过' });
    expect(
      within(passed).getByRole('option', { name: '已通过' }),
    ).toBeVisible();
  });

  it('shows today completion, review, estimate, and the first unfinished training CTA', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('completed-today', { title: 'Completed today' }),
      summary('risk-focus', {
        title: 'Risk focus',
        skills: ['risk-awareness'],
      }),
      summary('next-case', { title: 'Next case' }),
    ]);
    vi.mocked(source.attempts.list).mockResolvedValue([
      completedAttempt('completed-today'),
    ]);
    vi.mocked(source.mistakes.list).mockResolvedValue([
      {
        id: 'critical-history',
        userId: 'local-user',
        attemptId: 'historical-attempt',
        caseId: 'historical-case',
        caseVersion: 1,
        nodeId: 'historical-node',
        submission: { type: 'choice', selectedOptionIds: ['unsafe'] },
        correctSubmission: {
          type: 'choice',
          selectedOptionIds: ['safe'],
        },
        errorTypes: ['risk-awareness-gap'],
        evidenceIds: [],
        skillIds: ['risk-awareness'],
        critical: true,
        createdAt: '2026-07-12T00:00:00.000Z',
        redoScores: [],
      },
    ]);

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} now={new Date(2026, 6, 13, 12)} />
      </MemoryRouter>,
    );

    const today = await screen.findByRole('region', {
      name: /today's training/i,
    });
    expect(within(today).getByText('Focus Case')).toBeVisible();
    expect(within(today).getByText('Completed today')).toBeVisible();
    expect(within(today).getByText('Completed')).toBeVisible();
    expect(within(today).getByRole('link', { name: 'Review' })).toHaveAttribute(
      'href',
      '/debrief/completed-today-today-attempt',
    );
    expect(today).toHaveTextContent(/1\s*\/\s*3\s*completed/i);
    expect(today).toHaveTextContent(/30\s*min/i);
    expect(screen.getByText('1 day')).toBeVisible();
    expect(
      within(today).getByRole('heading', { name: 'Next recommendations' }),
    ).toBeVisible();
    expect(
      within(today).getByRole('link', { name: /train risk focus/i }),
    ).toHaveAttribute('href', '/training/risk-focus');
    expect(
      within(today).getAllByRole('link', { name: /^train /i }),
    ).toHaveLength(1);
  });

  it('shows a safe today-plan empty state when no eligible case exists', async () => {
    const source = repositories();
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    const today = await screen.findByRole('region', {
      name: /today's training/i,
    });
    expect(
      within(today).getByText(/no published case is available/i),
    ).toBeVisible();
    expect(
      within(today).getByRole('link', { name: /browse cases/i }),
    ).toHaveAttribute('href', '/cases');
    expect(within(today).queryByRole('link', { name: /train/i })).toBeNull();
  });

  it('keeps daily training first and derives Foundation progress from all attempts', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('case-active', {
        title: 'Active case',
        skills: ['api.integration'],
      }),
    ]);
    const inProgress: InProgressAttemptRecord = {
      id: 'attempt-in-progress',
      userId: 'local-user',
      caseId: 'case-active',
      caseVersion: 1,
      schemaVersion: 1,
      status: 'in-progress',
      startedAt: '2026-07-14T08:00:00.000Z',
      updatedAt: '2026-07-14T08:05:00.000Z',
      currentNodeId: 'case-active-node-01',
      criticalErrorIds: [],
      visitedNodeIds: [],
      roundHistory: [],
    };
    vi.mocked(source.attempts.list).mockResolvedValue([inProgress]);

    render(
      <MemoryRouter>
        <DashboardPage
          foundationSource={dashboardFoundationSource()}
          repositories={source}
        />
      </MemoryRouter>,
    );

    const today = await screen.findByRole('region', {
      name: /today's training/i,
    });
    const foundation = screen.getByRole('region', {
      name: 'Foundation Knowledge',
    });
    expect(
      today.compareDocumentPosition(foundation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(foundation).getByText('Learning')).toBeVisible();
    expect(
      within(foundation).getByRole('link', { name: 'Continue learning' }),
    ).toHaveAttribute('href', '/foundation/api-basic');
    expect(today).toHaveTextContent(/0\s*\/\s*1\s*completed/i);
    expect(source.attempts.list).toHaveBeenCalledWith({
      userId: 'local-user',
    });
  });

  it('explains how the first completed case populates the dashboard', async () => {
    const source = repositories();
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/complete your first case/i)).toBeVisible();
    expect(source.cases.listActive).toHaveBeenCalledWith({
      status: 'published',
    });
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('lets a dashboard storage error retry without stale updates', async () => {
    const user = userEvent.setup();
    const listCases = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage offline'))
      .mockResolvedValueOnce([]);
    const source = repositories({
      cases: {
        list: listCases,
        listActive: listCases,
        getVersion: vi.fn(),
        seed: vi.fn(),
      },
    });
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/complete your first case/i)).toBeVisible();
    expect(listCases).toHaveBeenCalledTimes(2);
  });

  it('uses critical skills from hidden historical cases for visible recommendations', async () => {
    const visibleCase = {
      id: 'visible-risk-transfer',
      slug: 'visible-risk-transfer',
      title: 'Visible risk transfer',
      summary: 'Practice a risk decision in a new customer setting.',
      scenarioSummary: 'A published customer incident.',
      technicalLayers: ['application'],
      level: 'intermediate' as const,
      status: 'published' as const,
      version: 1,
      estimatedMinutes: 15,
      domains: ['reliability'],
      skills: ['risk-awareness'],
      riskTypes: ['operational'],
      nodeTypes: ['single-choice' as const],
    };
    const source = repositories({
      cases: {
        list: vi.fn().mockResolvedValue([visibleCase]),
        listActive: vi.fn().mockResolvedValue([visibleCase]),
        getVersion: vi.fn(),
        seed: vi.fn(),
      },
      mistakes: {
        get: vi.fn(),
        list: vi.fn().mockResolvedValue([
          {
            id: 'hidden-critical-mistake',
            userId: 'local-user',
            attemptId: 'hidden-attempt',
            caseId: 'deprecated-source-case',
            caseVersion: 1,
            nodeId: 'hidden-node',
            submission: { type: 'choice', selectedOptionIds: ['wrong'] },
            correctSubmission: {
              type: 'choice',
              selectedOptionIds: ['correct'],
            },
            errorTypes: ['risk-awareness-gap'],
            evidenceIds: [],
            skillIds: ['risk-awareness'],
            critical: true,
            createdAt: '2026-07-12T00:00:00.000Z',
            redoScores: [],
          },
        ]),
        save: vi.fn(),
        delete: vi.fn(),
      },
    });

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    expect(
      await screen.findAllByText(/critical-risk skill risk-awareness/i),
    ).toHaveLength(1);
  });

  it('projects dashboard metrics and recommendations onto visible MVP cases only', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('visible-case'),
      summary('expert-case', { level: 'expert' }),
      summary('deprecated-case', { status: 'deprecated' }),
    ]);
    vi.mocked(source.progress.list).mockResolvedValue([
      caseProgress('visible-case'),
      caseProgress('expert-case'),
      caseProgress('missing-history'),
    ]);
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('visible-case')).not.toHaveLength(0);
    expect(
      within(screen.getByText('Total cases').parentElement!).getByText('1'),
    ).toBeVisible();
    expect(
      within(screen.getByText('Completed cases').parentElement!).getByText('1'),
    ).toBeVisible();
    expect(screen.queryByText('expert-case')).not.toBeInTheDocument();
    expect(screen.queryByText('deprecated-case')).not.toBeInTheDocument();
  });

  it('pushes valid case filters into URL history and restores them on Back', async () => {
    const user = userEvent.setup();
    const { router } = renderCases(repositories());
    const level = await screen.findByRole('combobox', { name: /^level$/i });

    await user.selectOptions(level, 'advanced');
    expect(screen.getByLabelText('location')).toHaveTextContent(
      '/cases?level=advanced',
    );
    await router.navigate(-1);
    await waitFor(() => expect(level).toHaveValue(''));
    expect(screen.getByLabelText('location')).toHaveTextContent('/cases');
  });

  it('sanitizes invalid filter values without hiding valid cases', async () => {
    const summary = {
      id: 'case-one',
      slug: 'case-one',
      title: 'Published case',
      summary: 'Summary',
      scenarioSummary: 'Customer incident',
      technicalLayers: ['application'],
      level: 'beginner' as const,
      status: 'published' as const,
      version: 1,
      estimatedMinutes: 10,
      domains: ['customer-discovery'],
      skills: ['requirements'],
      riskTypes: ['operational'],
      nodeTypes: ['single-choice' as const],
    };
    const source = repositories({
      cases: {
        list: vi.fn().mockResolvedValue([summary]),
        listActive: vi.fn().mockResolvedValue([summary]),
        getVersion: vi.fn(),
        seed: vi.fn(),
      },
    });
    renderCases(source, ['/cases?level=bogus&maxDuration=999']);

    expect(
      await screen.findByRole('heading', { name: summary.title }),
    ).toBeVisible();
    expect(screen.getByRole('combobox', { name: /^level$/i })).toHaveValue('');
    expect(
      screen.getByRole('combobox', { name: /maximum duration/i }),
    ).toHaveValue('');
    expect(source.cases.listActive).toHaveBeenCalledWith({
      status: 'published',
    });
  });

  it('builds filter facets only from visible published non-expert cases', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('visible-case', { technicalLayers: ['runtime'] }),
      summary('expert-case', {
        level: 'expert',
        technicalLayers: ['hidden-expert-stack'],
      }),
      summary('deprecated-case', {
        status: 'deprecated',
        technicalLayers: ['hidden-deprecated-stack'],
      }),
    ]);
    renderCases(source);

    expect(
      await screen.findByRole('heading', { name: 'visible-case' }),
    ).toBeVisible();
    const technology = screen.getByRole('combobox', {
      name: /technology layer/i,
    });
    expect(within(technology).queryByText('hidden-expert-stack')).toBeNull();
    expect(
      within(technology).queryByText('hidden-deprecated-stack'),
    ).toBeNull();
    expect(screen.queryByRole('heading', { name: 'expert-case' })).toBeNull();
  });

  it('filters technology by technical layer and preserves the URL value', async () => {
    const summary = {
      id: 'case-runtime',
      slug: 'case-runtime',
      title: 'Runtime incident',
      summary: 'Summary',
      scenarioSummary: 'Customer incident',
      level: 'intermediate' as const,
      status: 'published' as const,
      version: 1,
      estimatedMinutes: 15,
      domains: ['reliability'],
      skills: ['evidence-assessment'],
      riskTypes: ['operational'],
      technicalLayers: ['runtime'],
      nodeTypes: ['log-analysis' as const],
    };
    const source = repositories({
      cases: {
        list: vi.fn().mockResolvedValue([summary]),
        listActive: vi.fn().mockResolvedValue([summary]),
        getVersion: vi.fn(),
        seed: vi.fn(),
      },
    });
    renderCases(source, ['/cases?technology=runtime']);

    expect(
      await screen.findByRole('heading', { name: summary.title }),
    ).toBeVisible();
    expect(
      screen.getByRole('combobox', { name: /technology layer/i }),
    ).toHaveValue('runtime');
    expect(screen.getByLabelText('location')).toHaveTextContent(
      '/cases?technology=runtime',
    );
  });
});
