import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import { RouteFrame, TrainingShell } from '../../app/route-pages';
import {
  ProductDataProvider,
  type ProductRepositories,
} from '../../application/product';
import type { ConceptSource } from '../../content/concept-source';
import type { FoundationSource } from '../../content/foundation-source';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import type { FoundationKnowledge } from '../../domain/foundation/types';
import { evaluateNode } from '../../domain/scoring';
import {
  LOCAL_USER_ID,
  type CompletedAttemptRecord,
  type InProgressAttemptRecord,
} from '../../repositories/contracts';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { TrainingRoutePage } from './TrainingRoutePage';

const STARTED_AT = '2026-07-13T08:00:00.000Z';

function inProgressAttempt(
  id: string,
  caseVersion: number,
  updatedAt: string,
): InProgressAttemptRecord {
  return {
    id,
    userId: LOCAL_USER_ID,
    caseId: 'case-minimal',
    caseVersion,
    schemaVersion: 1,
    status: 'in-progress',
    startedAt: STARTED_AT,
    updatedAt,
    currentNodeId: 'node-1',
    criticalErrorIds: [],
    visitedNodeIds: ['node-1'],
    roundHistory: [],
    consequences: [],
  };
}

function repositories() {
  const content = createMinimalValidCase();
  const listActive = vi.fn().mockResolvedValue([
    {
      id: content.id,
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      level: content.level,
      status: 'published' as const,
      version: content.metadata.version,
      estimatedMinutes: content.estimatedMinutes,
      domains: content.domains,
      skills: content.skills,
      riskTypes: content.riskTypes,
      scenarioSummary: content.scenario.initialIncident,
      technicalLayers: content.technicalLayers,
      nodeTypes: ['single-choice' as const],
    },
  ]);
  const getVersion = vi.fn().mockResolvedValue(content);
  const listAttempts = vi.fn().mockResolvedValue([]);
  const listMastery = vi.fn().mockResolvedValue([]);
  const saveAttempt = vi.fn<ProductRepositories['attempts']['save']>();
  const source = {
    cases: {
      list: vi.fn(),
      listActive,
      getVersion,
      seed: vi.fn(),
    },
    attempts: {
      get: vi.fn(),
      list: listAttempts,
      save: saveAttempt,
      delete: vi.fn(),
    },
    progress: {
      get: vi.fn(),
      list: vi.fn(),
      commitCompletion: vi.fn(),
      clear: vi.fn(),
      exportUserData: vi.fn(),
      replaceUserData: vi.fn(),
    },
    skills: {
      get: vi.fn(),
      list: listMastery,
      save: vi.fn(),
      saveMany: vi.fn(),
    },
  } as unknown as ProductRepositories;
  return {
    content,
    getVersion,
    listActive,
    listAttempts,
    listMastery,
    saveAttempt,
    source,
  };
}

function foundationItem(): FoundationKnowledge {
  return {
    schemaVersion: 1,
    id: 'foundation.evidence-basics',
    type: 'foundation',
    title: 'Evidence basics',
    domain: 'computer-basics',
    track: 'computer-basics',
    skills: ['evidence-assessment'],
    level: 'beginner',
    order: 1,
    estimatedMinutes: 6,
    content: {
      simpleExplanation: 'Understand evidence before choosing an action.',
      analogy: 'Check the map before taking a route.',
      technicalExplanation: 'Evidence constrains the supported next action.',
      example: 'Inspect the failing dependency before changing configuration.',
      commonMistakes: 'Do not treat an unsupported guess as a confirmed fact.',
    },
    relatedCases: ['case-minimal'],
  };
}

function foundationSource(
  loadAll: () => Promise<readonly FoundationKnowledge[]> = () =>
    Promise.resolve([foundationItem()]),
) {
  return {
    loadAll: vi.fn(loadAll),
    findById: vi
      .fn<FoundationSource['findById']>()
      .mockResolvedValue(undefined),
  } satisfies FoundationSource;
}

