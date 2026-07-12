import type {
  CaseNode,
  FdeCase,
  NodeSubmission,
} from '../../domain/cases/types';
import type {
  AttemptRecord,
  CompletedAttemptRecord,
  InProgressAttemptRecord,
  ProgressSnapshot,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import {
  completeAttempt,
  createTrainingSession,
  resumeAttempt,
  submitNode,
  trainingReducer as reduceTrainingState,
  type TrainingAction,
  type TrainingDependencies,
  type TrainingState,
} from './index';

const NOW = '2026-07-13T08:00:00.000Z';

function choiceNode(
  id: string,
  branches: CaseNode['branches'],
  options = [
    {
      id: 'good',
      label: 'Inspect the failing dependency',
      explanation: 'Uses the available evidence.',
    },
    {
      id: 'slow',
      label: 'Change unrelated configuration',
      explanation: 'Does not address the evidence.',
      errorType: 'priority-error',
    },
    {
      id: 'danger',
      label: 'Delete production data',
      explanation: 'Destroys data without a recovery plan.',
      errorType: 'risk-error',
    },
  ],
): CaseNode {
  return {
    id,
    type: 'single-choice',
    prompt: `Decision at ${id}`,
    skillWeights: { diagnosis: 0.75, safety: 0.25 },
    evidence: [
      {
        id: `${id}-evidence`,
        type: 'log',
        content: 'Dependency health check failed.',
      },
    ],
    options,
    answer: { correctOptionId: 'good' },
    feedback: {
      firstWrong: 'Use the direct evidence.',
      secondWrong: 'Inspect the named failing dependency.',
      revealedAnswer: 'Inspect the failing dependency.',
    },
    scoring: {
      firstTry: 100,
      secondTry: 60,
      thirdTry: 30,
      weight: 10,
      criticalErrorOptionIds: ['danger'],
    },
    consequences: [
      { optionId: 'slow', timeDelta: 5, message: 'Diagnosis is delayed.' },
      {
        optionId: 'danger',
        riskDelta: 10,
        trustDelta: -5,
        message: 'Production data is lost.',
      },
    ],
    branches,
  };
}

function createTrainingCase(): FdeCase {
  const terminalBranches = [
    { key: 'correct', nextNodeId: null },
    { key: 'incorrect', nextNodeId: null },
    { key: 'critical', nextNodeId: null },
  ];
  return {
    id: 'case-training',
    slug: 'case-training',
    title: 'Training case',
    summary: 'A deterministic application-service fixture.',
    level: 'beginner',
    status: 'draft',
    estimatedMinutes: 5,
    domains: ['diagnostics'],
    skills: ['diagnosis', 'safety'],
    lifecycleStages: ['investigation'],
    technicalLayers: ['application'],
    environments: ['test'],
    riskTypes: ['operational'],
    behaviorPatterns: ['evidence-first'],
    scenario: {
      customerProfile: 'Fictional customer',
      background: 'A dependency is unhealthy.',
      initialIncident: 'The service reports HTTP 503.',
      constraints: ['Use supplied evidence.'],
      confirmedFacts: ['A dependency health check failed.'],
    },
    startNodeId: 'node-1',
    nodes: [
      choiceNode('node-1', [
        { key: 'correct', nextNodeId: 'node-2' },
        { key: 'incorrect', nextNodeId: 'node-2' },
        { key: 'critical', nextNodeId: 'node-critical' },
      ]),
      choiceNode('node-2', terminalBranches),
      choiceNode('node-critical', terminalBranches),
    ],
    debrief: {
      summary: 'Follow evidence and preserve safety.',
      rootCause: 'A dependency failed.',
      correctApproach: ['Inspect the dependency.'],
      keyLessons: ['Avoid destructive action.'],
      interviewerPerspective: 'Prioritize evidence.',
      customerRiskPerspective: 'Protect customer data.',
      remediation: ['Repair the dependency.'],
      verification: ['Repeat the health check.'],
      knowledgePoints: ['Evidence-led diagnosis'],
    },
    metadata: {
      version: 7,
      sourceType: 'synthetic',
      createdAt: NOW,
      author: 'FDE Arena',
    },
  };
}

function createCycleCase(): FdeCase {
  const fdeCase = createTrainingCase();
  fdeCase.nodes = [
    choiceNode('node-1', [
      { key: 'correct', nextNodeId: null },
      { key: 'incorrect', nextNodeId: 'node-1' },
      { key: 'critical', nextNodeId: null },
    ]),
  ];
  return fdeCase;
}

function createOrderingCase(): FdeCase {
  const fdeCase = createTrainingCase();
  fdeCase.nodes = [
    {
      id: 'node-1',
      type: 'ordering',
      prompt: 'Order the investigation steps.',
      skillWeights: { diagnosis: 1 },
      evidence: [
        { id: 'ordering-evidence', type: 'log', content: 'A failed check.' },
      ],
      options: [
        { id: 'inspect', label: 'Inspect', explanation: 'Collect evidence.' },
        { id: 'repair', label: 'Repair', explanation: 'Repair the cause.' },
        { id: 'verify', label: 'Verify', explanation: 'Verify recovery.' },
      ],
      answer: { orderedOptionIds: ['inspect', 'repair', 'verify'] },
      feedback: {
        firstWrong: 'Collect evidence first.',
        secondWrong: 'Inspect, repair, then verify.',
        revealedAnswer: 'Inspect, repair, verify.',
      },
      scoring: { firstTry: 100, secondTry: 60, thirdTry: 30, weight: 10 },
      branches: [
        { key: 'correct', nextNodeId: null },
        { key: 'incorrect', nextNodeId: null },
      ],
    },
  ];
  return fdeCase;
}

interface DependencyHarness {
  dependencies: TrainingDependencies;
  savedAttempts: AttemptRecord[];
  snapshots: ProgressSnapshot[];
  setSaveFailure(error: Error | undefined): void;
  setSnapshotFailure(error: Error | undefined): void;
}

type UntokenedTrainingAction =
  | { type: 'loaded' }
  | {
      type: 'evaluated';
      round: InProgressAttemptRecord['roundHistory'][number];
    }
  | { type: 'retry' }
  | { type: 'advanced'; nextNode: CaseNode }
  | { type: 'completed'; attempt: CompletedAttemptRecord }
  | { type: 'persistence-failed'; message: string }
  | { type: 'persistence-succeeded' };

const publicRetryAction: TrainingAction = {
  type: 'retry',
  token: 'consumer-supplied-current-token',
};
void publicRetryAction;

function trainingReducer(
  state: TrainingState,
  action: TrainingAction | UntokenedTrainingAction,
): TrainingState {
  if (
    action.type === 'persistence-failed' ||
    action.type === 'persistence-succeeded' ||
    'token' in action
  ) {
    return reduceTrainingState(state, action);
  }
  return reduceTrainingState(state, {
    ...action,
    token: state.transitionToken,
  });
}

function createDependencies(
  previousMastery: SkillMasteryRecord[] = [],
): DependencyHarness {
  const savedAttempts: AttemptRecord[] = [];
  const snapshots: ProgressSnapshot[] = [];
  let saveFailure: Error | undefined;
  let snapshotFailure: Error | undefined;
  let previousProgress: ProgressSnapshot['progress'] | undefined;
  let storedMastery = structuredClone(previousMastery);
  const completedAttempts = new Map<string, CompletedAttemptRecord>();
  const dependencies: TrainingDependencies = {
    attemptRepository: {
      save(attempt, caseContent) {
        void caseContent;
        if (saveFailure) {
          return Promise.reject(saveFailure);
        }
        savedAttempts.push(structuredClone(attempt));
        return Promise.resolve();
      },
    },
    progressRepository: {
      commitCompletion(attempt, caseContent, merge) {
        void caseContent;
        const failure = snapshotFailure ?? saveFailure;
        if (failure !== undefined) {
          return Promise.reject(failure);
        }
        const existing = completedAttempts.get(attempt.id);
        if (existing !== undefined) {
          return Promise.resolve(structuredClone(existing));
        }
        const merged = merge({
          previousProgress,
          previousMastery: storedMastery,
        });
        const snapshot: ProgressSnapshot = {
          attempt,
          progress: merged.progress,
          mastery: [...merged.mastery],
          mistakes: [...merged.mistakes],
        };
        snapshots.push(structuredClone(snapshot));
        previousProgress = structuredClone(merged.progress);
        const masteryBySkill = new Map(
          storedMastery.map((record) => [record.skillId, record]),
        );
        for (const record of merged.mastery) {
          masteryBySkill.set(record.skillId, structuredClone(record));
        }
        storedMastery = [...masteryBySkill.values()];
        completedAttempts.set(attempt.id, structuredClone(attempt));
        return Promise.resolve(structuredClone(attempt));
      },
    },
    skillRepository: {
      list() {
        return Promise.resolve(previousMastery);
      },
    },
    now: () => NOW,
    createId: () => 'attempt-fixed',
  };
  return {
    dependencies,
    savedAttempts,
    snapshots,
    setSaveFailure(error) {
      saveFailure = error;
    },
    setSnapshotFailure(error) {
      snapshotFailure = error;
    },
  };
}

function loadingState(fdeCase = createTrainingCase()): TrainingState {
  return {
    phase: 'loading',
    caseContent: fdeCase,
    caseId: fdeCase.id,
    caseVersion: fdeCase.metadata.version,
    attemptId: 'attempt-fixed',
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
    persistenceError: null,
    transitionToken: 'test:loading:0',
  };
}

const invalidCompletedState = {
  ...loadingState(),
  phase: 'completed' as const,
};
// @ts-expect-error completed state requires null currentNode and completedAttempt
const completedStateMustBeDiscriminated: TrainingState = invalidCompletedState;
void completedStateMustBeDiscriminated;

function round(
  nodeId: string,
  attemptNumber: 1 | 2 | 3,
  submission: NodeSubmission,
  isCorrect: boolean,
  overrides: Partial<
    InProgressAttemptRecord['roundHistory'][number]['evaluation']
  > = {},
) {
  return {
    nodeId,
    attemptNumber,
    submission,
    evaluation: {
      isCorrect,
      scoreRatio: isCorrect ? 1 : 0,
      errorTypes: isCorrect ? [] : ['priority-error'],
      criticalErrorIds: [],
      consequences: [],
      branchKey: isCorrect ? 'correct' : 'incorrect',
      ...overrides,
    },
    submittedAt: NOW,
    revealed: !isCorrect && attemptNumber === 3,
  };
}

describe('trainingReducer', () => {
  it('moves from loading to active without adding an implicit phase', () => {
    const active = trainingReducer(loadingState(), { type: 'loaded' });

    expect(active.phase).toBe('active');
    expect(active.currentNode?.id).toBe('node-1');
    expect(active.attemptNumber).toBe(1);
  });

  it('progresses first and second wrong rounds through layered feedback', () => {
    let state = trainingReducer(loadingState(), { type: 'loaded' });
    state = trainingReducer(state, {
      type: 'evaluated',
      round: round(
        'node-1',
        1,
        { type: 'choice', selectedOptionIds: ['slow'] },
        false,
        {
          consequences: [{ timeDelta: 5, message: 'Diagnosis is delayed.' }],
        },
      ),
    });

    expect(state).toMatchObject({
      phase: 'feedback',
      attemptNumber: 2,
      hintLevel: 1,
      feedback: { kind: 'firstWrong', revealed: false },
    });
    expect(state.roundHistory).toHaveLength(1);
    state = trainingReducer(state, { type: 'retry' });
    state = trainingReducer(state, {
      type: 'evaluated',
      round: round(
        'node-1',
        2,
        { type: 'choice', selectedOptionIds: ['slow'] },
        false,
      ),
    });

    expect(state).toMatchObject({
      phase: 'feedback',
      attemptNumber: 3,
      hintLevel: 2,
      feedback: { kind: 'secondWrong', revealed: false },
    });
    expect(state.roundHistory).toHaveLength(2);
    expect(state.consequences).toEqual([
      { timeDelta: 5, message: 'Diagnosis is delayed.' },
    ]);
  });

  it('reveals the answer on a third wrong round and awards zero', () => {
    let state = trainingReducer(loadingState(), { type: 'loaded' });
    for (const attemptNumber of [1, 2, 3] as const) {
      if (state.phase === 'feedback') {
        state = trainingReducer(state, { type: 'retry' });
      }
      state = trainingReducer(state, {
        type: 'evaluated',
        round: round(
          'node-1',
          attemptNumber,
          { type: 'choice', selectedOptionIds: ['slow'] },
          false,
        ),
      });
    }

    expect(state).toMatchObject({
      phase: 'advancing',
      hintLevel: 3,
      feedback: { kind: 'revealedAnswer', revealed: true },
      pendingBranchKey: 'incorrect',
      scoreEntries: [
        {
          nodeId: 'node-1',
          earnedPoints: 0,
          possiblePoints: 10,
          revealed: true,
        },
      ],
    });
    expect(state.roundHistory).toHaveLength(3);
  });

  it.each([
    [2, 6],
    [3, 3],
  ] as const)(
    'scores a correct answer on round %s with the existing node scorer',
    (correctRound, expectedPoints) => {
      let state = trainingReducer(loadingState(), { type: 'loaded' });
      for (
        let attemptNumber = 1;
        attemptNumber < correctRound;
        attemptNumber += 1
      ) {
        state = trainingReducer(state, {
          type: 'evaluated',
          round: round(
            'node-1',
            attemptNumber as 1 | 2,
            { type: 'choice', selectedOptionIds: ['slow'] },
            false,
          ),
        });
        state = trainingReducer(state, { type: 'retry' });
      }
      state = trainingReducer(state, {
        type: 'evaluated',
        round: round(
          'node-1',
          correctRound,
          { type: 'choice', selectedOptionIds: ['good'] },
          true,
        ),
      });

      expect(state.phase).toBe('advancing');
      expect(state.scoreEntries[0]?.earnedPoints).toBe(expectedPoints);
      expect(state.pendingBranchKey).toBe('correct');
    },
  );

  it('preserves an earlier critical choice and its consequence when a retry is correct', () => {
    let state = trainingReducer(loadingState(), { type: 'loaded' });
    state = trainingReducer(state, {
      type: 'evaluated',
      round: round(
        'node-1',
        1,
        { type: 'choice', selectedOptionIds: ['danger'] },
        false,
        {
          criticalErrorIds: ['danger'],
          consequences: [
            {
              riskDelta: 10,
              trustDelta: -5,
              message: 'Production data is lost.',
            },
          ],
          branchKey: 'critical',
        },
      ),
    });
    state = trainingReducer(state, { type: 'retry' });
    state = trainingReducer(state, {
      type: 'evaluated',
      round: round(
        'node-1',
        2,
        { type: 'choice', selectedOptionIds: ['good'] },
        true,
      ),
    });

    expect(state).toMatchObject({
      phase: 'advancing',
      pendingBranchKey: 'critical',
      criticalErrorIds: ['danger'],
      consequences: [
        {
          riskDelta: 10,
          trustDelta: -5,
          message: 'Production data is lost.',
        },
      ],
    });
  });

  it('keeps a persistence failure visible while the user opens the next round', () => {
    let state = trainingReducer(loadingState(), { type: 'loaded' });
    state = trainingReducer(state, {
      type: 'evaluated',
      round: round(
        'node-1',
        1,
        { type: 'choice', selectedOptionIds: ['slow'] },
        false,
      ),
    });
    state = trainingReducer(state, {
      type: 'persistence-failed',
      message: 'quota exceeded',
    });

    state = trainingReducer(state, { type: 'retry' });

    expect(state).toMatchObject({
      phase: 'active',
      attemptNumber: 2,
      persistenceError: 'quota exceeded',
    });
  });

  it('treats a repeated or stale retry token as an idempotent no-op', () => {
    let state = trainingReducer(loadingState(), { type: 'loaded' });
    state = trainingReducer(state, {
      type: 'evaluated',
      round: round(
        'node-1',
        1,
        { type: 'choice', selectedOptionIds: ['slow'] },
        false,
      ),
    });
    const retry = {
      type: 'retry' as const,
      token: state.transitionToken,
    };

    const active = trainingReducer(state, retry);
    expect(trainingReducer(active, retry)).toBe(active);
    expect(
      trainingReducer(state, {
        ...retry,
        token: 'stale-token',
      }),
    ).toBe(state);
  });
});

describe('training application service', () => {
  it('creates and persists a deterministic version-bound local attempt', async () => {
    const fdeCase = createTrainingCase();
    const harness = createDependencies();

    const state = await createTrainingSession(fdeCase, harness.dependencies);

    expect(state).toMatchObject({
      phase: 'active',
      caseId: fdeCase.id,
      caseVersion: 7,
      attemptId: 'attempt-fixed',
      persistenceError: null,
    });
    expect(harness.savedAttempts).toEqual([
      expect.objectContaining({
        id: 'attempt-fixed',
        userId: 'local-user',
        caseId: fdeCase.id,
        caseVersion: 7,
        status: 'in-progress',
        currentNodeId: 'node-1',
        roundHistory: [],
      }),
    ]);
  });

  it('persists complete wrong-round history and exposes a failed save', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    harness.setSaveFailure(new Error('quota exceeded'));

    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['slow'] },
      harness.dependencies,
    );

    expect(state).toMatchObject({
      phase: 'feedback',
      persistenceError: 'quota exceeded',
    });
    expect(state.roundHistory[0]).toMatchObject({
      nodeId: 'node-1',
      attemptNumber: 1,
      submission: { type: 'choice', selectedOptionIds: ['slow'] },
      evaluation: { isCorrect: false, errorTypes: ['priority-error'] },
    });
  });

  it('uses the existing branch resolver and persists the next reachable node', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );

    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state).toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-2' },
      visitedNodeIds: ['node-1', 'node-2'],
      persistenceError: null,
    });
    expect(harness.savedAttempts.at(-1)).toMatchObject({
      currentNodeId: 'node-2',
      caseVersion: 7,
      visitedNodeIds: ['node-1', 'node-2'],
      roundHistory: [
        expect.objectContaining({
          submission: { type: 'choice', selectedOptionIds: ['good'] },
        }),
      ],
    });
  });

  it('deduplicates concurrent double submission of the same active transition', async () => {
    const harness = createDependencies();
    const active = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );

    const first = submitNode(
      active,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );
    const duplicate = submitNode(
      active,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(duplicate).toBe(first);
    const [firstState, duplicateState] = await Promise.all([first, duplicate]);
    expect(duplicateState).toBe(firstState);
    expect(firstState).toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-2' },
    });
    expect(harness.savedAttempts).toHaveLength(3);
  });

  it('returns the consumed result when an old active state is submitted again later', async () => {
    const harness = createDependencies();
    const staleActive = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    const advanced = await submitNode(
      staleActive,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );
    const persistedWrites = harness.savedAttempts.length;

    const delayedDuplicate = await submitNode(
      staleActive,
      { type: 'choice', selectedOptionIds: ['slow'] },
      harness.dependencies,
    );

    expect(delayedDuplicate).toBe(advanced);
    expect(harness.savedAttempts).toHaveLength(persistedWrites);
  });

  it('allows a valid retry after a rejected submission from the same active state', async () => {
    const harness = createDependencies();
    const active = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );

    await expect(
      submitNode(
        active,
        { type: 'ordering', orderedOptionIds: ['good', 'slow', 'danger'] },
        harness.dependencies,
      ),
    ).rejects.toThrow(/does not match/i);

    await expect(
      submitNode(
        active,
        { type: 'choice', selectedOptionIds: ['good'] },
        harness.dependencies,
      ),
    ).resolves.toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-2' },
    });
  });

  it('does not advance the path when saving a resolved non-terminal round fails', async () => {
    const harness = createDependencies();
    const active = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    harness.setSaveFailure(new Error('write failed'));

    let state = await submitNode(
      active,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state).toMatchObject({
      phase: 'advancing',
      currentNode: { id: 'node-1' },
      visitedNodeIds: ['node-1'],
      persistenceError: 'write failed',
    });
    harness.setSaveFailure(undefined);
    state = await completeAttempt(state, harness.dependencies);
    expect(state).toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-2' },
      visitedNodeIds: ['node-1', 'node-2'],
      persistenceError: null,
    });
  });

  it('does not resolve a malformed branch when its resolved checkpoint fails', async () => {
    const harness = createDependencies();
    const malformed = createTrainingCase();
    malformed.nodes[0]!.branches = [];
    const active = await createTrainingSession(malformed, harness.dependencies);
    harness.setSaveFailure(new Error('checkpoint failed'));

    await expect(
      submitNode(
        active,
        { type: 'choice', selectedOptionIds: ['good'] },
        harness.dependencies,
      ),
    ).resolves.toMatchObject({
      phase: 'advancing',
      currentNode: { id: 'node-1' },
      persistenceError: 'checkpoint failed',
    });
  });

  it('returns the revealed third-round feedback before the user advances', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      state = await submitNode(
        state,
        { type: 'choice', selectedOptionIds: ['slow'] },
        harness.dependencies,
      );
      if (state.phase === 'feedback') {
        state = trainingReducer(state, { type: 'retry' });
      }
    }

    expect(state).toMatchObject({
      phase: 'advancing',
      currentNode: { id: 'node-1' },
      feedback: {
        kind: 'revealedAnswer',
        message: 'Inspect the failing dependency.',
        revealed: true,
      },
      scoreEntries: [{ earnedPoints: 0, possiblePoints: 10 }],
    });
    expect(harness.savedAttempts.at(-1)).toMatchObject({
      status: 'in-progress',
      currentNodeId: 'node-1',
      roundHistory: [
        expect.objectContaining({ attemptNumber: 1, revealed: false }),
        expect.objectContaining({ attemptNumber: 2, revealed: false }),
        expect.objectContaining({ attemptNumber: 3, revealed: true }),
      ],
    });

    state = resumeAttempt(
      createTrainingCase(),
      harness.savedAttempts.at(-1) as InProgressAttemptRecord,
    );
    expect(state).toMatchObject({
      phase: 'advancing',
      feedback: { kind: 'revealedAnswer', revealed: true },
    });
    state = await completeAttempt(state, harness.dependencies);
    expect(state).toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-2' },
    });
  });

  it('keeps a previous critical branch above a later correct branch', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['danger'] },
      harness.dependencies,
    );
    state = trainingReducer(state, { type: 'retry' });

    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state.currentNode?.id).toBe('node-critical');
    expect(state.criticalErrorIds).toEqual(['danger']);
    expect(state.consequences).toEqual([
      {
        riskDelta: 10,
        trustDelta: -5,
        message: 'Production data is lost.',
      },
    ]);
  });

  it('completes through one atomic snapshot with path score, mastery, and all mistakes', async () => {
    const harness = createDependencies([
      {
        userId: 'local-user',
        skillId: 'diagnosis',
        score: 80,
        sampleCount: 2,
        updatedAt: NOW,
      },
    ]);
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['danger'] },
      harness.dependencies,
    );
    state = trainingReducer(state, { type: 'retry' });
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state).toMatchObject({
      phase: 'completed',
      currentNode: null,
      completedAttempt: {
        status: 'completed',
        currentNodeId: null,
        score: 80,
        verdict: 'critical-risk',
        caseVersion: 7,
      },
    });
    expect(harness.snapshots).toHaveLength(1);
    expect(harness.snapshots[0]).toMatchObject({
      attempt: {
        status: 'completed',
        score: 80,
        verdict: 'critical-risk',
        criticalErrorIds: ['danger'],
      },
      progress: {
        attemptCount: 1,
        completedCount: 1,
        latestScore: 80,
        hasCriticalError: true,
      },
      mistakes: [
        expect.objectContaining({
          submission: { type: 'choice', selectedOptionIds: ['danger'] },
          correctSubmission: {
            type: 'choice',
            selectedOptionIds: ['good'],
          },
          errorTypes: ['risk-error'],
          evidenceIds: ['node-1-evidence'],
          skillIds: ['diagnosis', 'safety'],
          critical: true,
        }),
      ],
    });
    expect(harness.snapshots[0]?.mastery).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          skillId: 'diagnosis',
          score: 68,
          sampleCount: 3,
        }),
        expect.objectContaining({
          skillId: 'safety',
          score: 40,
          sampleCount: 1,
        }),
      ]),
    );
  });

  it('does not claim completion when the final snapshot fails and can retry', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );
    harness.setSaveFailure(new Error('transaction aborted'));
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state).toMatchObject({
      phase: 'advancing',
      persistenceError: 'transaction aborted',
    });
    harness.setSaveFailure(undefined);
    state = await completeAttempt(state, harness.dependencies);
    expect(state.phase).toBe('completed');
  });

  it('checkpoints a terminal resolved round before snapshot and resumes it after failure', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );
    harness.setSnapshotFailure(new Error('snapshot failed'));

    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state).toMatchObject({
      phase: 'advancing',
      currentNode: { id: 'node-2' },
      persistenceError: 'snapshot failed',
    });
    const checkpoint = harness.savedAttempts.at(-1) as InProgressAttemptRecord;
    expect(checkpoint).toMatchObject({
      currentNodeId: 'node-2',
      roundHistory: [
        expect.objectContaining({ nodeId: 'node-1', attemptNumber: 1 }),
        expect.objectContaining({ nodeId: 'node-2', attemptNumber: 1 }),
      ],
    });

    const resumed = resumeAttempt(createTrainingCase(), checkpoint);
    expect(resumed).toMatchObject({
      phase: 'advancing',
      currentNode: { id: 'node-2' },
      pendingBranchKey: 'correct',
      scoreEntries: [
        { nodeId: 'node-1', earnedPoints: 10 },
        { nodeId: 'node-2', earnedPoints: 10 },
      ],
    });
    harness.setSnapshotFailure(undefined);
    expect(await completeAttempt(resumed, harness.dependencies)).toMatchObject({
      phase: 'completed',
    });
  });

  it('commits the same advancing attempt idempotently across sequential retries', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createOrderingCase(),
      harness.dependencies,
    );
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      state = await submitNode(
        state,
        {
          type: 'ordering',
          orderedOptionIds: ['repair', 'inspect', 'verify'],
        },
        harness.dependencies,
      );
      if (state.phase === 'feedback') {
        state = trainingReducer(state, { type: 'retry' });
      }
    }
    expect(state.phase).toBe('advancing');

    const firstPending = completeAttempt(state, harness.dependencies);
    const duplicatePending = completeAttempt(state, harness.dependencies);
    expect(duplicatePending).toBe(firstPending);
    const [first, duplicate] = await Promise.all([
      firstPending,
      duplicatePending,
    ]);
    const sequentialRetry = await completeAttempt(state, harness.dependencies);

    expect(first).toMatchObject({ phase: 'completed' });
    expect(duplicate).toMatchObject({
      phase: 'completed',
      completedAttempt: { id: 'attempt-fixed' },
    });
    expect(sequentialRetry).toMatchObject({
      phase: 'completed',
      completedAttempt: { id: 'attempt-fixed' },
    });
    expect(harness.snapshots).toHaveLength(1);
    expect(harness.snapshots[0]).toMatchObject({
      progress: { attemptCount: 1, completedCount: 1 },
      mastery: [expect.objectContaining({ sampleCount: 1 })],
    });
  });

  it('serializes distinct concurrent completions against the latest progress and mastery', async () => {
    const harness = createDependencies();
    const ids = ['attempt-a', 'attempt-b'];
    harness.dependencies.createId = () => ids.shift()!;

    async function reachTerminalCheckpoint(): Promise<TrainingState> {
      let checkpoint = await createTrainingSession(
        createOrderingCase(),
        harness.dependencies,
      );
      for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
        checkpoint = await submitNode(
          checkpoint,
          {
            type: 'ordering',
            orderedOptionIds: ['repair', 'inspect', 'verify'],
          },
          harness.dependencies,
        );
        if (checkpoint.phase === 'feedback') {
          checkpoint = trainingReducer(checkpoint, { type: 'retry' });
        }
      }
      return checkpoint;
    }

    const [firstCheckpoint, secondCheckpoint] = await Promise.all([
      reachTerminalCheckpoint(),
      reachTerminalCheckpoint(),
    ]);
    const [first, second] = await Promise.all([
      completeAttempt(firstCheckpoint, harness.dependencies),
      completeAttempt(secondCheckpoint, harness.dependencies),
    ]);

    expect(first.phase).toBe('completed');
    expect(second.phase).toBe('completed');
    expect(
      harness.snapshots.map(({ progress }) => progress.attemptCount),
    ).toEqual([1, 2]);
    expect(harness.snapshots[1]).toMatchObject({
      progress: { completedCount: 2 },
      mastery: [expect.objectContaining({ sampleCount: 2 })],
    });
  });

  it('resumes unresolved feedback with score, path, consequences, and hint level', async () => {
    const harness = createDependencies();
    const state = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['danger'] },
      harness.dependencies,
    );
    const saved = harness.savedAttempts.at(-1) as InProgressAttemptRecord;

    const resumed = resumeAttempt(createTrainingCase(), saved);

    expect(resumed).toMatchObject({
      phase: 'feedback',
      attemptNumber: 2,
      hintLevel: 1,
      feedback: { kind: 'firstWrong' },
      currentNode: { id: 'node-1' },
      criticalErrorIds: ['danger'],
      consequences: [
        {
          riskDelta: 10,
          trustDelta: -5,
          message: 'Production data is lost.',
        },
      ],
    });
  });

  it('resumes a persisted correct branch at the next node with its path score', async () => {
    const harness = createDependencies();
    const active = await createTrainingSession(
      createTrainingCase(),
      harness.dependencies,
    );
    await submitNode(
      active,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );
    const saved = harness.savedAttempts.at(-1) as InProgressAttemptRecord;

    const resumed = resumeAttempt(createTrainingCase(), saved);

    expect(resumed).toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-2' },
      visitedNodeIds: ['node-1', 'node-2'],
      scoreEntries: [
        { nodeId: 'node-1', earnedPoints: 10, possiblePoints: 10 },
      ],
    });
  });

  it('scores repeated node visits on the actual cyclic path and uses stable mistake IDs', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createCycleCase(),
      harness.dependencies,
    );
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      state = await submitNode(
        state,
        { type: 'choice', selectedOptionIds: ['slow'] },
        harness.dependencies,
      );
      if (state.phase === 'feedback') {
        state = trainingReducer(state, { type: 'retry' });
      }
    }
    state = await completeAttempt(state, harness.dependencies);
    expect(state).toMatchObject({
      phase: 'active',
      currentNode: { id: 'node-1' },
      visitedNodeIds: ['node-1', 'node-1'],
      scoreEntries: [{ visitOrdinal: 0, earnedPoints: 0, possiblePoints: 10 }],
    });

    state = await submitNode(
      state,
      { type: 'choice', selectedOptionIds: ['good'] },
      harness.dependencies,
    );

    expect(state.completedAttempt?.score).toBe(50);
    expect(harness.snapshots[0]?.mistakes.map(({ id }) => id)).toEqual([
      'mistake:attempt-fixed:0:1',
      'mistake:attempt-fixed:0:2',
      'mistake:attempt-fixed:0:3',
    ]);
  });

  it('uses a stable application fallback for evaluators without error taxonomy', async () => {
    const harness = createDependencies();
    let state = await createTrainingSession(
      createOrderingCase(),
      harness.dependencies,
    );
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      state = await submitNode(
        state,
        {
          type: 'ordering',
          orderedOptionIds: ['repair', 'inspect', 'verify'],
        },
        harness.dependencies,
      );
      if (state.phase === 'feedback') {
        state = trainingReducer(state, { type: 'retry' });
      }
    }
    state = await completeAttempt(state, harness.dependencies);

    expect(harness.snapshots[0]?.mistakes).toHaveLength(3);
    expect(
      harness.snapshots[0]?.mistakes.map(({ errorTypes }) => errorTypes),
    ).toEqual([
      ['incorrect-submission'],
      ['incorrect-submission'],
      ['incorrect-submission'],
    ]);
  });

  it.each([
    ['completed attempt', { status: 'completed', currentNodeId: null }],
    ['case version', { caseVersion: 8 }],
    ['unknown current node', { currentNodeId: 'missing-node' }],
    [
      'inconsistent history',
      {
        roundHistory: [
          round(
            'node-1',
            2,
            { type: 'choice', selectedOptionIds: ['slow'] },
            false,
          ),
        ],
      },
    ],
  ])('rejects resume for %s', async (_label, override) => {
    const harness = createDependencies();
    await createTrainingSession(createTrainingCase(), harness.dependencies);
    const saved = harness.savedAttempts[0] as InProgressAttemptRecord;
    const invalid = { ...saved, ...override } as AttemptRecord;

    expect(() => resumeAttempt(createTrainingCase(), invalid)).toThrow();
  });

  it.each([
    [
      'an invalid startedAt',
      {
        startedAt: 'July 13, 2026',
      },
    ],
    [
      'a round before startedAt',
      {
        startedAt: '2026-07-13T08:00:00.000Z',
        updatedAt: '2026-07-13T09:00:00.000Z',
        roundHistory: [
          {
            ...round(
              'node-1',
              1,
              { type: 'choice', selectedOptionIds: ['slow'] },
              false,
            ),
            submittedAt: '2026-07-13T07:00:00.000Z',
          },
        ],
        consequences: [],
      },
    ],
    [
      'non-monotonic round times',
      {
        startedAt: '2026-07-13T06:00:00.000Z',
        updatedAt: '2026-07-13T09:00:00.000Z',
        roundHistory: [
          {
            ...round(
              'node-1',
              1,
              { type: 'choice', selectedOptionIds: ['slow'] },
              false,
            ),
            submittedAt: '2026-07-13T08:00:00.000Z',
          },
          {
            ...round(
              'node-1',
              2,
              { type: 'choice', selectedOptionIds: ['slow'] },
              false,
            ),
            submittedAt: '2026-07-13T07:00:00.000Z',
          },
        ],
        consequences: [],
      },
    ],
    [
      'updatedAt before the last round',
      {
        startedAt: '2026-07-13T06:00:00.000Z',
        updatedAt: '2026-07-13T07:00:00.000Z',
        roundHistory: [
          {
            ...round(
              'node-1',
              1,
              { type: 'choice', selectedOptionIds: ['slow'] },
              false,
            ),
            submittedAt: '2026-07-13T08:00:00.000Z',
          },
        ],
        consequences: [],
      },
    ],
  ])('rejects resume for %s', async (_label, override) => {
    const harness = createDependencies();
    await createTrainingSession(createTrainingCase(), harness.dependencies);
    const saved = harness.savedAttempts[0] as InProgressAttemptRecord;
    const invalid = { ...saved, ...override } as InProgressAttemptRecord;

    expect(() => resumeAttempt(createTrainingCase(), invalid)).toThrow(
      /timestamp|chronolog|before|after/i,
    );
  });

  it('preserves arbitrary fractional precision and offsets while resuming', async () => {
    const harness = createDependencies();
    await createTrainingSession(createTrainingCase(), harness.dependencies);
    const saved = harness.savedAttempts[0] as InProgressAttemptRecord;
    const precise: InProgressAttemptRecord = {
      ...saved,
      startedAt: '2026-07-13T10:00:00.123456789+02:00',
      updatedAt: '2026-07-13T08:00:01.000Z',
    };

    expect(resumeAttempt(createTrainingCase(), precise)).toMatchObject({
      phase: 'active',
      startedAt: '2026-07-13T08:00:00.123456789Z',
      updatedAt: '2026-07-13T08:00:01.000Z',
    });
  });

  it('rejects sub-millisecond round timestamps in descending exact order', async () => {
    const harness = createDependencies();
    await createTrainingSession(createTrainingCase(), harness.dependencies);
    const saved = harness.savedAttempts[0] as InProgressAttemptRecord;
    const descending: InProgressAttemptRecord = {
      ...saved,
      startedAt: '2026-07-13T08:00:00.000Z',
      updatedAt: '2026-07-13T08:00:00.001Z',
      roundHistory: [
        {
          ...round(
            'node-1',
            1,
            { type: 'choice', selectedOptionIds: ['slow'] },
            false,
          ),
          submittedAt: '2026-07-13T08:00:00.0009Z',
        },
        {
          ...round(
            'node-1',
            2,
            { type: 'choice', selectedOptionIds: ['slow'] },
            false,
          ),
          submittedAt: '2026-07-13T08:00:00.0001Z',
        },
      ],
      consequences: [],
    };

    expect(() => resumeAttempt(createTrainingCase(), descending)).toThrow(
      /chronological/i,
    );
  });
});
