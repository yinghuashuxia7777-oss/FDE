/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  useLocation,
} from 'react-router-dom';

import type { ProductRepositories } from '../application/product';
import type {
  CaseProgressRecord,
  CaseSummary,
} from '../repositories/contracts';
import { CaseLibraryPage } from './cases';
import { DashboardPage } from './dashboard';

function repositories(
  overrides: Partial<ProductRepositories> = {},
): ProductRepositories {
  return {
    attempts: {
      get: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue([]),
      getVersion: vi.fn().mockResolvedValue(undefined),
      seed: vi.fn(),
    },
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
  it('explains how the first completed case populates the dashboard', async () => {
    const source = repositories();
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/complete your first case/i)).toBeVisible();
    expect(source.cases.list).toHaveBeenCalledWith({ status: 'published' });
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('lets a dashboard storage error retry without stale updates', async () => {
    const user = userEvent.setup();
    const listCases = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage offline'))
      .mockResolvedValueOnce([]);
    const source = repositories({
      cases: { list: listCases, getVersion: vi.fn(), seed: vi.fn() },
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
    ).toHaveLength(2);
  });

  it('projects dashboard metrics and recommendations onto visible MVP cases only', async () => {
    const source = repositories();
    vi.mocked(source.cases.list).mockResolvedValue([
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
    expect(source.cases.list).toHaveBeenCalledWith({ status: 'published' });
  });

  it('builds filter facets only from visible published non-expert cases', async () => {
    const source = repositories();
    vi.mocked(source.cases.list).mockResolvedValue([
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
