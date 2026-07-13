import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  createTrainingSession,
  type TrainingDependencies,
  type TrainingState,
} from '../../application/training';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { TrainingSessionPage } from './TrainingSessionPage';

const NOW = '2026-07-13T09:00:00.000Z';

interface Harness {
  dependencies: TrainingDependencies;
  savedAttempts: number;
  setCompletionFailure(fails: boolean): void;
  blockNextSave(): Promise<void>;
  releaseSave(): void;
}

function createHarness(): Harness {
  let completionFails = false;
  let saveGate: Promise<void> | undefined;
  let releaseSave: () => void = () => undefined;
  let savedAttempts = 0;

  const dependencies: TrainingDependencies = {
    attemptRepository: {
      async save() {
        savedAttempts += 1;
        if (saveGate !== undefined) {
          const gate = saveGate;
          saveGate = undefined;
          await gate;
        }
      },
    },
    progressRepository: {
      commitCompletion(attempt, _caseContent, merge) {
        if (completionFails) {
          return Promise.reject(
            new Error('Local database is temporarily unavailable.'),
          );
        }
        merge({ previousProgress: undefined, previousMastery: [] });
        return Promise.resolve(structuredClone(attempt));
      },
    },
    now: () => NOW,
    createId: () => 'attempt-page',
  };

  return {
    dependencies,
    get savedAttempts() {
      return savedAttempts;
    },
    setCompletionFailure(fails) {
      completionFails = fails;
    },
    blockNextSave() {
      saveGate = new Promise<void>((resolve) => {
        releaseSave = resolve;
      });
      return saveGate;
    },
    releaseSave() {
      releaseSave();
    },
  };
}

async function initialSession(harness: Harness): Promise<TrainingState> {
  return createTrainingSession(createMinimalValidCase(), harness.dependencies);
}

async function chooseWrongAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('radio', { name: 'Change unrelated configuration' }),
  );
  await user.click(screen.getByRole('button', { name: 'Submit decision' }));
}

describe('TrainingSessionPage controller', () => {
  it('lets the user change an old wrong selection after retry and then complete', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    render(
      <TrainingSessionPage
        initialState={initialState}
        dependencies={harness.dependencies}
      />,
    );

    await chooseWrongAndSubmit(user);
    expect(
      await screen.findByText(initialState.currentNode!.feedback.firstWrong),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(
      await screen.findByRole('heading', { name: 'Case complete' }),
    ).toBeInTheDocument();
  });

  it('announces the prompt once and gives the external options group a distinct name', async () => {
    const harness = createHarness();
    const initialState = await initialSession(harness);
    render(
      <TrainingSessionPage
        initialState={initialState}
        dependencies={harness.dependencies}
      />,
    );

    expect(screen.getAllByText(initialState.currentNode!.prompt)).toHaveLength(
      1,
    );
    expect(
      screen.getByRole('group', { name: 'Response options' }),
    ).toBeInTheDocument();
  });

  it('uses the real service for wrong, retry, and third-reveal transitions without early leaks', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    const node = initialState.currentNode!;
    render(
      <TrainingSessionPage
        initialState={initialState}
        dependencies={harness.dependencies}
      />,
    );

    await chooseWrongAndSubmit(user);
    expect(
      await screen.findByText(node.feedback.firstWrong),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(node.feedback.revealedAnswer),
    ).not.toBeInTheDocument();
    for (const option of node.options) {
      expect(screen.queryByText(option.explanation)).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    expect(
      await screen.findByText(node.feedback.secondWrong),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(node.feedback.revealedAnswer),
    ).not.toBeInTheDocument();
    for (const option of node.options) {
      expect(screen.queryByText(option.explanation)).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    expect(
      await screen.findByText(node.feedback.revealedAnswer),
    ).toBeInTheDocument();
    for (const option of node.options) {
      expect(screen.getByText(option.explanation)).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Case complete' }),
    ).toBeInTheDocument();
  });

  it('completes a correct flow without rendering answer explanations', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    const node = initialState.currentNode!;
    render(
      <TrainingSessionPage
        initialState={initialState}
        dependencies={harness.dependencies}
      />,
    );

    await user.click(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(
      await screen.findByRole('heading', { name: 'Case complete' }),
    ).toBeInTheDocument();
    for (const option of node.options) {
      expect(screen.queryByText(option.explanation)).not.toBeInTheDocument();
    }
  });

  it('shows a recoverable persistence alert and retries completion from the same checkpoint', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    harness.setCompletionFailure(true);
    render(
      <TrainingSessionPage
        initialState={initialState}
        dependencies={harness.dependencies}
      />,
    );

    await user.click(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Local database is temporarily unavailable.',
    );
    harness.setCompletionFailure(false);
    await user.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(
      await screen.findByRole('heading', { name: 'Case complete' }),
    ).toBeInTheDocument();
  });

  it('disables the decision while pending and prevents duplicate submissions', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    const gate = harness.blockNextSave();
    render(
      <TrainingSessionPage
        initialState={initialState}
        dependencies={harness.dependencies}
      />,
    );
    await user.click(
      screen.getByRole('radio', { name: 'Change unrelated configuration' }),
    );
    const submit = screen.getByRole('button', { name: 'Submit decision' });
    fireEvent.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(screen.getByLabelText('Decision controls')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    fireEvent.click(submit);
    expect(harness.savedAttempts).toBe(2);
    harness.releaseSave();
    await gate;
    expect(
      await screen.findByText(initialState.currentNode!.feedback.firstWrong),
    ).toBeInTheDocument();
    expect(harness.savedAttempts).toBe(2);
  });

  it('renders a failed loading checkpoint without inventing a service retry', () => {
    const fdeCase = createMinimalValidCase();
    const harness = createHarness();
    const loadingState = {
      phase: 'loading',
      caseContent: fdeCase,
      caseId: fdeCase.id,
      caseVersion: fdeCase.metadata.version,
      attemptId: 'attempt-loading',
      startedAt: NOW,
      updatedAt: NOW,
      currentNode: fdeCase.nodes[0]!,
      attemptNumber: 1,
      hintLevel: 0,
      revealedEvidenceIds: [],
      roundHistory: [],
      visitedNodeIds: [fdeCase.startNodeId],
      scoreEntries: [],
      consequences: [],
      criticalErrorIds: [],
      currentNodeRoundStartIndex: 0,
      feedback: null,
      pendingBranchKey: null,
      persistenceError: 'Initial save failed.',
      transitionToken: 'attempt-loading:loading:0:0',
    } satisfies TrainingState;

    render(
      <TrainingSessionPage
        initialState={loadingState}
        dependencies={harness.dependencies}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Initial save failed.');
    expect(
      screen.queryByRole('button', { name: /retry/i }),
    ).not.toBeInTheDocument();
  });
});
