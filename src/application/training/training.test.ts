import type {
  CaseNode,
  FdeCase,
  NodeSubmission,
} from '../../domain/cases/types';
import type {
  AttemptRecord,
  InProgressAttemptRecord,
  ProgressSnapshot,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import {
  completeAttempt,
  createTrainingSession,
  resumeAttempt,
  submitNode,
  trainingReducer,
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
}

function createDependencies(
  previousMastery: SkillMasteryRecord[] = [],
): DependencyHarness {
  const savedAttempts: AttemptRecord[] = [];
  const snapshots: ProgressSnapshot[] = [];
  let saveFailure: Error | undefined;
  const dependencies: TrainingDependencies = {
    attemptRepository: {
      save(attempt) {
        if (saveFailure) {
          return Promise.reject(saveFailure);
        }
        savedAttempts.push(structuredClone(attempt));
        return Promise.resolve();
      },
    },
    progressRepository: {
      get() {
        return Promise.resolve(undefined);
      },
      saveSnapshot(snapshot) {
        if (saveFailure) {
          return Promise.reject(saveFailure);
        }
        snapshots.push(structuredClone(snapshot));
        return Promise.resolve();
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
  };
}

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
});