function conceptItem(): ConceptKnowledge {
  return {
    schemaVersion: 1,
    id: 'concept.evidence',
    type: 'concept',
    category: 'fde',
    order: 1,
    title: '证据：支持决策的可核验事实',
    technicalTerm: 'Evidence',
    simpleExplanation: '证据是能够被重复检查并支持判断的事实。',
    analogy: '像医生先看检验结果，再决定下一步检查。',
    technicalExplanation: '证据需要标明来源、时间、环境与健康对照。',
    whyItMatters: '真实客户系统信息不完整，证据让诊断与验证保持可追溯。',
    commonMistakes: '不要把单条日志直接当成根因。',
    relatedFoundation: ['foundation.evidence-basics'],
    relatedCases: ['case-minimal'],
  };
}

function conceptSource(
  loadAll: () => Promise<readonly ConceptKnowledge[]> = () =>
    Promise.resolve([conceptItem()]),
): ConceptSource {
  return {
    loadAll: vi.fn(loadAll),
    findById: vi.fn().mockResolvedValue(undefined),
  };
}

function completedPass(): CompletedAttemptRecord {
  return {
    id: 'attempt-pass',
    userId: LOCAL_USER_ID,
    caseId: 'case-minimal',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: STARTED_AT,
    updatedAt: '2026-07-13T08:05:00.000Z',
    completedAt: '2026-07-13T08:05:00.000Z',
    currentNodeId: null,
    score: 80,
    verdict: 'pass',
    criticalErrorIds: [],
    visitedNodeIds: [],
    roundHistory: [],
  };
}

