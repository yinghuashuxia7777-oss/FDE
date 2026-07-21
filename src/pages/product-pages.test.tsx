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
import type { ConceptSource } from '../content/concept-source';
import { LearningJourneyProvider } from '../components/onboarding';
import type { ConceptKnowledge } from '../domain/concepts/types';
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

function caseProgress(caseId: string, completedCount = 1): CaseProgressRecord {
  return {
    userId: 'local-user',
    caseId,
    caseVersion: 1,
    latestAttemptId: `${caseId}-attempt`,
    attemptCount: 1,
    completedCount,
    highestScore: completedCount > 0 ? 80 : 0,
    latestScore: completedCount > 0 ? 80 : 0,
    latestVerdict: completedCount > 0 ? 'pass' : 'fail',
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

function dashboardConceptSource(): ConceptSource {
  const item: ConceptKnowledge = {
    schemaVersion: 1,
    id: 'concept.api',
    type: 'concept',
    category: 'api-backend',
    order: 1,
    title: 'API collaboration boundary',
    technicalTerm: 'API',
    simpleExplanation: 'An API is a contract between connected systems.',
    analogy: 'A menu describes what can be ordered.',
    technicalExplanation: 'Requests and responses follow a defined contract.',
    whyItMatters: 'FDEs diagnose failures across system boundaries.',
    commonMistakes: 'Treating every API failure as a model failure.',
    relatedFoundation: ['api-basic'],
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps setup and First Mission primary while previewing the first capability unlock', async () => {
    const user = userEvent.setup();
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('case-active', {
        title: 'Advanced agent incident',
        level: 'advanced',
        skills: ['api.integration'],
      }),
    ]);

    render(
      <MemoryRouter>
        <LearningJourneyProvider>
          <DashboardPage
            conceptSource={dashboardConceptSource()}
            foundationSource={dashboardFoundationSource()}
            repositories={source}
          />
        </LearningJourneyProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Build your AI Engineer growth profile',
      }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('radio', { name: /become ai engineer/i }),
    );
    await user.click(screen.getByRole('radio', { name: /beginner/i }));
    await user.click(
      screen.getByRole('button', { name: 'Generate my growth profile' }),
    );

    const firstMission = screen.getByRole('region', {
      name: 'Your First Mission',
    });
    expect(firstMission).toHaveTextContent('API foundation');
    expect(
      within(firstMission).getByRole('link', {
        name: 'Start learning API foundation',
      }),
    ).toHaveAttribute('href', '/foundation/api-basic');
    expect(
      screen.getByRole('region', { name: 'Your growth profile' }),
    ).toHaveTextContent('Stage 0');
    expect(
      screen.queryByRole('region', { name: 'AI engineering growth journey' }),
    ).not.toBeInTheDocument();
    const capabilityPreview = screen.getByRole('region', {
      name: 'Your capability profile starts here',
    });
    const capabilityMap = within(capabilityPreview).getByRole('figure', {
      name: 'First capability unlock preview',
    });
    expect(capabilityMap).not.toHaveTextContent('Demo Profile');
    expect(capabilityMap).not.toHaveTextContent('72%');
    expect(
      capabilityMap.querySelector(
        '[data-skill-id="reliability.observability"]',
      ),
    ).toHaveAttribute('data-preview', 'true');
    expect(
      screen.queryByRole('region', { name: "Today's challenge" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Next recommendation' }),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll('.button--primary')).toHaveLength(1);
    expect(firstMission).toContainElement(
      document.querySelector('.button--primary'),
    );
    expect(source.attempts.save).not.toHaveBeenCalled();
    expect(source.attempts.delete).not.toHaveBeenCalled();
    expect(source.cases.seed).not.toHaveBeenCalled();
    expect(source.mistakes.save).not.toHaveBeenCalled();
    expect(source.mistakes.delete).not.toHaveBeenCalled();
    expect(source.progress.commitCompletion).not.toHaveBeenCalled();
    expect(source.progress.clear).not.toHaveBeenCalled();
    expect(source.progress.replaceUserData).not.toHaveBeenCalled();
    expect(source.settings.save).not.toHaveBeenCalled();
    expect(source.skills.save).not.toHaveBeenCalled();
    expect(source.skills.saveMany).not.toHaveBeenCalled();
  });

  it('keeps a learner with only an in-progress attempt in New User Mode', async () => {
    const source = repositories();
    const historicalAttempt: InProgressAttemptRecord = {
      id: 'historical-attempt',
      userId: 'local-user',
      caseId: 'case-no-longer-active',
      caseVersion: 1,
      schemaVersion: 1,
      status: 'in-progress',
      startedAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
      currentNodeId: 'node-one',
      criticalErrorIds: [],
      visitedNodeIds: ['node-one'],
      roundHistory: [],
    };
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('case-active'),
    ]);
    vi.mocked(source.attempts.list).mockResolvedValue([historicalAttempt]);
    vi.mocked(source.progress.list).mockResolvedValue([
      caseProgress('case-active', 0),
    ]);

    render(
      <MemoryRouter>
        <LearningJourneyProvider>
          <DashboardPage
            conceptSource={dashboardConceptSource()}
            foundationSource={dashboardFoundationSource()}
            repositories={source}
          />
        </LearningJourneyProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Build your AI Engineer growth profile',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'AI engineering readiness' }),
    ).not.toBeInTheDocument();
  });

  it('composes the AI Growth OS capability command center from real product evidence', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('case-active', {
        title: 'Active customer incident',
        scenarioSummary:
          'A customer deployment returns inconsistent API responses under load.',
        level: 'advanced',
        estimatedMinutes: 25,
        skills: ['reliability.observability'],
      }),
    ]);
    vi.mocked(source.attempts.list).mockResolvedValue([
      completedAttempt('case-active'),
    ]);
    vi.mocked(source.progress.list).mockResolvedValue([
      caseProgress('case-active'),
    ]);
    vi.mocked(source.skills.list).mockResolvedValue([
      {
        userId: 'local-user',
        skillId: 'llm.applications',
        score: 82,
        sampleCount: 4,
        updatedAt: '2026-07-13T09:00:00.000Z',
      },
      {
        userId: 'local-user',
        skillId: 'reliability.observability',
        score: 36,
        sampleCount: 2,
        updatedAt: '2026-07-13T09:00:00.000Z',
      },
    ]);

    const { container } = render(
      <MemoryRouter>
        <DashboardPage
          foundationSource={dashboardFoundationSource()}
          repositories={source}
        />
      </MemoryRouter>,
    );

    const journey = await screen.findByRole('region', {
      name: 'AI engineering growth journey',
    });
    expect(
      screen.queryByRole('heading', {
        name: 'Build your AI Engineer growth profile',
      }),
    ).not.toBeInTheDocument();
    expect(journey).toHaveTextContent('Become a production AI engineer');

    const readiness = screen.getByRole('region', {
      name: 'AI engineering readiness',
    });
    expect(readiness).toHaveTextContent('67%');
    expect(readiness).toHaveTextContent('Stage 2');
    expect(readiness).toHaveTextContent('LLM application engineering');
    expect(readiness).toHaveTextContent('Reliability and observability');
    expect(readiness).toHaveTextContent('Evidence-weighted mastery');

    const capabilityMap = screen.getByRole('figure', {
      name: 'Capability map',
    });
    expect(capabilityMap).not.toHaveTextContent('Demo Profile');
    expect(capabilityMap).not.toHaveAttribute('data-showcase');
    const llmNode = capabilityMap.querySelector(
      '[data-skill-id="llm.applications"]',
    );
    expect(llmNode).not.toBeNull();
    expect(llmNode).toHaveTextContent('LLM applications');
    expect(llmNode).toHaveAttribute('data-mastery', 'proficient');
    expect(
      capabilityMap.querySelector(
        '[data-skill-id="reliability.observability"]',
      ),
    ).not.toBeNull();
    expect(
      within(capabilityMap).getByText(
        'Confidence High · 4 engineering evidence records',
      ),
    ).toBeVisible();

    const mentor = screen.getByRole('complementary', {
      name: 'Next recommendation',
    });
    expect(mentor).toHaveTextContent(/Based on local evidence/i);
    expect(
      within(mentor).getByRole('link', {
        name: "Continue today's growth mission",
      }),
    ).toHaveAttribute('href', '/foundation/api.timeout-retry');

    const challenge = screen.getByRole('region', {
      name: "Today's challenge",
    });
    expect(
      within(challenge).getByRole('heading', {
        name: 'Active customer incident',
      }),
    ).toBeVisible();
    expect(within(challenge).getByText('25 min')).toBeVisible();
    expect(within(challenge).getByText('advanced')).toBeVisible();

    const evidence = screen.getByRole('region', {
      name: 'Evidence timeline',
    });
    expect(evidence).toHaveTextContent('Active customer incident');
    expect(evidence).toHaveTextContent('88');
    expect(
      within(evidence).getByRole('link', { name: 'Review evidence' }),
    ).toHaveAttribute('href', '/debrief/case-active-today-attempt');

    expect(container.querySelector('.growth-os-grid')).not.toBeNull();
  });

  it('treats a zero score with a positive sample as real capability evidence', async () => {
    const source = repositories();
    vi.mocked(source.skills.list).mockResolvedValue([
      {
        userId: 'local-user',
        skillId: 'llm.applications',
        score: 0,
        sampleCount: 1,
        updatedAt: '2026-07-17T08:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    const capabilityMap = await screen.findByRole('figure', {
      name: 'Capability map',
    });
    expect(capabilityMap).not.toHaveTextContent('Demo Profile');
    expect(capabilityMap).toHaveTextContent('0% readiness');
    expect(capabilityMap).not.toHaveTextContent('72% Ready');
    const llmNode = capabilityMap.querySelector(
      '[data-skill-id="llm.applications"]',
    );
    expect(llmNode).toHaveAttribute('data-mastery', 'learning');
    expect(llmNode).toHaveTextContent('Learning');
    expect(llmNode).not.toHaveTextContent('Not verified');
  });

  it('keeps a historical completed attempt real when active mastery is unavailable', async () => {
    const source = repositories();
    vi.mocked(source.attempts.list).mockResolvedValue([
      completedAttempt('deprecated-hidden-case'),
    ]);

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    const capabilityMap = await screen.findByRole('figure', {
      name: 'Capability map',
    });
    expect(capabilityMap).not.toHaveTextContent('Demo Profile');
    expect(capabilityMap).not.toHaveTextContent('72%');
    expect(capabilityMap).toHaveTextContent('Start building capability proof');
    expect(
      capabilityMap.querySelectorAll(
        '.capability-node[data-mastery="not-started"]',
      ),
    ).toHaveLength(7);
    expect(capabilityMap).toHaveTextContent('No evidence yet');
    expect(capabilityMap).toHaveTextContent(
      'Complete challenges to build evidence',
    );
    expect(capabilityMap).not.toHaveTextContent(/0 samples?/i);
  });

  it('places timezone-stamped completions on the learner local calendar day', async () => {
    const source = repositories();
    const completedAt = '2026-07-13T23:30:00-07:00';
    const localCompletion = new Date(completedAt);
    const localDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
    }).format(localCompletion);
    const now = new Date(
      localCompletion.getFullYear(),
      localCompletion.getMonth(),
      localCompletion.getDate(),
      12,
    );
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('local-calendar-case'),
    ]);
    vi.mocked(source.attempts.list).mockResolvedValue([
      completedAttempt('local-calendar-case', completedAt),
    ]);

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} now={now} />
      </MemoryRouter>,
    );

    const evidence = await screen.findByRole('region', {
      name: 'Evidence timeline',
    });
    expect(within(evidence).getByText(localDate)).toBeVisible();
  });

  it('keeps lifetime training evidence monotonic across milestone boundaries', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('xp-milestone-case'),
    ]);
    vi.mocked(source.attempts.list).mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        ...completedAttempt('xp-milestone-case'),
        id: `xp-attempt-${String(index + 1)}`,
      })),
    );

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    const readiness = await screen.findByRole('region', {
      name: 'AI engineering readiness',
    });
    expect(readiness).toHaveTextContent('528 / 1000');
    expect(
      within(readiness).getByRole('progressbar', {
        name: 'Training evidence 528 of next milestone 1000',
      }),
    ).toHaveAttribute('max', '1000');
  });

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
    expect(
      screen.getByRole('heading', {
        name: '生成你的 AI Engineer 成长档案',
      }),
    ).toBeVisible();
    expect(screen.getByText('选择你的成长目标')).toBeVisible();
    expect(screen.queryByText(authoredTitle)).not.toBeInTheDocument();
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

  it('exposes the incident library visual structure from authored case data', async () => {
    const source = repositories();
    vi.mocked(source.cases.listActive).mockResolvedValue([
      summary('incident-advanced', {
        title: 'Production retrieval incident',
        scenarioSummary: 'Customers receive documents from another tenant.',
        level: 'advanced',
        skills: ['rag.metadata-filter', 'security.access-control'],
      }),
    ]);

    const { container } = renderCases(source);

    const title = await screen.findByRole('heading', {
      name: 'Production retrieval incident',
    });
    const card = title.closest('article');
    expect(card).not.toBeNull();
    expect(container.querySelector('.product-page')).toHaveClass(
      'product-page--case-library',
    );
    expect(container.querySelector('form')).toHaveClass(
      'case-library__toolbar',
    );
    expect(container.querySelector('.case-library__results')).toContainElement(
      card,
    );
    expect(card).toHaveClass('case-card--incident');
    expect(card).toHaveAttribute('data-level', 'advanced');
    expect(
      within(card!).getByText(
        'Customers receive documents from another tenant.',
      ),
    ).toHaveClass('case-card__summary');
    expect(card!.querySelector('.case-card__facts')).not.toBeNull();
    expect(card!.querySelector('.case-card__skills')).toHaveTextContent(
      'rag.metadata-filter',
    );
    expect(within(card!).getByRole('link', { name: 'Start case' })).toHaveClass(
      'case-card__action',
    );
  });

  it('shows today evidence, estimate, and the first unfinished challenge CTA', async () => {
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

    const challenge = await screen.findByRole('region', {
      name: "Today's challenge",
    });
    expect(
      within(challenge).getByRole('heading', { name: 'Risk focus' }),
    ).toBeVisible();
    expect(within(challenge).getByText('10 min')).toBeVisible();
    expect(
      within(challenge).getByRole('link', {
        name: 'Enter engineering challenge',
      }),
    ).toHaveAttribute('href', '/training/risk-focus');
    expect(
      within(challenge).getByRole('link', { name: /Completed today/ }),
    ).toHaveAttribute('href', '/debrief/completed-today-today-attempt');
    const evidence = screen.getByRole('region', {
      name: 'Evidence timeline',
    });
    expect(evidence).toHaveTextContent('Completed today');
    expect(
      within(evidence).getByRole('link', { name: 'Review evidence' }),
    ).toHaveAttribute('href', '/debrief/completed-today-today-attempt');
  });

  it('shows a safe today-plan empty state when no eligible case exists', async () => {
    const source = repositories();
    vi.mocked(source.progress.list).mockResolvedValue([
      caseProgress('previous-case'),
    ]);
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    const challenge = await screen.findByRole('region', {
      name: "Today's challenge",
    });
    expect(
      within(challenge).getByText(/has no published case to schedule/i),
    ).toBeVisible();
    expect(
      within(challenge).getByRole('link', { name: /browse cases/i }),
    ).toHaveAttribute('href', '/cases');
    expect(
      screen.getByRole('progressbar', {
        name: 'Training evidence 0 of next milestone 500',
      }),
    ).toHaveAttribute('max', '500');
  });

  it('keeps an in-progress learner focused on profile setup and the Foundation-first mission', async () => {
    const user = userEvent.setup();
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
        <LearningJourneyProvider>
          <DashboardPage
            foundationSource={dashboardFoundationSource()}
            repositories={source}
          />
        </LearningJourneyProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Build your AI Engineer growth profile',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: "Today's challenge" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('radio', { name: /become ai engineer/i }),
    );
    await user.click(screen.getByRole('radio', { name: /beginner/i }));
    await user.click(
      screen.getByRole('button', { name: 'Generate my growth profile' }),
    );
    const firstMission = screen.getByRole('region', {
      name: 'Your First Mission',
    });
    expect(firstMission).toHaveTextContent('API foundation');
    expect(
      within(firstMission).getByRole('link', {
        name: 'Start learning API foundation',
      }),
    ).toHaveAttribute('href', '/foundation/api-basic');
    expect(source.attempts.list).toHaveBeenCalledWith({
      userId: 'local-user',
    });
  });

  it('explains the first capability proof without exposing an empty dashboard', async () => {
    const source = repositories();
    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Build your AI Engineer growth profile',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'AI engineering readiness' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Next recommendation' }),
    ).not.toBeInTheDocument();
    expect(source.cases.listActive).toHaveBeenCalledWith({
      status: 'published',
    });
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
    expect(
      await screen.findByRole('heading', {
        name: 'Build your AI Engineer growth profile',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'AI engineering readiness' }),
    ).not.toBeInTheDocument();
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
    vi.mocked(source.progress.list).mockResolvedValue([
      caseProgress('previous-case'),
    ]);

    render(
      <MemoryRouter>
        <DashboardPage repositories={source} />
      </MemoryRouter>,
    );

    expect(
      await screen.findAllByText(/critical-risk skill risk-awareness/i),
    ).toHaveLength(1);
  });

  it('stops transferring a hidden historical critical skill after a clean same-node pass', async () => {
    const visibleCase = summary('visible-risk-transfer', {
      title: 'Visible risk transfer',
      level: 'intermediate',
      domains: ['reliability'],
      skills: ['risk-awareness'],
    });
    const repairedAttempt: CompletedAttemptRecord = {
      ...completedAttempt('deprecated-source-case', '2026-07-13T10:00:00.000Z'),
      roundHistory: [
        {
          nodeId: 'hidden-node',
          attemptNumber: 1,
          submission: {
            type: 'choice',
            selectedOptionIds: ['correct'],
          },
          evaluation: {
            isCorrect: true,
            scoreRatio: 1,
            errorTypes: [],
            criticalErrorIds: [],
            consequences: [],
            branchKey: 'correct',
          },
          submittedAt: '2026-07-13T09:55:00.000Z',
          revealed: false,
        },
      ],
    };
    const source = repositories({
      attempts: {
        get: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([repairedAttempt]),
        save: vi.fn(),
        delete: vi.fn(),
      },
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
      await screen.findByText(
        /continue today with an uncompleted FDE scenario/i,
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/critical-risk skill risk-awareness/i),
    ).not.toBeInTheDocument();
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

    const challenge = await screen.findByRole('region', {
      name: "Today's challenge",
    });
    expect(challenge).toHaveTextContent('visible-case');
    const journey = screen.getByRole('region', {
      name: 'AI engineering growth journey',
    });
    expect(journey).not.toHaveTextContent('expert-case');
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
