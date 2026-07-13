import { render, screen, within } from '@testing-library/react';

import type { TrainingFeedback } from '../../application/training';
import type {
  ChoiceCaseNode,
  ConsequenceDelta,
} from '../../domain/cases/types';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { AdaptiveFeedback } from './AdaptiveFeedback';
import { ConsequenceMeter } from './ConsequenceMeter';
import { TrainingProgress } from './TrainingProgress';

function nodeFixture(): ChoiceCaseNode {
  return structuredClone(createMinimalValidCase().nodes[0]!) as ChoiceCaseNode;
}

function feedback(
  kind: TrainingFeedback['kind'],
  overrides: Partial<TrainingFeedback> = {},
): TrainingFeedback {
  const node = nodeFixture();
  const revealed = kind === 'revealedAnswer';
  const message =
    kind === 'firstWrong'
      ? node.feedback.firstWrong
      : kind === 'secondWrong'
        ? node.feedback.secondWrong
        : node.feedback.revealedAnswer;

  return {
    kind,
    message,
    errorTypes: ['unsupported-action'],
    revealed,
    ...overrides,
  };
}

describe('AdaptiveFeedback', () => {
  it('renders no authored answer material when there is no feedback', () => {
    const node = nodeFixture();
    const { container } = render(
      <AdaptiveFeedback node={node} feedback={null} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText(node.feedback.revealedAnswer),
    ).not.toBeInTheDocument();
    for (const option of node.options) {
      expect(screen.queryByText(option.explanation)).not.toBeInTheDocument();
    }
  });

  it('shows only the first hint and error types after the first wrong answer', () => {
    const node = nodeFixture();
    const { container } = render(
      <AdaptiveFeedback node={node} feedback={feedback('firstWrong')} />,
    );

    const region = screen.getByRole('status', { name: 'First hint' });
    expect(region).toHaveTextContent('First hint');
    expect(region).toHaveTextContent(node.feedback.firstWrong);
    expect(region).toHaveTextContent('unsupported-action');
    expect(region).not.toHaveTextContent(node.feedback.revealedAnswer);
    expect(container).not.toHaveTextContent(node.answer.correctOptionId);
    for (const option of node.options) {
      expect(region).not.toHaveTextContent(option.explanation);
    }
  });

  it('keeps the answer and option explanations hidden after the second wrong answer', () => {
    const node = nodeFixture();
    const { container } = render(
      <AdaptiveFeedback node={node} feedback={feedback('secondWrong')} />,
    );

    const region = screen.getByRole('status', { name: 'Second hint' });
    expect(region).toHaveTextContent('Second hint');
    expect(region).toHaveTextContent(node.feedback.secondWrong);
    expect(region).toHaveTextContent('unsupported-action');
    expect(region).not.toHaveTextContent(node.feedback.revealedAnswer);
    expect(container).not.toHaveTextContent(node.answer.correctOptionId);
    for (const option of node.options) {
      expect(region).not.toHaveTextContent(option.explanation);
    }
  });

  it('does not trust a first-round feedback object that incorrectly claims reveal', () => {
    const node = nodeFixture();
    render(
      <AdaptiveFeedback
        node={node}
        feedback={feedback('firstWrong', { revealed: true })}
      />,
    );

    const region = screen.getByRole('status', { name: 'First hint' });
    expect(region).not.toHaveTextContent(node.feedback.revealedAnswer);
    for (const option of node.options) {
      expect(region).not.toHaveTextContent(option.explanation);
    }
  });

  it('keeps authored answer text hidden when reveal metadata is inconsistent', () => {
    const node = nodeFixture();
    render(
      <AdaptiveFeedback
        node={node}
        feedback={feedback('revealedAnswer', { revealed: false })}
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Answer remains hidden' }),
    ).not.toHaveTextContent(node.feedback.revealedAnswer);
    for (const option of node.options) {
      expect(screen.queryByText(option.explanation)).not.toBeInTheDocument();
    }
  });

  it('reveals the authored answer and every option explanation only at reveal', () => {
    const node = nodeFixture();
    render(
      <AdaptiveFeedback node={node} feedback={feedback('revealedAnswer')} />,
    );

    const region = screen.getByRole('status', { name: 'Answer revealed' });
    expect(region).toHaveTextContent('Answer revealed');
    expect(region).toHaveTextContent(node.feedback.revealedAnswer);
    for (const option of node.options) {
      expect(region).toHaveTextContent(option.label);
      expect(region).toHaveTextContent(option.explanation);
    }
  });
});

