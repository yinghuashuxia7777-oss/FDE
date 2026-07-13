import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  CaseNode,
  ChoiceNodeType,
  EvidenceConclusionCaseNode,
  MatchingCaseNode,
  MultipleChoiceCaseNode,
  NodeSubmission,
  OrderingCaseNode,
} from '../../domain/cases/types';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { QuestionRenderer } from './QuestionRenderer';

function baseNode(): CaseNode {
  return structuredClone(createMinimalValidCase().nodes[0]!);
}

function choiceNode(type: ChoiceNodeType, id = `node-${type}`): CaseNode {
  return { ...baseNode(), id, type } as CaseNode;
}

function multipleNode(id = 'node-multiple'): MultipleChoiceCaseNode {
  return {
    ...baseNode(),
    id,
    type: 'multiple-choice',
    options: [
      { id: 'logs', label: 'Inspect logs', explanation: 'Supported.' },
      { id: 'trace', label: 'Inspect trace', explanation: 'Supported.' },
      { id: 'restart', label: 'Restart everything', explanation: 'Risky.' },
    ],
    answer: { correctOptionIds: ['logs', 'trace'] },
  };
}

function orderingNode(): OrderingCaseNode {
  return {
    ...baseNode(),
    id: 'node-ordering',
    type: 'ordering',
    prompt: 'Order the response actions',
    options: [
      { id: 'verify', label: 'Verify recovery', explanation: 'Last.' },
      { id: 'inspect', label: 'Inspect evidence', explanation: 'First.' },
      { id: 'repair', label: 'Repair cause', explanation: 'Second.' },
    ],
    answer: { orderedOptionIds: ['inspect', 'repair', 'verify'] },
  };
}

function matchingNode(): MatchingCaseNode {
  return {
    ...baseNode(),
    id: 'node-matching',
    type: 'matching',
    prompt: 'Match each signal to its source',
    options: [
      { id: 'service', label: 'Service', explanation: 'Source.' },
      { id: 'trace-value', label: 'Trace span', explanation: 'Target.' },
      { id: 'database', label: 'Database', explanation: 'Source.' },
      { id: 'query-value', label: 'Slow query', explanation: 'Target.' },
    ],
    answer: {
      pairs: { service: 'query-value', database: 'trace-value' },
    },
  };
}

function evidenceNode(): EvidenceConclusionCaseNode {
  return {
    ...baseNode(),
    id: 'node-evidence',
    type: 'evidence-conclusion',
    prompt: 'Choose a conclusion and its supporting evidence',
    options: [
      { id: 'dependency', label: 'Dependency failed', explanation: 'Right.' },
      { id: 'network', label: 'Network failed', explanation: 'Wrong.' },
    ],
    evidence: [
      { id: 'health', type: 'log', title: 'Health check', content: '503' },
      { id: 'trace', type: 'text', title: 'Trace', content: 'timeout' },
    ],
    answer: { conclusionId: 'dependency', evidenceIds: ['health', 'trace'] },
  };
}

