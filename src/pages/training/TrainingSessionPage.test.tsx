import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import {
  createTrainingSession,
  type TrainingDependencies,
  type TrainingState,
} from '../../application/training';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import { I18nProvider } from '../../i18n';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { TrainingSessionPage } from './TrainingSessionPage';

const NOW = '2026-07-13T09:00:00.000Z';
const originalMatchMedia = window.matchMedia;

function setMobile(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

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

function renderSession(
  initialState: TrainingState,
  dependencies: TrainingDependencies,
  concepts: readonly ConceptKnowledge[] = [],
) {
  return render(
    <TrainingSessionPage
      initialState={initialState}
      dependencies={dependencies}
      concepts={concepts}
    />,
    { wrapper: MemoryRouter },
  );
}

const concept: ConceptKnowledge = {
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
  whyItMatters: '它让诊断、根因与验证保持可追溯。',
  commonMistakes: '不要把单条日志直接当成根因。',
  relatedFoundation: ['fde.requirement-evidence'],
  relatedCases: ['case-minimal'],
};

async function chooseWrongAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('radio', { name: 'Change unrelated configuration' }),
  );
  await user.click(screen.getByRole('button', { name: 'Submit decision' }));
}

describe('TrainingSessionPage controller', () => {
  it('shows clickable Case terminology without mutating the training session', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    const savedBeforeViewing = harness.savedAttempts;

    renderSession(initialState, harness.dependencies, [concept]);

    const term = screen.getByRole('button', {
      name: '证据：支持决策的可核验事实（Evidence）',
    });
    expect(
      screen.getByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();

    await user.click(term);

    expect(screen.getByText(concept.simpleExplanation)).toBeVisible();
    expect(screen.getByText(concept.whyItMatters)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Evidence' })).toBeVisible();
    expect(harness.savedAttempts).toBe(savedBeforeViewing);
    expect(
      screen.getByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();
  });

  it('localizes training chrome without rewriting authored case content', async () => {
    const harness = createHarness();
    const initialState = await initialSession(harness);

    render(
      <I18nProvider initialLanguage="zh-CN">
        <MemoryRouter>
          <TrainingSessionPage
            initialState={initialState}
            dependencies={harness.dependencies}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(screen.getByRole('heading', { name: '场景' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '客户' })).toBeVisible();
    expect(screen.getByRole('button', { name: '提交决策' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: '训练进度' })).toBeVisible();
    expect(screen.getByRole('region', { name: '后果摘要' })).toBeVisible();
    expect(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    ).toBeVisible();
  });

  it('lets the user change an old wrong selection after retry and then complete', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    renderSession(initialState, harness.dependencies);

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
    renderSession(initialState, harness.dependencies);

    expect(screen.getAllByText(initialState.currentNode!.prompt)).toHaveLength(
      1,
    );
    expect(
      screen.getByRole('group', { name: 'Response options' }),
    ).toBeInTheDocument();
    const pageTitle = screen.getByRole('heading', {
      name: 'Select the next action',
    });
    expect(pageTitle).toHaveAttribute('id', 'page-title');
    expect(pageTitle).toHaveAttribute('tabindex', '-1');
    expect(pageTitle).toHaveFocus();
  });

  it('uses the real service for wrong, retry, and third-reveal transitions without early leaks', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    const node = initialState.currentNode!;
    renderSession(initialState, harness.dependencies);

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

  it('keeps mobile wrong-answer feedback beside the response controls', async () => {
    setMobile(true);
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    renderSession(initialState, harness.dependencies);

    await chooseWrongAndSubmit(user);

    const feedback = await screen.findByRole('status', { name: 'First hint' });
    const optionsDisclosure = screen.getByText('Options').closest('details');
    expect(feedback.closest('details')).toBe(optionsDisclosure);
  });

  it('completes a correct flow without rendering answer explanations', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    const node = initialState.currentNode!;
    renderSession(initialState, harness.dependencies);

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

  it("shows the mastery update and links completion to review, skills, and today's plan", async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    renderSession(initialState, harness.dependencies);

    await user.click(
      screen.getByRole('radio', { name: 'Inspect the failing dependency' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(
      await screen.findByRole('link', { name: 'Review decisions' }),
    ).toHaveAttribute('href', '/debrief/attempt-page');
    const pageTitle = screen.getByRole('heading', { name: 'Case complete' });
    expect(pageTitle).toHaveAttribute('id', 'page-title');
    expect(pageTitle).toHaveAttribute('tabindex', '-1');
    expect(pageTitle).toHaveFocus();
    expect(
      screen.getByText("This session updated your Mastery and today's plan."),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'View Mastery' })).toHaveAttribute(
      'href',
      '/skills',
    );
    expect(
      screen.getByRole('link', { name: "Back to today's plan" }),
    ).toHaveAttribute('href', '/');
    expect(pageTitle.closest('.training-complete__result')).not.toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Review decisions' })
        .closest('.training-complete__actions'),
    ).not.toBeNull();
  });

  it('shows a recoverable persistence alert and retries completion from the same checkpoint', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const initialState = await initialSession(harness);
    harness.setCompletionFailure(true);
    renderSession(initialState, harness.dependencies);

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
    renderSession(initialState, harness.dependencies);
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

    renderSession(loadingState, harness.dependencies);

    expect(screen.getByRole('alert')).toHaveTextContent('Initial save failed.');
    expect(
      screen.queryByRole('button', { name: /retry/i }),
    ).not.toBeInTheDocument();
  });
});