function renderRoute(
  source: ProductRepositories,
  path: string,
  foundation?: FoundationSource,
  concepts?: ConceptSource,
) {
  return render(
    <ProductDataProvider repositories={source}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="training/:caseId"
            element={
              <TrainingRoutePage
                {...(foundation === undefined
                  ? {}
                  : { foundationSource: foundation })}
                {...(concepts === undefined ? {} : { conceptSource: concepts })}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    </ProductDataProvider>,
  );
}

function RouteSwitcher() {
  const navigate = useNavigate();
  return (
    <nav aria-label="Test routes">
      <button
        type="button"
        onClick={() => {
          void navigate('/training/case-second');
        }}
      >
        Open second case
      </button>
    </nav>
  );
}

function renderSwitchableRoute(
  source: ProductRepositories,
  foundation: FoundationSource,
) {
  return render(
    <ProductDataProvider repositories={source}>
      <MemoryRouter initialEntries={['/training/case-minimal']}>
        <RouteSwitcher />
        <Routes>
          <Route
            path="training/:caseId"
            element={<TrainingRoutePage foundationSource={foundation} />}
          />
        </Routes>
      </MemoryRouter>
    </ProductDataProvider>,
  );
}

function renderNavigableRoute(
  source: ProductRepositories,
  foundation: FoundationSource,
) {
  return render(
    <ProductDataProvider repositories={source}>
      <MemoryRouter initialEntries={['/cases']}>
        <Routes>
          <Route element={<RouteFrame />}>
            <Route
              path="cases"
              element={
                <section aria-labelledby="page-title">
                  <h1 id="page-title" tabIndex={-1}>
                    Cases
                  </h1>
                  <Link to="/training/case-minimal">Open training case</Link>
                </section>
              }
            />
            <Route path="training" element={<TrainingShell />}>
              <Route
                path=":caseId"
                element={<TrainingRoutePage foundationSource={foundation} />}
              />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </ProductDataProvider>,
  );
}

describe('TrainingRoutePage', () => {
  it('keeps the immersive shell named and focused while navigation resolves to the gate', async () => {
    const user = userEvent.setup();
    let release: ((items: readonly FoundationKnowledge[]) => void) | undefined;
    const deferred = new Promise<readonly FoundationKnowledge[]>((resolve) => {
      release = resolve;
    });
    const { source } = repositories();
    renderNavigableRoute(
      source,
      foundationSource(() => deferred),
    );

    await user.click(screen.getByRole('link', { name: 'Open training case' }));

    const loadingHeading = await screen.findByRole('heading', {
      name: 'Preparing training case',
    });
    expect(
      screen.getByRole('main', { name: 'Preparing training case' }),
    ).toBeVisible();
    expect(loadingHeading).toHaveFocus();

    await act(async () => {
      release?.([foundationItem()]);
      await deferred;
    });
    const gateHeading = await screen.findByRole('heading', {
      name: 'Prerequisite Knowledge',
    });
    await waitFor(() => expect(gateHeading).toHaveFocus());
    expect(
      screen.getByRole('main', { name: 'Prerequisite Knowledge' }),
    ).toBeVisible();
  });

  it('keeps the immersive shell named and moves focus to a route error', async () => {
    const user = userEvent.setup();
    const { getVersion, source } = repositories();
    getVersion.mockRejectedValue(new Error('Version storage unavailable'));
    renderNavigableRoute(source, foundationSource());

    await user.click(screen.getByRole('link', { name: 'Open training case' }));

    const errorHeading = await screen.findByRole('heading', {
      name: 'Training case unavailable',
    });
    await waitFor(() => expect(errorHeading).toHaveFocus());
    expect(
      screen.getByRole('main', { name: 'Training case unavailable' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Version storage unavailable',
    );
  });

  it('keeps the immersive shell named and moves focus to an inactive Case state', async () => {
    const user = userEvent.setup();
    const { listActive, source } = repositories();
    listActive.mockResolvedValue([]);
    renderNavigableRoute(source, foundationSource());

    await user.click(screen.getByRole('link', { name: 'Open training case' }));

    const inactiveHeading = await screen.findByRole('heading', {
      name: 'Case is not active',
    });
    await waitFor(() => expect(inactiveHeading).toHaveFocus());
    expect(
      screen.getByRole('main', { name: 'Case is not active' }),
    ).toBeVisible();
  });

  it('shows unmastered prerequisite knowledge without creating an Attempt', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    renderRoute(source, '/training/case-minimal', foundationSource());

    expect(
      await screen.findByRole('heading', { name: 'Prerequisite Knowledge' }),
    ).toBeVisible();
    const gate = screen
      .getByRole('heading', { name: 'Prerequisite Knowledge' })
      .closest('.training-prerequisite-gate');
    expect(gate).not.toBeNull();
    expect(
      gate?.querySelector('.training-prerequisite-gate__panel'),
    ).not.toBeNull();
    expect(
      gate?.querySelector('.training-prerequisite-gate__list'),
    ).not.toBeNull();
    expect(
      gate?.querySelector('.training-prerequisite-gate__actions'),
    ).not.toBeNull();
    expect(saveAttempt).not.toHaveBeenCalled();
    const learn = screen.getByRole('link', { name: 'Learn Evidence basics' });
    expect(learn).toHaveAttribute(
      'href',
      '/foundation/foundation.evidence-basics',
    );

    await user.click(learn);
    expect(saveAttempt).not.toHaveBeenCalled();
  });

  it('shows the API core concept with Pagination as a recommended supplement before starting', async () => {
    const { saveAttempt, source } = repositories();
    const pagination = {
      ...foundationItem(),
      id: 'api.pagination',
      title: 'Pagination',
      estimatedMinutes: 10,
    };
    const api = {
      ...conceptItem(),
      id: 'concept.api',
      title: 'API：系统之间的可验证协作边界',
      technicalTerm: 'API',
      relatedFoundation: ['api.pagination'],
    };
    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(() => Promise.resolve([pagination])),
      conceptSource(() => Promise.resolve([api])),
    );

    const coreConceptTitle = await screen.findByRole('heading', {
      level: 2,
      name: 'Core concept',
    });
    const coreConcept = coreConceptTitle.closest('section');
    expect(coreConcept).not.toBeNull();
    expect(within(coreConcept!).getByText('API')).toBeVisible();
    const supplementTitle = screen.getByRole('heading', {
      level: 2,
      name: 'Recommended supplement',
    });
    const supplement = supplementTitle.closest('section');
    expect(supplement).not.toBeNull();
    expect(within(supplement!).getByText('Pagination')).toBeVisible();
    expect(
      within(supplement!).getByRole('link', {
        name: 'Learn Pagination',
      }),
    ).toHaveAttribute('href', '/foundation/api.pagination');
    expect(saveAttempt).not.toHaveBeenCalled();
  });

  it('previews related Concepts without creating an Attempt and keeps the Case non-blocking', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(() => Promise.resolve([])),
      conceptSource(),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Recommended concepts before you start',
      }),
    ).toBeVisible();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Case terminology',
      }),
    ).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'View concept explanation' }),
    );
    expect(
      screen.getByText(
        'Evidence is a core concept used to reason clearly about evidence-backed customer delivery.',
      ),
    ).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue Case' }));
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('creates exactly one Attempt from the guarded direct-start action', async () => {
    const user = userEvent.setup();
    let releaseSave: (() => void) | undefined;
    const waitingForSave = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const { saveAttempt, source } = repositories();
    saveAttempt.mockReturnValue(waitingForSave);
    renderRoute(source, '/training/case-minimal', foundationSource());

    const start = await screen.findByRole('button', {
      name: 'Continue Case',
    });
    await user.click(start);

    expect(start).toBeDisabled();
    expect(saveAttempt).toHaveBeenCalledOnce();
    await user.click(start);
    expect(saveAttempt).toHaveBeenCalledOnce();

    await act(async () => {
      releaseSave?.();
      await waitingForSave;
    });
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('keeps the prerequisite gate retryable when its initial Attempt save fails', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    saveAttempt
      .mockRejectedValueOnce(new Error('Initial save failed'))
      .mockResolvedValueOnce(undefined);
    renderRoute(source, '/training/case-minimal', foundationSource());

    const start = await screen.findByRole('button', {
      name: 'Continue Case',
    });
    await user.click(start);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The training session could not be created. Try again.',
    );
    expect(start).toBeEnabled();
    expect(saveAttempt).toHaveBeenCalledOnce();

    await user.click(start);
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledTimes(2);
  });

  it('keeps an empty advisory gate retryable when its initial Attempt save fails', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    saveAttempt
      .mockRejectedValueOnce(new Error('Initial save failed'))
      .mockResolvedValueOnce(undefined);
    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(() => Promise.resolve([])),
    );

    const start = await screen.findByRole('button', { name: 'Continue Case' });
    expect(saveAttempt).not.toHaveBeenCalled();
    await user.click(start);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The training session could not be created. Try again.',
    );
    expect(saveAttempt).toHaveBeenCalledOnce();

    await user.click(start);
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledTimes(2);
  });

  it('fails open when the independent Foundation source cannot load', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(() => Promise.reject(new Error('Foundation offline'))),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Recommended concepts before you start',
      }),
    ).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue Case' }));
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('fails open when the independent Concept source cannot load', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(() => Promise.resolve([])),
      conceptSource(() => Promise.reject(new Error('Concept source offline'))),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Recommended concepts before you start',
      }),
    ).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue Case' }));
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('keeps Continue available without waiting for a slow Concept source', async () => {
    const user = userEvent.setup();
    const { saveAttempt, source } = repositories();
    const neverLoads = new Promise<readonly ConceptKnowledge[]>(() => {
      // Intentionally unresolved: advisory content cannot block a new Case.
    });
    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(() => Promise.resolve([])),
      conceptSource(() => neverLoads),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Recommended concepts before you start',
      }),
    ).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue Case' }));
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('resumes an existing Attempt without waiting for a slow Concept source', async () => {
    const { content, listAttempts, saveAttempt, source } = repositories();
    listAttempts.mockResolvedValue([
      inProgressAttempt(
        'attempt-resume-with-slow-concepts',
        content.metadata.version,
        '2026-07-13T10:00:00.000Z',
      ),
    ]);
    const neverLoads = new Promise<readonly ConceptKnowledge[]>(() => {
      // Intentionally unresolved: advisory content cannot enter resume's path.
    });

    renderRoute(
      source,
      '/training/case-minimal',
      foundationSource(),
      conceptSource(() => neverLoads),
    );

    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();
  });

  it.each(['mastery', 'attempt-history'] as const)(
    'fails open when optional Foundation %s evidence cannot load',
    async (failure) => {
      const { listAttempts, listMastery, saveAttempt, source } = repositories();
      if (failure === 'mastery') {
        listMastery.mockRejectedValue(new Error('Mastery unavailable'));
      } else {
        listAttempts.mockImplementation((query?: { caseId?: string }) =>
          query?.caseId === 'case-minimal'
            ? Promise.resolve([])
            : Promise.reject(new Error('Attempt history unavailable')),
        );
      }

      renderRoute(source, '/training/case-minimal', foundationSource());

      expect(
        await screen.findByRole('heading', {
          name: 'Recommended concepts before you start',
        }),
      ).toBeVisible();
      expect(saveAttempt).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('heading', { name: 'Prerequisite Knowledge' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Continue Case' }),
      ).toBeEnabled();
    },
  );

  it('keeps mastered prerequisites in the zero-write confirmation gate', async () => {
    const user = userEvent.setup();
    const { listAttempts, listMastery, saveAttempt, source } = repositories();
    listMastery.mockResolvedValue([
      {
        userId: LOCAL_USER_ID,
        skillId: 'evidence-assessment',
        score: 70,
        sampleCount: 2,
        updatedAt: '2026-07-13T08:05:00.000Z',
      },
    ]);
    listAttempts.mockImplementation((query?: { status?: string }) =>
      Promise.resolve(query?.status === 'in-progress' ? [] : [completedPass()]),
    );
    renderRoute(source, '/training/case-minimal', foundationSource());

    expect(
      await screen.findByRole('heading', { name: 'Prerequisite Knowledge' }),
    ).toBeVisible();
    expect(screen.getByText('Mastered')).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue Case' }));
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('loads the exact version selected by the active catalog before Continue creates an Attempt', async () => {
    const user = userEvent.setup();
    const { getVersion, listActive, listAttempts, saveAttempt, source } =
      repositories();
    renderRoute(source, '/training/case-minimal');

    const start = await screen.findByRole('button', { name: 'Continue Case' });
    expect(listActive).toHaveBeenCalledWith({
      status: 'published',
    });
    expect(getVersion).toHaveBeenCalledWith('case-minimal', 1);
    expect(listAttempts).toHaveBeenCalledWith({
      userId: LOCAL_USER_ID,
      caseId: 'case-minimal',
      status: 'in-progress',
    });
    expect(saveAttempt).not.toHaveBeenCalled();

    await user.click(start);
    expect(
      await screen.findByRole('heading', { name: /select the next action/i }),
    ).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('does not start stale Case work after navigating to another Case', async () => {
    const user = userEvent.setup();
    let releaseFirst:
      ((items: readonly FoundationKnowledge[]) => void) | undefined;
    const firstLoad = new Promise<readonly FoundationKnowledge[]>((resolve) => {
      releaseFirst = resolve;
    });
    const foundation = foundationSource();
    foundation.loadAll
      .mockImplementationOnce(() => firstLoad)
      .mockResolvedValueOnce([]);
    const { content, getVersion, listActive, saveAttempt, source } =
      repositories();
    const second = {
      ...content,
      id: 'case-second',
      slug: 'case-second',
      title: 'Second case',
    };
    listActive.mockResolvedValue([
      {
        id: content.id,
        slug: content.slug,
        title: content.title,
        summary: content.summary,
        level: content.level,
        status: 'published',
        version: content.metadata.version,
        estimatedMinutes: content.estimatedMinutes,
        domains: content.domains,
        skills: content.skills,
        riskTypes: content.riskTypes,
        scenarioSummary: content.scenario.initialIncident,
        technicalLayers: content.technicalLayers,
        nodeTypes: ['single-choice'],
      },
      {
        id: second.id,
        slug: second.slug,
        title: second.title,
        summary: second.summary,
        level: second.level,
        status: 'published',
        version: second.metadata.version,
        estimatedMinutes: second.estimatedMinutes,
        domains: second.domains,
        skills: second.skills,
        riskTypes: second.riskTypes,
        scenarioSummary: second.scenario.initialIncident,
        technicalLayers: second.technicalLayers,
        nodeTypes: ['single-choice'],
      },
    ]);
    getVersion.mockImplementation((caseId: string) =>
      Promise.resolve(caseId === second.id ? second : content),
    );

    renderSwitchableRoute(source, foundation);
    await waitFor(() => expect(foundation.loadAll).toHaveBeenCalledOnce());
    await user.click(screen.getByRole('button', { name: 'Open second case' }));

    const start = await screen.findByRole('button', { name: 'Continue Case' });
    expect(getVersion).toHaveBeenCalledWith(second.id, second.metadata.version);
    expect(saveAttempt).not.toHaveBeenCalled();
    await user.click(start);
    expect(await screen.findByText('Second case')).toBeVisible();
    expect(saveAttempt).toHaveBeenCalledOnce();
    expect(saveAttempt.mock.calls[0]?.[0]).toMatchObject({ caseId: second.id });

    await act(async () => {
      releaseFirst?.([]);
      await firstLoad;
    });
    expect(saveAttempt).toHaveBeenCalledOnce();
  });

  it('resets session state and Attempt identity when the Case route changes', async () => {
    const user = userEvent.setup();
    const { content, getVersion, listActive, saveAttempt, source } =
      repositories();
    const second = {
      ...content,
      id: 'case-second',
      slug: 'case-second',
      title: 'Second case',
    };
    listActive.mockResolvedValue([
      {
        id: content.id,
        slug: content.slug,
        title: content.title,
        summary: content.summary,
        level: content.level,
        status: 'published',
        version: content.metadata.version,
        estimatedMinutes: content.estimatedMinutes,
        domains: content.domains,
        skills: content.skills,
        riskTypes: content.riskTypes,
        scenarioSummary: content.scenario.initialIncident,
        technicalLayers: content.technicalLayers,
        nodeTypes: ['single-choice'],
      },
      {
        id: second.id,
        slug: second.slug,
        title: second.title,
        summary: second.summary,
        level: second.level,
        status: 'published',
        version: second.metadata.version,
        estimatedMinutes: second.estimatedMinutes,
        domains: second.domains,
        skills: second.skills,
        riskTypes: second.riskTypes,
        scenarioSummary: second.scenario.initialIncident,
        technicalLayers: second.technicalLayers,
        nodeTypes: ['single-choice'],
      },
    ]);
    getVersion.mockImplementation((caseId: string) =>
      Promise.resolve(caseId === second.id ? second : content),
    );

    renderSwitchableRoute(
      source,
      foundationSource(() => Promise.resolve([])),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Continue Case' }),
    );
    await screen.findByText(content.title);
    await user.click(screen.getByRole('button', { name: 'Open second case' }));
    await user.click(
      await screen.findByRole('button', { name: 'Continue Case' }),
    );
    expect(await screen.findByText('Second case')).toBeVisible();

    expect(saveAttempt).toHaveBeenCalledTimes(2);
    const saved = saveAttempt.mock.calls.map(([attempt]) => attempt);
    expect(saved.map(({ caseId }) => caseId)).toEqual([
      'case-minimal',
      'case-second',
    ]);
    expect(new Set(saved.map(({ id }) => id)).size).toBe(2);
  });

  it('does not start a deferred Case after the route unmounts', async () => {
    let release: ((items: readonly FoundationKnowledge[]) => void) | undefined;
    const deferred = new Promise<readonly FoundationKnowledge[]>((resolve) => {
      release = resolve;
    });
    const foundation = foundationSource(() => deferred);
    const { saveAttempt, source } = repositories();
    const view = renderRoute(source, '/training/case-minimal', foundation);
    await waitFor(() => expect(foundation.loadAll).toHaveBeenCalledOnce());

    view.unmount();
    await act(async () => {
      release?.([]);
      await deferred;
    });
    expect(saveAttempt).not.toHaveBeenCalled();
  });

  it('resumes the newest in-progress attempt for the active case version', async () => {
    const { content, listAttempts, saveAttempt, source } = repositories();
    const node = content.nodes[0]!;
    const submission = {
      type: 'choice' as const,
      selectedOptionIds: ['option-b'],
    };
    const evaluation = evaluateNode(node, submission);
    const latest = {
      ...inProgressAttempt(
        'attempt-latest',
        content.metadata.version,
        '2026-07-13T10:00:00.000Z',
      ),
      criticalErrorIds: evaluation.criticalErrorIds,
      roundHistory: [
        {
          nodeId: node.id,
          attemptNumber: 1 as const,
          submission,
          evaluation,
          submittedAt: '2026-07-13T09:00:00.000Z',
          revealed: false,
        },
      ],
      consequences: evaluation.consequences,
    } satisfies InProgressAttemptRecord;
    listAttempts.mockResolvedValue([
      inProgressAttempt(
        'attempt-older',
        content.metadata.version,
        '2026-07-13T09:00:00.000Z',
      ),
      inProgressAttempt(
        'attempt-other-version',
        content.metadata.version + 1,
        '2026-07-13T11:00:00.000Z',
      ),
      latest,
    ]);

    const prerequisites = foundationSource();
    renderRoute(
      source,
      '/training/case-minimal',
      prerequisites,
      conceptSource(),
    );

    expect(
      await screen.findByText(node.feedback.firstWrong),
    ).toBeInTheDocument();
    expect(saveAttempt).not.toHaveBeenCalled();
    expect(prerequisites.loadAll).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('button', {
        name: 'Evidence',
      }),
    ).toBeVisible();
  });

  it('surfaces a recoverable error when the saved attempt cannot resume without overwriting it', async () => {
    const { content, listAttempts, saveAttempt, source } = repositories();
    listAttempts.mockResolvedValue([
      {
        ...inProgressAttempt(
          'attempt-invalid',
          content.metadata.version,
          '2026-07-13T10:00:00.000Z',
        ),
        currentNodeId: 'missing-node',
      },
    ]);

    renderRoute(source, '/training/case-minimal');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Training case unavailable');
    expect(alert).toHaveTextContent(/stored current node/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(saveAttempt).not.toHaveBeenCalled();
  });

  it('does not fall back to a historical version for a non-active case', async () => {
    const { getVersion, listActive, source } = repositories();
    listActive.mockResolvedValue([]);
    renderRoute(source, '/training/historical-only');

    expect(await screen.findByText(/case is not active/i)).toBeVisible();
    expect(getVersion).not.toHaveBeenCalled();
  });

  it('shows a recoverable error when the active exact version is missing', async () => {
    const { getVersion, saveAttempt, source } = repositories();
    getVersion.mockResolvedValue(undefined);
    const foundation = foundationSource();
    renderRoute(source, '/training/case-minimal', foundation);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Training case unavailable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(foundation.loadAll).not.toHaveBeenCalled();
    expect(saveAttempt).not.toHaveBeenCalled();
  });
});