describe('ConsequenceMeter', () => {
  const consequences: ConsequenceDelta[] = [
    {
      timeDelta: 5,
      costDelta: 10,
      trustDelta: -2,
      riskDelta: 1,
      message: 'Diagnosis was delayed.',
    },
    {
      timeDelta: -1,
      costDelta: 2,
      trustDelta: -1,
      riskDelta: 4,
      message: 'Customer confidence fell.',
    },
  ];

  it('aggregates every consequence dimension and retains every message', () => {
    render(
      <ConsequenceMeter consequences={consequences} criticalErrorIds={[]} />,
    );

    const meter = screen.getByRole('region', { name: 'Consequence summary' });
    expect(within(meter).getByText('Time').parentElement).toHaveTextContent(
      '+4',
    );
    expect(within(meter).getByText('Cost').parentElement).toHaveTextContent(
      '+12',
    );
    expect(within(meter).getByText('Trust').parentElement).toHaveTextContent(
      '−3',
    );
    expect(within(meter).getByText('Risk').parentElement).toHaveTextContent(
      '+5',
    );
    expect(meter).toHaveTextContent('No critical risk recorded');
    expect(meter).toHaveTextContent('Diagnosis was delayed.');
    expect(meter).toHaveTextContent('Customer confidence fell.');
  });

  it('announces a critical risk with text and a Phosphor icon', () => {
    const { container } = render(
      <ConsequenceMeter
        consequences={consequences}
        criticalErrorIds={['unsafe-production-change']}
      />,
    );

    const alert = screen.getByRole('alert', { name: 'Critical risk' });
    expect(alert).toHaveTextContent('Critical risk');
    expect(alert).toHaveTextContent('1 critical error recorded');
    expect(
      container.querySelector('[data-critical-risk] svg'),
    ).toBeInTheDocument();
  });

  it('preserves repeated messages instead of deduplicating them', () => {
    render(
      <ConsequenceMeter
        consequences={[
          { message: 'Repeated operational impact.' },
          { message: 'Repeated operational impact.' },
        ]}
        criticalErrorIds={[]}
      />,
    );

    expect(screen.getAllByText('Repeated operational impact.')).toHaveLength(2);
  });
});

describe('TrainingProgress', () => {
  it('shows score-based completion against the complete visited path', () => {
    render(
      <TrainingProgress
        scoreEntries={[
          { earnedPoints: 6, possiblePoints: 10 },
          { earnedPoints: 3, possiblePoints: 5 },
        ]}
        visitedNodeIds={['node-a', 'node-b', 'node-c']}
      />,
    );

    const progress = screen.getByRole('progressbar', {
      name: 'Training progress',
    });
    expect(progress).toHaveAttribute('value', '2');
    expect(progress).toHaveAttribute('max', '3');
    expect(screen.getByText('2 of 3 decisions resolved')).toBeInTheDocument();
    expect(screen.getByText('Current score: 60%')).toBeInTheDocument();
  });

  it('keeps repeated nodes in the visible path and clamps progress for cycles', () => {
    render(
      <TrainingProgress
        scoreEntries={[
          { earnedPoints: 1, possiblePoints: 1 },
          { earnedPoints: 1, possiblePoints: 1 },
          { earnedPoints: 1, possiblePoints: 1 },
          { earnedPoints: 1, possiblePoints: 1 },
        ]}
        visitedNodeIds={['node-a', 'node-b', 'node-a']}
      />,
    );

    const progress = screen.getByRole('progressbar', {
      name: 'Training progress',
    });
    expect(progress).toHaveAttribute('value', '3');
    expect(progress).toHaveAttribute('max', '3');
    expect(screen.getByText('3 of 3 decisions resolved')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Visited decision path' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['node-a', 'node-b', 'node-a']);
  });

  it('uses valid native progress bounds before any path is available', () => {
    render(<TrainingProgress scoreEntries={[]} visitedNodeIds={[]} />);

    const progress = screen.getByRole('progressbar', {
      name: 'Training progress',
    });
    expect(progress).toHaveAttribute('value', '0');
    expect(progress).toHaveAttribute('max', '1');
    expect(screen.getByText('0 of 0 decisions resolved')).toBeInTheDocument();
    expect(screen.getByText('No decisions visited yet')).toBeInTheDocument();
  });
});
