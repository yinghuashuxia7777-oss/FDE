/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type {
  ContentManagement,
  ProductRepositories,
} from '../../application/product';
import type { SkillDefinition } from '../../content/contracts';
import type { FdeCase } from '../../domain/cases/types';
import { I18nProvider } from '../../i18n';
import type {
  CaseSummary,
  CompletedAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { ProfilePage } from './ProfilePage';

const domain = {
  schemaVersion: 1,
  id: 'ai-engineering',
  label: 'AI Engineering',
  description: 'Production AI engineering capability.',
  status: 'active',
} as const;

const skills: SkillDefinition[] = [
  {
    schemaVersion: 1,
    id: 'llm.applications',
    domainId: domain.id,
    label: 'LLM Application',
    description: 'Build evidence-backed LLM applications.',
    status: 'active',
  },
  {
    schemaVersion: 1,
    id: 'cloud.deployment',
    domainId: domain.id,
    label: 'Cloud Deployment',
    description: 'Deploy AI workloads safely.',
    status: 'active',
  },
  {
    schemaVersion: 1,
    id: 'reliability.observability',
    domainId: domain.id,
    label: 'Reliability Engineering',
    description: 'Diagnose and operate production systems.',
    status: 'active',
  },
];

function caseFixture(
  id: string,
  title: string,
  skillIds: string[],
  level: FdeCase['level'],
): FdeCase {
  const base = createMinimalValidCase();
  return {
    ...base,
    id,
    slug: id,
    title,
    level,
    status: 'published',
    domains: [domain.id],
    skills: skillIds,
    metadata: {
      ...base.metadata,
      reviewedAt: '2026-07-01T00:00:00.000Z',
      reviewer: 'FDE reviewer',
    },
  };
}

const agentCase = caseFixture(
  'agent-architecture-review',
  'Agent Architecture Review',
  ['llm.applications'],
  'advanced',
);

const reliabilityCase = caseFixture(
  'cloud-reliability-incident',
  'Cloud Reliability Incident',
  ['cloud.deployment', 'reliability.observability'],
  'intermediate',
);

function completedAttempt(
  id: string,
  caseContent: FdeCase,
  completedAt: string,
  score: number,
  verdict: CompletedAttemptRecord['verdict'],
): CompletedAttemptRecord {
  return {
    id,
    userId: 'local-user',
    caseId: caseContent.id,
    caseVersion: caseContent.metadata.version,
    schemaVersion: 1,
    status: 'completed',
    startedAt: completedAt,
    updatedAt: completedAt,
    completedAt,
    currentNodeId: null,
    score,
    verdict,
    criticalErrorIds: [],
    visitedNodeIds: [],
    roundHistory: [],
  };
}

const attempts: CompletedAttemptRecord[] = [
  completedAttempt(
    'attempt-old-agent',
    agentCase,
    '2026-07-10T08:00:00.000Z',
    92,
    'pass',
  ),
  completedAttempt(
    'attempt-middle-reliability',
    reliabilityCase,
    '2026-07-11T08:00:00.000Z',
    45,
    'fail',
  ),
  completedAttempt(
    'attempt-latest-agent',
    agentCase,
    '2026-07-12T08:00:00.000Z',
    95,
    'excellent',
  ),
];

const mastery: SkillMasteryRecord[] = [
  {
    userId: 'local-user',
    skillId: 'llm.applications',
    score: 60,
    sampleCount: 2,
    updatedAt: '2026-07-12T08:00:00.000Z',
  },
  {
    userId: 'local-user',
    skillId: 'cloud.deployment',
    score: 59,
    sampleCount: 1,
    updatedAt: '2026-07-11T08:00:00.000Z',
  },
  {
    userId: 'local-user',
    skillId: 'reliability.observability',
    score: 80,
    sampleCount: 1,
    updatedAt: '2026-07-11T08:00:00.000Z',
  },
];

const criticalMistake: MistakeRecord = {
  id: 'critical-reliability-mistake',
  userId: 'local-user',
  attemptId: 'attempt-middle-reliability',
  caseId: reliabilityCase.id,
  caseVersion: reliabilityCase.metadata.version,
  nodeId: 'node-1',
  submission: { type: 'choice', selectedOptionIds: ['option-b'] },
  correctSubmission: { type: 'choice', selectedOptionIds: ['option-a'] },
  errorTypes: ['risk-awareness-gap'],
  evidenceIds: ['evidence-1'],
  skillIds: ['reliability.observability'],
  critical: true,
  createdAt: '2026-07-11T08:00:00.000Z',
  redoScores: [],
};

interface RepositoryData {
  attempts?: CompletedAttemptRecord[];
  cases?: FdeCase[];
  mastery?: SkillMasteryRecord[];
  mistakes?: MistakeRecord[];
  skills?: SkillDefinition[];
}

function toSummary(caseContent: FdeCase): CaseSummary {
  return {
    id: caseContent.id,
    slug: caseContent.slug,
    title: caseContent.title,
    summary: caseContent.summary,
    level: caseContent.level,
    status: caseContent.status,
    version: caseContent.metadata.version,
    estimatedMinutes: caseContent.estimatedMinutes,
    domains: caseContent.domains,
    skills: caseContent.skills,
    riskTypes: caseContent.riskTypes,
    scenarioSummary: caseContent.scenario.initialIncident,
    technicalLayers: caseContent.technicalLayers,
    nodeTypes: [...new Set(caseContent.nodes.map(({ type }) => type))],
  };
}

function repositories(data: RepositoryData = {}): ProductRepositories {
  const completed = data.attempts ?? [];
  const caseContents = data.cases ?? [];
  const skillDefinitions = data.skills ?? [];
  const caseByVersion = new Map(
    caseContents.map((caseContent) => [
      `${caseContent.id}@${String(caseContent.metadata.version)}`,
      caseContent,
    ]),
  );
  const summaries = caseContents.map(toSummary);

  return {
    attempts: {
      get: vi.fn((id) =>
        Promise.resolve(completed.find((attempt) => attempt.id === id)),
      ),
      list: vi.fn().mockResolvedValue(completed),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue(summaries),
      listActive: vi.fn().mockResolvedValue(summaries),
      getVersion: vi.fn((caseId, version) =>
        Promise.resolve(caseByVersion.get(`${caseId}@${String(version ?? 1)}`)),
      ),
      seed: vi.fn(),
    },
    content: {
      getActiveCatalog: vi.fn().mockResolvedValue(undefined),
      getActivePack: vi.fn().mockResolvedValue(undefined),
      getInstalledPack: vi.fn().mockResolvedValue(undefined),
      listInstalledPacks: vi.fn().mockResolvedValue([]),
      countHistoricalCaseVersions: vi.fn().mockResolvedValue(0),
      listActiveDomains: vi.fn().mockResolvedValue([domain]),
      listActiveSkills: vi.fn().mockResolvedValue(skillDefinitions),
      findDomainDefinition: vi.fn((id) =>
        Promise.resolve(id === domain.id ? domain : undefined),
      ),
      findSkillDefinition: vi.fn((id) =>
        Promise.resolve(skillDefinitions.find((skill) => skill.id === id)),
      ),
    },
    contentManagement: {} as ContentManagement,
    mistakes: {
      get: vi.fn((id) =>
        Promise.resolve(
          (data.mistakes ?? []).find((mistake) => mistake.id === id),
        ),
      ),
      list: vi.fn().mockResolvedValue(data.mistakes ?? []),
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
      get: vi.fn((_userId, skillId) =>
        Promise.resolve(
          (data.mastery ?? []).find((record) => record.skillId === skillId),
        ),
      ),
      list: vi.fn().mockResolvedValue(data.mastery ?? []),
      save: vi.fn(),
      saveMany: vi.fn(),
    },
  };
}

function renderProfile(source: ProductRepositories) {
  return render(
    <I18nProvider initialLanguage="en-US">
      <MemoryRouter>
        <ProfilePage repositories={source} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

function richRepositories() {
  return repositories({
    attempts,
    cases: [agentCase, reliabilityCase],
    mastery,
    mistakes: [criticalMistake],
    skills,
  });
}

describe('Capability Profile', () => {
  it('summarizes trusted identity evidence and reuses weighted readiness', async () => {
    const source = richRepositories();
    renderProfile(source);

    expect(
      await screen.findByRole('heading', {
        name: 'AI Engineer Capability Profile',
      }),
    ).toBeVisible();

    const identity = screen.getByRole('region', {
      name: 'Identity summary',
    });
    expect(identity).toHaveTextContent(/Evidence collected\s*3/i);
    expect(identity).toHaveTextContent(/Completed challenges\s*2/i);
    expect(identity).toHaveTextContent(/Last active\s*Jul 12, 2026/i);

    const readiness = screen.getByRole('region', {
      name: 'Engineering readiness',
    });
    const meter = within(readiness).getByRole('meter', {
      name: 'Production AI Engineer readiness',
    });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '65');
    expect(readiness).toHaveTextContent('65%');
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

  it('maps real skill evidence into strengths, growth areas, and latest cases', async () => {
    renderProfile(richRepositories());

    const skillMap = await screen.findByRole('region', {
      name: 'Skill evidence map',
    });
    const llm = within(skillMap).getByRole('article', {
      name: 'LLM Application',
    });
    expect(llm).toHaveTextContent(/Competent/i);
    expect(llm).toHaveTextContent(/Evidence\s*2 samples/i);
    expect(llm).toHaveTextContent(/Latest\s*Agent Architecture Review/i);

    const strengths = screen.getByRole('region', { name: 'Strengths' });
    expect(strengths).toHaveTextContent('LLM Application');
    expect(strengths).not.toHaveTextContent('Cloud Deployment');
    expect(strengths).not.toHaveTextContent('Reliability Engineering');

    const growth = screen.getByRole('region', { name: 'Growth areas' });
    expect(growth).toHaveTextContent('Cloud Deployment');
    expect(growth).toHaveTextContent('Reliability Engineering');
    expect(growth).toHaveTextContent(/critical/i);
  });

  it('sorts capability evidence newest first and deduplicates completed challenges', async () => {
    renderProfile(richRepositories());

    const timeline = await screen.findByRole('region', {
      name: 'Capability evidence timeline',
    });
    const evidenceItems = within(timeline).getAllByRole('listitem');
    expect(evidenceItems).toHaveLength(3);
    expect(evidenceItems[0]).toHaveTextContent(
      /Agent Architecture Review.*95/s,
    );
    expect(evidenceItems[1]).toHaveTextContent(
      /Cloud Reliability Incident.*45/s,
    );
    expect(evidenceItems[2]).toHaveTextContent(
      /Agent Architecture Review.*92/s,
    );
    expect(
      within(evidenceItems[0]!).getByRole('link', {
        name: /review evidence/i,
      }),
    ).toHaveAttribute('href', '/debrief/attempt-latest-agent');

    const challenges = screen.getByRole('region', {
      name: 'Completed challenges',
    });
    expect(
      within(challenges).getAllByText('Agent Architecture Review'),
    ).toHaveLength(1);
    expect(
      within(challenges).getAllByText('Cloud Reliability Incident'),
    ).toHaveLength(1);
    expect(challenges).toHaveTextContent(/Advanced/i);
    expect(challenges).toHaveTextContent(/Intermediate/i);
    expect(challenges).toHaveTextContent('LLM Application');
    expect(challenges).toHaveTextContent('Cloud Deployment');
  });

  it('keeps every capability section accessible and honest when no evidence exists', async () => {
    renderProfile(repositories({ skills }));

    expect(
      await screen.findByRole('heading', {
        name: 'AI Engineer Capability Profile',
      }),
    ).toBeVisible();

    const readiness = screen.getByRole('region', {
      name: 'Engineering readiness',
    });
    expect(within(readiness).queryByRole('meter')).not.toBeInTheDocument();
    const emptyReadiness = within(readiness).getByRole('status', {
      name: 'Production AI Engineer readiness',
    });
    expect(emptyReadiness).not.toHaveAttribute('aria-valuenow');
    expect(readiness).toHaveTextContent(/Insufficient evidence/i);

    const skillMap = screen.getByRole('region', {
      name: 'Skill evidence map',
    });
    expect(skillMap).toHaveTextContent(/No skill evidence yet/i);
    expect(within(skillMap).queryByRole('article')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Capability evidence timeline' }),
    ).toHaveTextContent(/No capability evidence yet/i);
    expect(
      screen.getByRole('region', { name: 'Completed challenges' }),
    ).toHaveTextContent(/No completed challenges yet/i);
  });
});
