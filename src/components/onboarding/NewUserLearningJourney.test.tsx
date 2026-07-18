import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { SkillDefinition } from '../../content/contracts';
import type { ConceptSource } from '../../content/concept-source';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import type { FoundationKnowledge } from '../../domain/foundation/types';
import type { CaseSummary } from '../../repositories/contracts';
import { I18nProvider } from '../../i18n';
import {
  LearningJourneyProvider,
  useLearningJourney,
} from './LearningJourneyContext';
import { DashboardLearningJourney } from './DashboardLearningJourney';
import { NewUserLearningJourney } from './NewUserLearningJourney';

const foundations: FoundationKnowledge[] = [
  {
    schemaVersion: 1,
    id: 'api-basic',
    type: 'foundation',
    title: 'API foundation',
    domain: 'computer-basics',
    track: 'computer-basics',
    skills: ['api.integration'],
    level: 'beginner',
    order: 6,
    estimatedMinutes: 7,
    content: {
      simpleExplanation: 'API is a contract between connected systems.',
      analogy: 'API analogy',
      technicalExplanation: 'API technical explanation',
      example: 'API example',
      commonMistakes: 'API mistakes',
    },
    relatedCases: ['case-api'],
  },
  {
    schemaVersion: 1,
    id: 'api.token-authentication',
    type: 'foundation',
    title: 'Authentication foundation',
    domain: 'api',
    track: 'network-api',
    skills: ['api.integration'],
    level: 'beginner',
    order: 18,
    estimatedMinutes: 9,
    content: {
      simpleExplanation: 'Authentication confirms who is calling.',
      analogy: 'Authentication analogy',
      technicalExplanation: 'Authentication technical explanation',
      example: 'Authentication example',
      commonMistakes: 'Authentication mistakes',
    },
    relatedCases: ['case-api'],
  },
];

const concepts: ConceptKnowledge[] = [
  {
    schemaVersion: 1,
    id: 'concept.api',
    type: 'concept',
    category: 'api-backend',
    order: 1,
    title: 'API concept',
    technicalTerm: 'API',
    simpleExplanation: 'API concept explanation',
    analogy: 'API concept analogy',
    technicalExplanation: 'API concept technical explanation',
    whyItMatters: 'Every AI system uses APIs to connect.',
    commonMistakes: 'API concept mistakes',
    relatedFoundation: ['api-basic'],
    relatedCases: ['case-api'],
  },
];

const skills: SkillDefinition[] = [
  {
    schemaVersion: 1,
    id: 'api.integration',
    domainId: 'api-integration',
    label: 'API integration',
    description: 'Reliable API integration',
    status: 'active',
  },
];

const cases: CaseSummary[] = [
  {
    id: 'case-api',
    slug: 'case-api',
    title: 'API permission incident',
    summary: 'Investigate an API permission incident.',
    scenarioSummary: 'A customer API call returns 403.',
    level: 'beginner',
    status: 'published',
    version: 1,
    estimatedMinutes: 12,
    domains: ['api-integration'],
    skills: ['api.integration'],
    riskTypes: ['security'],
    technicalLayers: ['application'],
    nodeTypes: ['single-choice'],
  },
];

function FoundationVisitControls() {
  const { completeMission, markFoundationVisited } = useLearningJourney();
  return (
    <>
      <button onClick={() => completeMission('api-basic')} type="button">
        Attempt API Foundation completion
      </button>
      <button
        onClick={() => markFoundationVisited('api.token-authentication')}
        type="button"
      >
        Mark another Foundation visited
      </button>
      <button onClick={() => markFoundationVisited('api-basic')} type="button">
        Mark API Foundation visited
      </button>
    </>
  );
}

