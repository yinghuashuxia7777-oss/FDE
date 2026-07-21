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
import type {
  CaseSummary,
  CompletedAttemptRecord,
  ContentRepository,
  MistakeRecord,
  SkillMasteryRecord,
} from '../repositories/contracts';
import { bundledDomains, bundledSkills } from '../generated/content-index';
import { createMinimalValidCase } from '../tests/fixtures/cases';
import { I18nProvider } from '../i18n';
import { DebriefPage } from './debrief';
import { MistakesPage } from './mistakes';
import { ProfilePage } from './profile';
import { SkillsPage } from './skills';

function repositories(): ProductRepositories {
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
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue([]),
      listActive: vi.fn().mockResolvedValue([]),
      getVersion: vi.fn(),
      seed: vi.fn(),
    },
    content,
    contentManagement: {} as ContentManagement,
    mistakes: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
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
    settings: { get: vi.fn(), save: vi.fn() },
    skills: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      saveMany: vi.fn(),
    },
  };
}

function attempt(): CompletedAttemptRecord {
  return {
    id: 'attempt-one',
    userId: 'local-user',
    caseId: 'case-minimal',
    caseVersion: 1,
    schemaVersion: 1,
    status: 'completed',
    startedAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:10:00.000Z',
    completedAt: '2026-07-13T00:10:00.000Z',
    currentNodeId: null,
    score: 70,
    verdict: 'pass',
    criticalErrorIds: [],
    visitedNodeIds: ['node-1'],
    roundHistory: [
      {
        nodeId: 'node-1',
        attemptNumber: 1,
        submission: { type: 'choice', selectedOptionIds: ['option-b'] },
        evaluation: {
          isCorrect: false,
          scoreRatio: 0,
          errorTypes: ['unsupported-action'],
          criticalErrorIds: [],
          consequences: [],
          branchKey: 'incorrect',
        },
        submittedAt: '2026-07-13T00:04:00.000Z',
        revealed: false,
      },
      {
        nodeId: 'node-1',
        attemptNumber: 2,
        submission: { type: 'choice', selectedOptionIds: ['option-a'] },
        evaluation: {
          isCorrect: true,
          scoreRatio: 1,
          errorTypes: [],
          criticalErrorIds: [],
          consequences: [],
          branchKey: 'correct',
        },
        submittedAt: '2026-07-13T00:05:00.000Z',
        revealed: false,
      },
    ],
  };
}