describe('QuestionRenderer choice family', () => {
  it.each<ChoiceNodeType>([
    'single-choice',
    'true-false',
    'log-analysis',
    'command-choice',
    'diff-review',
    'configuration-review',
    'architecture-tradeoff',
    'customer-response',
  ])(
    'submits a complete %s choice without leaking explanations',
    async (type) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
      const node = choiceNode(type);
      render(<QuestionRenderer node={node} onSubmit={onSubmit} />);

      expect(
        screen.getByRole('group', { name: node.prompt }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('This follows the available evidence.'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Submit decision' }),
      ).toBeDisabled();

      await user.click(
        screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
      );
      await user.click(screen.getByRole('button', { name: 'Submit decision' }));

      expect(onSubmit).toHaveBeenCalledWith({
        type: 'choice',
        selectedOptionIds: ['option-a'],
      });
    },
  );

  it('disables every control while persistence is pending', () => {
    render(
      <QuestionRenderer
        node={choiceNode('single-choice')}
        onSubmit={vi.fn()}
        disabled
      />,
    );

    expect(
      screen
        .getAllByRole('radio')
        .every((radio) => radio.hasAttribute('disabled')),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();
  });
});

describe('QuestionRenderer multiple choice', () => {
  it('submits the exact partial selection rather than filling authored answers', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
    render(<QuestionRenderer node={multipleNode()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('checkbox', { name: 'Inspect logs' }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'choice',
      selectedOptionIds: ['logs'],
    });
  });

  it('preserves every selected option in authored display order', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
    render(<QuestionRenderer node={multipleNode()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('checkbox', { name: 'Inspect trace' }));
    await user.click(screen.getByRole('checkbox', { name: 'Inspect logs' }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'choice',
      selectedOptionIds: ['logs', 'trace'],
    });
  });
});

describe('QuestionRenderer ordering', () => {
  it('starts with authored option order and submits the complete permutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
    render(<QuestionRenderer node={orderingNode()} onSubmit={onSubmit} />);

    expect(
      within(screen.getByRole('list', { name: 'Current action order' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Verify recovery'),
      expect.stringContaining('Inspect evidence'),
      expect.stringContaining('Repair cause'),
    ]);

    await user.click(
      screen.getByRole('button', { name: 'Move Inspect evidence up' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'ordering',
      orderedOptionIds: ['inspect', 'verify', 'repair'],
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Inspect evidence moved to position 1',
    );
  });

  it('offers keyboard-operable move controls with disabled boundaries', async () => {
    const user = userEvent.setup();
    render(<QuestionRenderer node={orderingNode()} onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Move Verify recovery up' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Repair cause down' }),
    ).toBeDisabled();

    const moveDown = screen.getByRole('button', {
      name: 'Move Verify recovery down',
    });
    moveDown.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Verify recovery moved to position 2',
    );
  });
});

describe('QuestionRenderer matching', () => {
  it('starts every pair blank and does not encode the authored mapping as a selected DOM value', () => {
    render(<QuestionRenderer node={matchingNode()} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Match Service')).toHaveValue('');
    expect(screen.getByLabelText('Match Database')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();
    expect(screen.queryByDisplayValue('query-value')).not.toBeInTheDocument();
  });

  it('warns about duplicate targets and submits only a complete bijection', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
    render(<QuestionRenderer node={matchingNode()} onSubmit={onSubmit} />);
    const service = screen.getByLabelText('Match Service');
    const database = screen.getByLabelText('Match Database');

    await user.selectOptions(service, 'Slow query');
    await user.selectOptions(database, 'Slow query');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Each target can be matched only once',
    );
    expect(
      screen.getByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();

    await user.selectOptions(database, 'Trace span');
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    expect(onSubmit).toHaveBeenCalledWith({
      type: 'matching',
      pairs: { service: 'query-value', database: 'trace-value' },
    });
  });
});

describe('QuestionRenderer evidence conclusion', () => {
  it('requires both layers and preserves the conclusion and evidence IDs', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
    render(<QuestionRenderer node={evidenceNode()} onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: 'Submit decision' });

    expect(
      screen.getByRole('group', { name: 'Conclusion' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Supporting evidence' }),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Dependency failed' }));
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Health check' }));
    await user.click(screen.getByRole('checkbox', { name: 'Trace' }));
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'evidence-conclusion',
      conclusionId: 'dependency',
      evidenceIds: ['health', 'trace'],
    });
  });
});

describe('QuestionRenderer node changes', () => {
  it('resets a draft when the current node changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(submission: NodeSubmission) => void>();
    const { rerender } = render(
      <QuestionRenderer
        node={choiceNode('single-choice', 'node-a')}
        onSubmit={onSubmit}
      />,
    );
    await user.click(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    );

    rerender(
      <QuestionRenderer
        node={choiceNode('single-choice', 'node-b')}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();
  });

  it('renders an explicit unsupported state for unknown node types', () => {
    const unknownNode = {
      ...baseNode(),
      type: 'future-node',
    } as unknown as CaseNode;
    render(<QuestionRenderer node={unknownNode} onSubmit={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This question type is not supported',
    );
    expect(
      screen.queryByRole('button', { name: 'Submit decision' }),
    ).not.toBeInTheDocument();
  });
});