describe('NewUserLearningJourney', () => {
  it('requires visiting the matching Foundation before completing a First Mission', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <LearningJourneyProvider>
            <FoundationVisitControls />
            <NewUserLearningJourney
              attempts={[]}
              cases={cases}
              concepts={concepts}
              foundations={foundations}
              mastery={[]}
              progress={[]}
              skills={skills}
            />
          </LearningJourneyProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Welcome to FDE Arena' }),
    ).toBeVisible();
    expect(
      screen.getByRole('group', {
        name: 'What is your current starting point?',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Your First Mission' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('radio', { name: /completely new to engineering/i }),
    );

    const mission = screen.getByRole('region', { name: 'Your First Mission' });
    expect(mission).toHaveTextContent('API foundation');
    expect(mission).toHaveTextContent('7 min');
    expect(mission).toHaveTextContent(
      'Why this mission: API is a contract between connected systems.',
    );
    expect(
      screen.getByRole('link', { name: 'Start learning API foundation' }),
    ).toHaveAttribute('href', '/foundation/api-basic');
    expect(within(mission).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'FDE Guide' })).toHaveTextContent(
      'API concept',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Attempt API Foundation completion',
      }),
    );
    expect(mission).toHaveTextContent('API foundation');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Mark another Foundation visited' }),
    );
    expect(within(mission).queryByRole('button')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Mark API Foundation visited' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Complete this onboarding step',
      }),
    );
    expect(mission).toHaveTextContent('Authentication foundation');
    expect(mission).toHaveTextContent(
      'Why this mission: Authentication confirms who is calling.',
    );
    expect(
      screen.getByRole('link', {
        name: 'Start learning Authentication foundation',
      }),
    ).toHaveAttribute('href', '/foundation/api.token-authentication');
    expect(within(mission).queryByRole('button')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Mark another Foundation visited' }),
    );
    expect(
      within(mission).getByRole('button', {
        name: 'Complete this onboarding step',
      }),
    ).toBeVisible();

    expect(
      screen.getByRole('region', { name: 'FDE Growth Roadmap' }),
    ).toBeVisible();
    const completion = screen.getByRole('status');
    expect(completion).toHaveTextContent('Onboarding step complete.');
    expect(completion).toHaveTextContent(
      'You completed the learning flow; this does not mean you have achieved Mastery.',
    );
    expect(completion).toHaveTextContent(
      'Completing the related Case will update Mastery.',
    );
    expect(screen.getByText('LEVEL 0')).toBeVisible();
    expect(screen.getByText('LEVEL 3')).toBeVisible();
    expect(screen.getByRole('region', { name: 'FDE Guide' })).toHaveTextContent(
      'No directly related Concept is available for this mission yet.',
    );
  });

  it('keeps Welcome visible for a learner with only an in-progress attempt', () => {
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <LearningJourneyProvider>
            <NewUserLearningJourney
              attempts={[
                {
                  id: 'attempt-existing',
                  userId: 'local-user',
                  caseId: 'case-api',
                  caseVersion: 1,
                  schemaVersion: 1,
                  status: 'in-progress',
                  startedAt: '2026-07-14T00:00:00.000Z',
                  updatedAt: '2026-07-14T00:00:00.000Z',
                  currentNodeId: 'node-one',
                  criticalErrorIds: [],
                  visitedNodeIds: ['node-one'],
                  roundHistory: [],
                },
              ]}
              cases={cases}
              concepts={concepts}
              foundations={foundations}
              mastery={[]}
              progress={[]}
              skills={skills}
            />
          </LearningJourneyProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Welcome to FDE Arena' }),
    ).toBeVisible();
  });

  it('does not force a learner with a completed attempt through Welcome again', () => {
    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <LearningJourneyProvider>
            <NewUserLearningJourney
              attempts={[
                {
                  id: 'attempt-completed',
                  userId: 'local-user',
                  caseId: 'case-api',
                  caseVersion: 1,
                  schemaVersion: 1,
                  status: 'completed',
                  startedAt: '2026-07-14T00:00:00.000Z',
                  updatedAt: '2026-07-14T00:10:00.000Z',
                  completedAt: '2026-07-14T00:10:00.000Z',
                  currentNodeId: null,
                  score: 80,
                  verdict: 'pass',
                  criticalErrorIds: [],
                  visitedNodeIds: ['node-one'],
                  roundHistory: [],
                },
              ]}
              cases={cases}
              concepts={concepts}
              foundations={foundations}
              mastery={[]}
              progress={[]}
              skills={skills}
            />
          </LearningJourneyProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.queryByRole('heading', { name: 'Welcome to FDE Arena' }),
    ).not.toBeInTheDocument();
  });

  it('keeps Welcome usable while the optional Concept sidecar is unresolved', () => {
    const neverLoads = new Promise<readonly ConceptKnowledge[]>(() => {
      // The optional Concept sidecar must never block the first mission.
    });
    const conceptSource: ConceptSource = {
      loadAll: vi.fn(() => neverLoads),
      findById: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <LearningJourneyProvider>
            <DashboardLearningJourney
              attempts={[]}
              cases={cases}
              conceptSource={conceptSource}
              foundations={foundations}
              mastery={[]}
              progress={[]}
              skills={skills}
            />
          </LearningJourneyProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Welcome to FDE Arena' }),
    ).toBeVisible();
    expect(screen.getByRole('region', { name: 'FDE Guide' })).toHaveTextContent(
      'Choose your starting point',
    );
    expect(
      screen.getByRole('region', { name: 'FDE Growth Roadmap' }),
    ).not.toHaveTextContent('0 Concepts');
  });

  it('fails open when the optional Concept source throws synchronously', () => {
    const conceptSource: ConceptSource = {
      loadAll: vi.fn(() => {
        throw new Error('Synchronous Concept failure');
      }),
      findById: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <LearningJourneyProvider>
            <DashboardLearningJourney
              attempts={[]}
              cases={cases}
              conceptSource={conceptSource}
              foundations={foundations}
              mastery={[]}
              progress={[]}
              skills={skills}
            />
          </LearningJourneyProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Welcome to FDE Arena' }),
    ).toBeVisible();
  });

  it('does not recommend an unrelated Concept as the mission guide', async () => {
    const user = userEvent.setup();
    const unrelated = concepts.map((conceptItem) => ({
      ...conceptItem,
      id: 'concept.unrelated',
      title: 'Unrelated concept',
      relatedFoundation: ['another-foundation'],
      relatedCases: ['another-case'],
    }));

    render(
      <I18nProvider initialLanguage="en-US">
        <MemoryRouter>
          <LearningJourneyProvider>
            <NewUserLearningJourney
              attempts={[]}
              cases={cases}
              concepts={unrelated}
              foundations={foundations}
              mastery={[]}
              progress={[]}
              skills={skills}
            />
          </LearningJourneyProvider>
        </MemoryRouter>
      </I18nProvider>,
    );
    await user.click(
      screen.getByRole('radio', { name: /completely new to engineering/i }),
    );

    const guide = screen.getByRole('region', { name: 'FDE Guide' });
    expect(guide).toHaveTextContent(
      'No directly related Concept is available for this mission yet.',
    );
    expect(guide).not.toHaveTextContent('Unrelated concept');
  });
});
