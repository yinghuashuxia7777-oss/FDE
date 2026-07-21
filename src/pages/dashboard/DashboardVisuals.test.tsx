import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { CapabilitySignal } from './capability-map-data';
import { CapabilityMapCard, GrowthMissionCard } from './DashboardVisuals';

it('presents the daily mission as Learn, Practice, Challenge, and Evidence', () => {
  render(
    <MemoryRouter>
      <GrowthMissionCard
        complete={false}
        completeDescription="Complete"
        completeTitle="Complete"
        description="One evidence loop"
        label="TODAY'S GROWTH MISSION"
        steps={[
          {
            label: 'Learn',
            title: 'HTTP Retry',
            to: '/foundation/retry',
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
            title: 'Webhook failure',
            to: '/training/webhook',
            type: 'challenge',
          },
          {
            label: 'Evidence',
            title: 'Backend Reliability',
            to: '/profile',
            type: 'evidence',
          },
        ]}
        title="Day 1"
      />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('region', { name: "TODAY'S GROWTH MISSION" }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: /HTTP Retry/i })).toHaveAttribute(
    'href',
    '/foundation/retry',
  );
  expect(
    screen.getByRole('link', { name: /Backend Reliability/i }),
  ).toHaveAttribute('href', '/profile');
});

const baseProps = {
  confidenceLabel: 'Confidence',
  coreEvidence: 'Build capability proof',
  coreLabel: 'AI Engineer',
  levelLabel: 'Level',
  legendItems: [
    {
      label: 'Learning',
      mastery: 'learning' as const,
    },
  ],
  linkLabel: 'View full capability map',
  sourceLabel: 'Real capability evidence',
  title: 'Capability map',
  viewLabel: 'Viewing: Mastery',
};

function capability(mastery: CapabilitySignal['mastery']): CapabilitySignal {
  return {
    confidence: 'Medium',
    evidence: '3 training samples',
    label: 'LLM application',
    level: mastery === 'competent' ? 3 : 2,
    mastery,
    score: mastery === 'not-started' ? undefined : 62,
    skillId: 'llm.applications',
    sourceLabel: 'LLM application engineering',
    statusLabel: mastery,
  };
}

function map(signals: readonly CapabilitySignal[], badgeLabel?: string) {
  return (
    <MemoryRouter>
      <CapabilityMapCard
        {...baseProps}
        badgeLabel={badgeLabel}
        signals={signals}
      />
    </MemoryRouter>
  );
}

describe('Capability Map evolution feedback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not present existing mastery as a new promotion on initial render', () => {
    render(map([capability('competent')]));

    const capabilityMap = screen.getByRole('figure', {
      name: 'Capability map',
    });
    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).not.toHaveAttribute('data-evolving');
    expect(
      capabilityMap.querySelector('.capability-orbit__core'),
    ).not.toHaveAttribute('data-evolving');
  });

  it('marks an upgraded node and the center core for one transient response', () => {
    vi.useFakeTimers();
    const { rerender } = render(map([capability('learning')]));

    rerender(map([capability('competent')]));

    const capabilityMap = screen.getByRole('figure', {
      name: 'Capability map',
    });
    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).toHaveAttribute('data-evolving', 'true');
    expect(
      capabilityMap.querySelector('.capability-orbit__core'),
    ).toHaveAttribute('data-evolving', 'true');

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).not.toHaveAttribute('data-evolving');
    expect(
      capabilityMap.querySelector('.capability-orbit__core'),
    ).not.toHaveAttribute('data-evolving');
  });

  it('treats the first real evidence as growth instead of comparing it with demo mastery', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      map([capability('proficient')], 'Demo Profile'),
    );

    rerender(map([capability('learning')]));

    const capabilityMap = screen.getByRole('figure', {
      name: 'Capability map',
    });
    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).toHaveAttribute('data-evolving', 'true');
    expect(
      capabilityMap.querySelector('.capability-orbit__core'),
    ).toHaveAttribute('data-evolving', 'true');
  });

  it('clears real evolution feedback immediately when the map returns to Demo mode', () => {
    vi.useFakeTimers();
    const { rerender } = render(map([capability('learning')]));

    rerender(map([capability('competent')]));
    const capabilityMap = screen.getByRole('figure', {
      name: 'Capability map',
    });
    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).toHaveAttribute('data-evolving', 'true');

    rerender(map([capability('proficient')], 'Demo Profile'));

    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).not.toHaveAttribute('data-evolving');
    expect(
      capabilityMap.querySelector('.capability-orbit__core'),
    ).not.toHaveAttribute('data-evolving');
  });

  it('does not present an unchanged or downgraded state as growth', () => {
    const { rerender } = render(map([capability('competent')]));

    rerender(map([capability('competent')]));
    rerender(map([capability('learning')]));

    const capabilityMap = screen.getByRole('figure', {
      name: 'Capability map',
    });
    expect(
      capabilityMap.querySelector('[data-skill-id="llm.applications"]'),
    ).not.toHaveAttribute('data-evolving');
    expect(
      capabilityMap.querySelector('.capability-orbit__core'),
    ).not.toHaveAttribute('data-evolving');
  });
});
