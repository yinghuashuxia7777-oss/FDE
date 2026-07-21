import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { I18nProvider } from '../../i18n';
import type { CapabilitySignal } from './capability-map-data';
import { FirstLoopPreview } from './FirstLoopPreview';

const capabilityIds = [
  'llm.applications',
  'agents.evaluation',
  'rag.search',
  'software.foundations',
  'cloud.deployment',
  'systems.networking',
  'reliability.observability',
] as const;

const signals: CapabilitySignal[] = capabilityIds.map((skillId) => ({
  confidence: 'No confidence yet',
  evidence: 'Complete a challenge to build capability evidence',
  label: skillId,
  level: 0,
  mastery: 'not-started',
  score: undefined,
  skillId,
  sourceLabel: skillId,
  statusLabel: 'No evidence yet',
}));

it('previews one truthful capability unlock after the first growth loop', () => {
  render(
    <I18nProvider initialLanguage="en-US">
      <MemoryRouter>
        <FirstLoopPreview
          previewSkillId="reliability.observability"
          signals={signals}
          steps={[
            {
              label: 'Learn',
              title: 'HTTP Retry',
              to: '/foundation/http-retry',
              type: 'learn',
            },
            {
              label: 'Practice',
              title: 'Design retry strategy',
              to: '/practices/retry',
              type: 'practice',
            },
            {
              label: 'Challenge',
              title: 'Webhook failure case',
              to: '/training/webhook-failure',
              type: 'challenge',
            },
            {
              label: 'Evidence',
              title: 'Reliability',
              to: '/profile',
              type: 'evidence',
            },
          ]}
        />
      </MemoryRouter>
    </I18nProvider>,
  );

  const preview = screen.getByRole('region', {
    name: 'Your capability profile starts here',
  });
  expect(preview).toHaveTextContent('+1');
  expect(preview).toHaveTextContent('Learn');
  expect(preview).toHaveTextContent('Practice');
  expect(preview).toHaveTextContent('Challenge');
  expect(preview).toHaveTextContent('Evidence');

  const map = within(preview).getByRole('figure', {
    name: 'First capability unlock preview',
  });
  const pendingNode = map.querySelector(
    '[data-skill-id="reliability.observability"]',
  );
  expect(pendingNode).toHaveAttribute('data-preview', 'true');
  expect(pendingNode).toHaveAttribute('data-mastery', 'not-started');
  expect(pendingNode).toHaveTextContent('Lights up after the first loop');
  expect(map).not.toHaveTextContent('Demo Profile');
  expect(map).not.toHaveTextContent('72%');
});