function mistakeRecord(overrides: Partial<MistakeRecord> = {}): MistakeRecord {
  return {
    id: 'mistake-one',
    userId: 'local-user',
    attemptId: 'attempt-one',
    caseId: 'case-minimal',
    caseVersion: 1,
    nodeId: 'node-1',
    submission: { type: 'choice', selectedOptionIds: ['option-b'] },
    correctSubmission: { type: 'choice', selectedOptionIds: ['option-a'] },
    errorTypes: ['unsupported-action'],
    evidenceIds: ['evidence-1'],
    skillIds: ['evidence-assessment'],
    critical: true,
    createdAt: '2026-07-13T00:04:00.000Z',
    redoScores: [],
    ...overrides,
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

describe('Slice B pages', () => {
  it('renders the four review surfaces in Simplified Chinese', async () => {
    const skills = render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <SkillsPage repositories={repositories()} />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(await screen.findByRole('heading', { name: '技能' })).toBeVisible();
    skills.unmount();

    const mistakes = render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <MistakesPage repositories={repositories()} />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: '错题本' }),
    ).toBeVisible();
    expect(await screen.findByText('没有匹配的错题')).toBeVisible();
    mistakes.unmount();

    const profile = render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <ProfilePage repositories={repositories()} />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: 'AI 工程师能力档案' }),
    ).toBeVisible();
    profile.unmount();

    const debrief = render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <DebriefPage attemptId="missing" repositories={repositories()} />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(await screen.findByRole('heading', { name: '复盘' })).toBeVisible();
    expect(await screen.findByText('未找到训练记录')).toBeVisible();
    debrief.unmount();
  });

  it('loads the exact completed attempt version and renders every round and explanation', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    vi.mocked(source.attempts.get).mockResolvedValue(attempt());
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <DebriefPage attemptId="attempt-one" repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/70%/)).toBeVisible();
    expect(source.cases.getVersion).toHaveBeenCalledWith('case-minimal', 1);
    expect(screen.getByText(/round 1/i)).toBeVisible();
    expect(
      screen.getAllByText(/change unrelated configuration/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(content.nodes[0]!.options[1]!.explanation),
    ).toBeVisible();
    expect(
      screen.getByText(content.debrief.interviewerPerspective),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: "Back to today's plan" }),
    ).toHaveAttribute('href', '/');
  });

  it('turns the exact-version debrief into a read-only next learning loop', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    content.debrief.recommendedCaseIds = ['case-next'];
    vi.mocked(source.attempts.get).mockResolvedValue(attempt());
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    const nextCase: CaseSummary = {
      id: 'case-next',
      slug: 'case-next',
      title: 'Next production failure',
      summary: 'Investigate a production dependency failure.',
      scenarioSummary: 'A production dependency is failing.',
      level: 'intermediate',
      status: 'published',
      version: 1,
      estimatedMinutes: 15,
      domains: ['diagnostics'],
      skills: ['evidence-assessment'],
      riskTypes: ['operational'],
      technicalLayers: ['application'],
      nodeTypes: ['single-choice'],
    };
    vi.mocked(source.cases.listActive).mockResolvedValue([nextCase]);

    render(
      <MemoryRouter>
        <DebriefPage attemptId="attempt-one" repositories={source} />
      </MemoryRouter>,
    );

    const nextStep = await screen.findByRole('region', {
      name: 'Keep growing',
    });
    expect(nextStep).toHaveTextContent(
      'You completed: Minimal diagnostic case',
    );
    expect(nextStep).toHaveTextContent('Evidence-led diagnosis');
    expect(
      within(nextStep).getByRole('link', {
        name: 'Open Foundation Knowledge',
      }),
    ).toHaveAttribute('href', '/foundation');
    expect(
      await within(nextStep).findByRole('link', {
        name: 'Challenge Case: Next production failure',
      }),
    ).toHaveAttribute('href', '/training/case-next');
    expect(source.attempts.save).not.toHaveBeenCalled();
    expect(source.progress.commitCompletion).not.toHaveBeenCalled();
    expect(source.skills.saveMany).not.toHaveBeenCalled();
  });

  it('falls back to the Case library when a historical recommendation is no longer active', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    content.debrief.recommendedCaseIds = ['case-deprecated'];
    vi.mocked(source.attempts.get).mockResolvedValue(attempt());
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    vi.mocked(source.cases.listActive).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DebriefPage attemptId="attempt-one" repositories={source} />
      </MemoryRouter>,
    );

    const nextStep = await screen.findByRole('region', {
      name: 'Keep growing',
    });
    expect(
      within(nextStep).getByRole('link', { name: 'Browse more Cases' }),
    ).toHaveAttribute('href', '/cases');
    expect(
      within(nextStep).queryByRole('link', { name: /case-deprecated/i }),
    ).not.toBeInTheDocument();
  });

  it('presents the completed attempt as a structured incident report', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const completed = attempt();
    completed.criticalErrorIds = ['option-b'];
    completed.roundHistory[0] = {
      ...completed.roundHistory[0]!,
      evaluation: {
        ...completed.roundHistory[0]!.evaluation,
        criticalErrorIds: ['option-b'],
      },
    };
    vi.mocked(source.attempts.get).mockResolvedValue(completed);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);

    const { container } = render(
      <MemoryRouter>
        <DebriefPage attemptId="attempt-one" repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/70%/)).toBeVisible();
    expect(container.querySelector('.product-page')).toHaveClass(
      'product-page--debrief-report',
    );
    expect(container.querySelector('.debrief-report__header')).not.toBeNull();
    expect(
      container.querySelector('.debrief-report__metrics'),
    ).toHaveTextContent('70%');
    expect(
      container.querySelector('.debrief-report__path-comparison'),
    ).not.toBeNull();
    expect(container.querySelector('.debrief-report__timeline')).not.toBeNull();
    const decision = container.querySelector('.debrief-report__decision-card');
    expect(decision).toHaveAttribute('data-critical', 'true');
    expect(decision).toHaveAccessibleName(/visit 1: select the next action/i);
    expect(
      container.querySelector('.debrief-report__assessment-grid'),
    ).not.toBeNull();
    const skillImpact = screen.getByRole('region', { name: 'Skill impact' });
    expect(skillImpact).toHaveTextContent('evidence-assessment');
    expect(skillImpact).toHaveTextContent(
      'This attempt did not record a before-and-after mastery snapshot',
    );
    expect(
      container.querySelector('.debrief-report__actions'),
    ).toContainElement(
      screen.getByRole('link', { name: "Back to today's plan" }),
    );
    expect(source.cases.getVersion).toHaveBeenCalledWith('case-minimal', 1);
  });

  it('uses authored labels instead of internal node, error, and critical IDs in Chinese', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const base = attempt();
    const firstRound = base.roundHistory[0]!;
    const criticalAttempt = {
      ...base,
      criticalErrorIds: ['option-b'],
      roundHistory: [
        {
          ...firstRound,
          evaluation: {
            ...firstRound.evaluation,
            errorTypes: ['continue-known-unauthorized-actions'],
            criticalErrorIds: ['option-b'],
          },
        },
        ...base.roundHistory.slice(1),
      ],
    } satisfies CompletedAttemptRecord;
    vi.mocked(source.attempts.get).mockResolvedValue(criticalAttempt);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);

    render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <DebriefPage attemptId="attempt-one" repositories={source} />
        </MemoryRouter>
      </I18nProvider>,
    );

    const criticalAlert = await screen.findByRole('alert');
    expect(criticalAlert).toHaveTextContent('Change unrelated configuration');
    expect(criticalAlert).not.toHaveTextContent('option-b');
    expect(screen.getByText(/错误类型：其他决策错误/)).toBeVisible();
    expect(
      screen.queryByText('continue-known-unauthorized-actions'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('node-1')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: /node-1/i }),
    ).not.toBeInTheDocument();
  });

  it('uses a localized fallback instead of an internal ID for an untitled decision', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    content.nodes[0]!.title = undefined;
    vi.mocked(source.attempts.get).mockResolvedValue(attempt());
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);

    render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <DebriefPage attemptId="attempt-one" repositories={source} />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(await screen.findByRole('heading', { name: '复盘' })).toBeVisible();
    expect(screen.getAllByText(/未知决策/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/node-1/)).not.toBeInTheDocument();
  });

  it('shows raw attempt facts but warns when the exact debrief version is missing', async () => {
    const source = repositories();
    vi.mocked(source.attempts.get).mockResolvedValue(attempt());
    vi.mocked(source.cases.getVersion).mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <DebriefPage attemptId="attempt-one" repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /exact case version/i,
    );
    expect(screen.getByText(/70%/)).toBeVisible();
    expect(screen.getByText(/node-1/)).toBeVisible();
  });

  it('distinguishes a missing attempt from an unfinished attempt', async () => {
    const missingSource = repositories();
    vi.mocked(missingSource.attempts.get).mockResolvedValue(undefined);
    const first = render(
      <MemoryRouter>
        <DebriefPage attemptId="missing" repositories={missingSource} />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/attempt not found/i)).toBeVisible();
    first.unmount();

    const activeSource = repositories();
    vi.mocked(activeSource.attempts.get).mockResolvedValue({
      id: 'active',
      userId: 'local-user',
      caseId: 'case-minimal',
      caseVersion: 1,
      schemaVersion: 1,
      status: 'in-progress',
      startedAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
      currentNodeId: 'node-1',
      criticalErrorIds: [],
      visitedNodeIds: ['node-1'],
      roundHistory: [],
    });
    render(
      <MemoryRouter>
        <DebriefPage attemptId="active" repositories={activeSource} />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/only completed attempts/i)).toBeVisible();
    expect(activeSource.cases.getVersion).not.toHaveBeenCalled();
  });

  it('renders repeated-node visits as separate debrief ordinals', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const base = attempt();
    const correctRound = base.roundHistory[1]!;
    const cycleAttempt: CompletedAttemptRecord = {
      ...base,
      visitedNodeIds: ['node-1', 'node-1'],
      roundHistory: [
        {
          ...correctRound,
          attemptNumber: 1,
          submittedAt: '2026-07-13T00:04:00.000Z',
        },
        {
          ...correctRound,
          attemptNumber: 1,
          submittedAt: '2026-07-13T00:05:00.000Z',
        },
      ],
    };
    vi.mocked(source.attempts.get).mockResolvedValue(cycleAttempt);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <DebriefPage attemptId="attempt-one" repositories={source} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('article', {
        name: /visit 1: select the next action/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('article', {
        name: /visit 2: select the next action/i,
      }),
    ).toBeVisible();
  });

  it('resolves mistake labels from its exact case version and reports absent retry history honestly', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const mistake = mistakeRecord();
    vi.mocked(source.mistakes.list).mockResolvedValue([mistake]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    expect(
      within(row).getAllByText(/change unrelated configuration/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(row).getByText(/inspect the failing dependency/i),
    ).toBeVisible();
    expect(within(row).getByText(/why this choice was wrong/i)).toBeVisible();
    expect(
      within(row).getByText(content.nodes[0]!.options[1]!.explanation),
    ).toBeVisible();
    expect(
      within(row).getByText(/no later retry score recorded/i),
    ).toBeVisible();
    expect(
      within(row).getByText(/original completed attempt unavailable/i),
    ).toBeVisible();
    expect(source.cases.getVersion).toHaveBeenCalledWith(content.id, 1);
  });

  it('shows authored explanations for a structured mistake submission', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const originalNode = content.nodes[0];
    if (originalNode === undefined) throw new Error('fixture');
    content.nodes[0] = {
      ...originalNode,
      type: 'ordering',
      answer: { orderedOptionIds: ['option-a', 'option-b'] },
    };
    vi.mocked(source.mistakes.list).mockResolvedValue([
      mistakeRecord({
        submission: {
          type: 'ordering',
          orderedOptionIds: ['option-b', 'option-a'],
        },
        correctSubmission: {
          type: 'ordering',
          orderedOptionIds: ['option-a', 'option-b'],
        },
      }),
    ]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    const [firstOption, secondOption] = content.nodes[0].options;
    if (firstOption === undefined || secondOption === undefined)
      throw new Error('fixture');
    expect(within(row).getByText(/why this choice was wrong/i)).toBeVisible();
    expect(within(row).getByText(firstOption.explanation)).toBeVisible();
    expect(within(row).getByText(secondOption.explanation)).toBeVisible();
  });

  it('labels known untitled mistake evidence without calling it unknown', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const node = content.nodes[0];
    const firstEvidence = node?.evidence[0];
    if (node === undefined || firstEvidence === undefined)
      throw new Error('fixture');
    const untitledEvidence = { ...firstEvidence };
    delete untitledEvidence.title;
    node.evidence[0] = untitledEvidence;
    vi.mocked(source.mistakes.list).mockResolvedValue([mistakeRecord()]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    expect(
      within(row).getByText(/text evidence \(evidence-1\)/i),
    ).toBeVisible();
    expect(within(row).queryByText(/unknown evidence/i)).toBeNull();
  });

  it('localizes known evidence and error taxonomy labels in Chinese', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const node = content.nodes[0];
    const firstEvidence = node?.evidence[0];
    if (node === undefined || firstEvidence === undefined)
      throw new Error('fixture');
    const untitledEvidence = { ...firstEvidence, type: 'http' as const };
    delete untitledEvidence.title;
    node.evidence[0] = untitledEvidence;
    vi.mocked(source.mistakes.list).mockResolvedValue([mistakeRecord()]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);

    render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <MistakesPage repositories={source} />
        </MemoryRouter>
      </I18nProvider>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    expect(within(row).getByText('HTTP 证据（evidence-1）')).toBeVisible();
    expect(within(row).getByText('操作缺乏证据支持')).toBeVisible();
  });

  it('derives later retry scores from completed attempt visits', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const later = {
      ...attempt(),
      id: 'attempt-later',
      startedAt: '2026-07-13T00:11:00.000Z',
      completedAt: '2026-07-14T00:10:00.000Z',
      updatedAt: '2026-07-14T00:10:00.000Z',
    };
    vi.mocked(source.mistakes.list).mockResolvedValue([mistakeRecord()]);
    vi.mocked(source.attempts.list).mockResolvedValue([attempt(), later]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    expect(
      within(row).getByText(/attempt attempt-later.*visit 1.*version 1.*60%/i),
    ).toBeVisible();
    expect(within(row).queryByText(/no later retry score/i)).toBeNull();
  });

  it('does not treat a concurrently started attempt as a later retry', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const concurrent = {
      ...attempt(),
      id: 'attempt-concurrent',
      startedAt: '2026-07-13T00:05:00.000Z',
      completedAt: '2026-07-14T00:10:00.000Z',
      updatedAt: '2026-07-14T00:10:00.000Z',
    };
    vi.mocked(source.mistakes.list).mockResolvedValue([mistakeRecord()]);
    vi.mocked(source.attempts.list).mockResolvedValue([attempt(), concurrent]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    const derivedHeading = within(row).getByRole('heading', {
      name: /derived later attempts/i,
    });
    const derivedSection = derivedHeading.closest('section');
    if (derivedSection === null) throw new Error('derived retry section');
    expect(
      within(derivedSection).getByText(/no later retry score recorded/i),
    ).toBeVisible();
    expect(
      within(derivedSection).queryByText(/attempt-concurrent/i),
    ).toBeNull();
  });

  it('preserves retry identity when derived and legacy scores are equal', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const laterOne = {
      ...attempt(),
      id: 'attempt-later-one',
      startedAt: '2026-07-13T00:11:00.000Z',
      completedAt: '2026-07-14T00:10:00.000Z',
      updatedAt: '2026-07-14T00:10:00.000Z',
    };
    const laterTwo = {
      ...attempt(),
      id: 'attempt-later-two',
      startedAt: '2026-07-14T00:11:00.000Z',
      completedAt: '2026-07-15T00:10:00.000Z',
      updatedAt: '2026-07-15T00:10:00.000Z',
    };
    vi.mocked(source.mistakes.list).mockResolvedValue([
      mistakeRecord({ redoScores: [60] }),
    ]);
    vi.mocked(source.attempts.list).mockResolvedValue([
      attempt(),
      laterTwo,
      laterOne,
    ]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    const legacyHeading = within(row).getByRole('heading', {
      name: /imported legacy retry scores/i,
    });
    const legacySection = legacyHeading.closest('section');
    if (legacySection === null) throw new Error('legacy retry section');
    expect(within(legacySection).getByText(/legacy score 60%/i)).toBeVisible();

    const derivedHeading = within(row).getByRole('heading', {
      name: /derived later attempts/i,
    });
    const derivedSection = derivedHeading.closest('section');
    if (derivedSection === null) throw new Error('derived retry section');
    const derivedItems = within(derivedSection).getAllByRole('listitem');
    expect(derivedItems).toHaveLength(2);
    expect(derivedItems[0]).toHaveTextContent(/attempt-later-one.*60%/i);
    expect(derivedItems[1]).toHaveTextContent(/attempt-later-two.*60%/i);
    expect(within(row).getAllByText(/60%/i)).toHaveLength(3);
  });

  it('skips a later retry whose exact case version is missing', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    const later = {
      ...attempt(),
      id: 'attempt-later-missing',
      caseVersion: 2,
      startedAt: '2026-07-13T00:11:00.000Z',
      completedAt: '2026-07-14T00:10:00.000Z',
      updatedAt: '2026-07-14T00:10:00.000Z',
    };
    vi.mocked(source.mistakes.list).mockResolvedValue([mistakeRecord()]);
    vi.mocked(source.attempts.list).mockResolvedValue([attempt(), later]);
    vi.mocked(source.cases.getVersion).mockImplementation((_caseId, version) =>
      Promise.resolve(version === 1 ? content : undefined),
    );
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    expect(
      within(row).getByText(/later retry.*exact version.*excluded/i),
    ).toBeVisible();
    expect(
      within(row).getByText(/no later retry score recorded/i),
    ).toBeVisible();
  });

  it('pushes and restores mistake domain filters through history', async () => {
    const user = userEvent.setup();
    const source = repositories();
    const content = createMinimalValidCase();
    vi.mocked(source.mistakes.list).mockResolvedValue([mistakeRecord()]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    const router = createMemoryRouter(
      [
        {
          path: '/mistakes',
          element: (
            <>
              <MistakesPage repositories={source} />
              <LocationProbe />
            </>
          ),
        },
      ],
      { initialEntries: ['/mistakes'] },
    );
    render(<RouterProvider router={router} />);

    const domain = await screen.findByRole('combobox', { name: /^domain$/i });
    await user.selectOptions(domain, 'diagnostics');
    expect(screen.getByLabelText('location')).toHaveTextContent(
      '/mistakes?domain=diagnostics',
    );
    await router.navigate(-1);
    await waitFor(() => expect(domain).toHaveValue(''));
  });

  it('keeps a missing-version mistake partial, shows redo scores, and disables unsafe retry', async () => {
    const source = repositories();
    vi.mocked(source.mistakes.list).mockResolvedValue([
      mistakeRecord({ redoScores: [55, 80] }),
    ]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(undefined);
    vi.mocked(source.cases.listActive).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MistakesPage repositories={source} />
      </MemoryRouter>,
    );

    const row = await screen.findByRole('article', { name: /mistake-one/i });
    expect(
      within(row).getByText(/exact case version unavailable/i),
    ).toBeVisible();
    expect(
      within(row).getByRole('heading', {
        name: /imported legacy retry scores/i,
      }),
    ).toBeVisible();
    expect(within(row).getByText(/legacy score 55%/i)).toBeVisible();
    expect(within(row).getByText(/legacy score 80%/i)).toBeVisible();
    expect(within(row).getByText(/retry unavailable/i)).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('shows all active content domains and preserves a real zero score', async () => {
    const source = repositories();
    vi.mocked(source.skills.list).mockResolvedValue([
      {
        userId: 'local-user',
        skillId: 'customer.discovery',
        score: 0,
        sampleCount: 1,
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    ]);
    vi.mocked(source.cases.listActive).mockResolvedValue([
      {
        id: 'case-one',
        slug: 'case-one',
        title: 'Case one',
        summary: 'Summary',
        level: 'beginner',
        status: 'published',
        version: 1,
        estimatedMinutes: 10,
        domains: ['customer-discovery'],
        skills: ['customer.discovery'],
        riskTypes: [],
        scenarioSummary: 'Incident',
        technicalLayers: ['application'],
        nodeTypes: ['single-choice'],
      },
    ]);
    render(
      <MemoryRouter>
        <SkillsPage repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findAllByTestId('domain-signal')).toHaveLength(15);
    expect(screen.getByText('0 / 100')).toBeVisible();
    expect(screen.getByText('1 mastery sample')).toBeVisible();
    expect(screen.getByRole('link', { name: /case one/i })).toHaveAttribute(
      'href',
      '/cases?domain=customer-discovery',
    );
  });

  it('retries a failed skill repository load', async () => {
    const user = userEvent.setup();
    const source = repositories();
    vi.mocked(source.cases.listActive)
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <SkillsPage repositories={source} />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /retry/i }));
    expect(await screen.findAllByTestId('domain-signal')).toHaveLength(15);
  });

  it('keeps profile readiness unavailable without active skill evidence', async () => {
    const source = repositories();
    render(
      <MemoryRouter>
        <ProfilePage repositories={source} />
      </MemoryRouter>,
    );
    const readiness = await screen.findByRole('region', {
      name: /engineering readiness/i,
    });
    expect(readiness).toHaveTextContent(/insufficient evidence/i);
    expect(within(readiness).queryByRole('meter')).not.toBeInTheDocument();
    expect(
      within(readiness).getByRole('status', {
        name: /production ai engineer readiness/i,
      }),
    ).not.toHaveAttribute('aria-valuenow');
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('uses active skill sample weights for readiness and loads each exact case version once', async () => {
    const source = repositories();
    const content = createMinimalValidCase();
    content.skills = ['llm.applications', 'cloud.deployment'];
    const mastery: SkillMasteryRecord[] = [
      {
        userId: 'local-user',
        skillId: 'llm.applications',
        score: 80,
        sampleCount: 3,
        updatedAt: '2026-07-13T00:10:00.000Z',
      },
      {
        userId: 'local-user',
        skillId: 'cloud.deployment',
        score: 20,
        sampleCount: 1,
        updatedAt: '2026-07-13T00:10:00.000Z',
      },
    ];
    vi.mocked(source.attempts.list).mockResolvedValue([attempt()]);
    vi.mocked(source.skills.list).mockResolvedValue(mastery);
    vi.mocked(source.cases.getVersion).mockResolvedValue(content);
    render(
      <MemoryRouter>
        <ProfilePage repositories={source} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('meter', {
        name: /production ai engineer readiness/i,
      }),
    ).toHaveAttribute('aria-valuenow', '65');
    expect(screen.getByText('65%')).toBeVisible();
    expect(source.cases.getVersion).toHaveBeenCalledTimes(1);
    expect(source.cases.getVersion).toHaveBeenCalledWith('case-minimal', 1);
    expect(
      screen.getByRole('region', { name: /skill evidence map/i }),
    ).toHaveTextContent(content.title);
  });

  it('excludes only the attempt whose exact profile case version is missing', async () => {
    const source = repositories();
    vi.mocked(source.attempts.list).mockResolvedValue([attempt()]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <ProfilePage repositories={source} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/excluded attempt: 1/i)).toBeVisible();
    expect(screen.getByText(/insufficient evidence/i)).toBeVisible();
    expect(source.cases.getVersion).toHaveBeenCalledWith('case-minimal', 1);
    expect(
      screen.getByRole('region', { name: /identity summary/i }),
    ).toHaveTextContent(/evidence collected\s*0/i);
    expect(
      screen.getByRole('region', { name: /capability evidence timeline/i }),
    ).toHaveTextContent(/no capability evidence yet/i);
    expect(
      screen.getByRole('region', { name: /completed challenges/i }),
    ).toHaveTextContent(/no completed challenges yet/i);
    expect(
      screen.queryByRole('link', { name: /review evidence/i }),
    ).not.toBeInTheDocument();
  });

  it('deduplicates missing profile version labels while counting excluded attempts', async () => {
    const source = repositories();
    vi.mocked(source.attempts.list).mockResolvedValue([
      attempt(),
      { ...attempt(), id: 'attempt-two' },
    ]);
    vi.mocked(source.cases.getVersion).mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <ProfilePage repositories={source} />
      </MemoryRouter>,
    );

    const warning = await screen.findByText(/excluded attempts: 2/i);
    expect(warning).toHaveTextContent('case-minimal@1');
    expect(warning.textContent?.match(/case-minimal@1/g)).toHaveLength(1);
    expect(source.cases.getVersion).toHaveBeenCalledTimes(1);
  });
});
