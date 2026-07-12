import { resolveNextNode } from '../../domain/cases/graph';
import type {
  CaseNode,
  EvaluationResult,
  FdeCase,
  NodeSubmission,
} from '../../domain/cases/types';
import { aggregateSkillScores, updateMastery } from '../../domain/mastery';
import { evaluateNode, getVerdict, scoreCase } from '../../domain/scoring';
import type {
  AttemptRecord,
  AttemptRoundRecord,
  CaseProgressRecord,
  CompletedAttemptRecord,
  CompletionMergeContext,
  CompletionMergeResult,
  InProgressAttemptRecord,
  MistakeRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import {
  compareRfc3339Timestamps,
  normalizeRfc3339Timestamp,
} from '../../storage/timestamps';
import { trainingReducer } from './training-reducer';
import type {
  ActiveTrainingState,
  AdvancingTrainingState,
  LoadingTrainingState,
  TrainingDependencies,
  TrainingPhase,
  TrainingState,
} from './types';
import { TrainingSessionError } from './types';

const FALLBACK_ERROR_TYPE = 'incorrect-submission';
const consumedOperations = new WeakMap<
  TrainingState,
  Map<string, Promise<TrainingState>>
>();

function findNode(fdeCase: FdeCase, nodeId: string): CaseNode {
  const node = fdeCase.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) {
    throw new TrainingSessionError(
      `Case "${fdeCase.id}" does not contain node "${nodeId}".`,
    );
  }
  return node;
}

function transitionToken(
  attemptId: string,
  phase: TrainingPhase,
  roundCount: number,
  scoreCount: number,
): string {
  return `${attemptId}:${phase}:${roundCount}:${scoreCount}`;
}

function persistenceMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Training progress could not be saved.';
}

function toInProgressAttempt(
  state: Exclude<TrainingState, { phase: 'completed' }>,
): InProgressAttemptRecord {
  return {
    id: state.attemptId,
    userId: LOCAL_USER_ID,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    status: 'in-progress',
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    currentNodeId: state.currentNode.id,
    criticalErrorIds: [...state.criticalErrorIds],
    visitedNodeIds: [...state.visitedNodeIds],
    roundHistory: structuredClone(state.roundHistory),
    consequences: structuredClone(state.consequences),
  };
}

async function saveInProgress<
  State extends Exclude<TrainingState, { phase: 'completed' }>,
>(state: State, dependencies: TrainingDependencies): Promise<State> {
  try {
    await dependencies.attemptRepository.save(
      toInProgressAttempt(state),
      state.caseContent,
    );
    return trainingReducer(state, {
      type: 'persistence-succeeded',
    }) as State;
  } catch (error) {
    return trainingReducer(state, {
      type: 'persistence-failed',
      message: persistenceMessage(error),
    }) as State;
  }
}

function initialState(
  fdeCase: FdeCase,
  dependencies: TrainingDependencies,
): LoadingTrainingState {
  const attemptId = dependencies.createId();
  if (attemptId.trim().length === 0) {
    throw new TrainingSessionError(
      'The generated attempt ID must not be empty.',
    );
  }
  const now = dependencies.now();
  return {
    phase: 'loading',
    caseContent: fdeCase,
    caseId: fdeCase.id,
    caseVersion: fdeCase.metadata.version,
    attemptId,
    startedAt: now,
    updatedAt: now,
    currentNode: findNode(fdeCase, fdeCase.startNodeId),
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
    transitionToken: transitionToken(attemptId, 'loading', 0, 0),
  };
}

export async function createTrainingSession(
  fdeCase: FdeCase,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  const loading = initialState(fdeCase, dependencies);
  const active = trainingReducer(loading, {
    type: 'loaded',
    token: loading.transitionToken,
  });
  if (active.phase !== 'active') {
    throw new TrainingSessionError(
      'Loading did not produce an active session.',
    );
  }
  const saved = await saveInProgress(active, dependencies);
  return saved.persistenceError === null
    ? saved
    : { ...loading, persistenceError: saved.persistenceError };
}

function assertActive(
  state: TrainingState,
): asserts state is ActiveTrainingState {
  if (state.phase !== 'active') {
    throw new TrainingSessionError(
      `A node can only be submitted from the active phase, not "${state.phase}".`,
    );
  }
}

function runOnce(
  state: TrainingState,
  operationName: string,
  operation: () => Promise<TrainingState>,
): Promise<TrainingState> {
  let operations = consumedOperations.get(state);
  if (operations === undefined) {
    operations = new Map();
    consumedOperations.set(state, operations);
  }
  const existing = operations.get(operationName);
  if (existing !== undefined) {
    return existing;
  }
  const pending = operation().catch((error: unknown) => {
    if (operations.get(operationName) === pending) {
      operations.delete(operationName);
    }
    throw error;
  });
  operations.set(operationName, pending);
  return pending;
}

export function submitNode(
  state: TrainingState,
  submission: NodeSubmission,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  assertActive(state);
  return runOnce(state, 'submit', () =>
    submitNodeOnce(state, submission, dependencies),
  );
}

async function submitNodeOnce(
  state: ActiveTrainingState,
  submission: NodeSubmission,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  const evaluation = evaluateNode(state.currentNode, submission);
  const round: AttemptRoundRecord = {
    nodeId: state.currentNode.id,
    attemptNumber: state.attemptNumber,
    submission: structuredClone(submission),
    evaluation: structuredClone(evaluation),
    submittedAt: dependencies.now(),
    revealed: !evaluation.isCorrect && state.attemptNumber === 3,
  };
  const evaluated = trainingReducer(
    { ...state, updatedAt: round.submittedAt },
    {
      type: 'evaluated',
      round,
      token: state.transitionToken,
    },
  );

  if (evaluated.phase === 'feedback') {
    return saveInProgress(evaluated, dependencies);
  }
  if (evaluated.phase !== 'advancing') {
    throw new TrainingSessionError('Evaluation did not reach a valid phase.');
  }
  if (evaluated.feedback?.revealed === true) {
    return saveInProgress(evaluated, dependencies);
  }
  return completeAttempt(evaluated, dependencies);
}

function correctSubmission(node: CaseNode): NodeSubmission {
  switch (node.type) {
    case 'multiple-choice':
      return {
        type: 'choice',
        selectedOptionIds: [...node.answer.correctOptionIds],
      };
    case 'ordering':
      return {
        type: 'ordering',
        orderedOptionIds: [...node.answer.orderedOptionIds],
      };
    case 'matching':
      return { type: 'matching', pairs: { ...node.answer.pairs } };
    case 'evidence-conclusion':
      return {
        type: 'evidence-conclusion',
        conclusionId: node.answer.conclusionId,
        evidenceIds: [...node.answer.evidenceIds],
      };
    default:
      return {
        type: 'choice',
        selectedOptionIds: [node.answer.correctOptionId],
      };
  }
}

function evidenceIdsForMistake(node: CaseNode): string[] {
  return node.type === 'evidence-conclusion'
    ? [...node.answer.evidenceIds]
    : node.evidence.map(({ id }) => id);
}

function buildMistakes(state: AdvancingTrainingState): MistakeRecord[] {
  const mistakes: MistakeRecord[] = [];
  let visitOrdinal = 0;
  for (const round of state.roundHistory) {
    const node = findNode(state.caseContent, round.nodeId);
    if (!round.evaluation.isCorrect) {
      mistakes.push({
        id: `mistake:${state.attemptId}:${visitOrdinal}:${round.attemptNumber}`,
        userId: LOCAL_USER_ID,
        attemptId: state.attemptId,
        caseId: state.caseId,
        caseVersion: state.caseVersion,
        nodeId: node.id,
        submission: structuredClone(round.submission),
        correctSubmission: correctSubmission(node),
        errorTypes:
          round.evaluation.errorTypes.length > 0
            ? [...round.evaluation.errorTypes]
            : [FALLBACK_ERROR_TYPE],
        evidenceIds: evidenceIdsForMistake(node),
        skillIds: Object.entries(node.skillWeights)
          .filter(([, weight]) => weight > 0)
          .map(([skillId]) => skillId)
          .sort(),
        critical: round.evaluation.criticalErrorIds.length > 0,
        createdAt: round.submittedAt,
        redoScores: [],
      });
    }
    if (round.evaluation.isCorrect || round.revealed) {
      visitOrdinal += 1;
    }
  }
  return mistakes;
}

function buildMastery(
  state: AdvancingTrainingState,
  previousRecords: readonly SkillMasteryRecord[],
  completedAt: string,
): SkillMasteryRecord[] {
  const previousBySkill = new Map(
    previousRecords.map((record) => [record.skillId, record]),
  );
  const currentScores = aggregateSkillScores(
    state.scoreEntries.map((entry) => ({
      score0to100:
        entry.possiblePoints === 0
          ? 0
          : (entry.earnedPoints / entry.possiblePoints) * 100,
      skillWeights: entry.skillWeights,
    })),
  );

  return Object.entries(currentScores).map(([skillId, currentScore]) => {
    const previous = previousBySkill.get(skillId);
    const critical = state.scoreEntries.some(
      (entry) => entry.critical && (entry.skillWeights[skillId] ?? 0) > 0,
    );
    return {
      userId: LOCAL_USER_ID,
      skillId,
      score: updateMastery(previous?.score, currentScore, critical),
      sampleCount: (previous?.sampleCount ?? 0) + 1,
      updatedAt: completedAt,
    };
  });
}

function buildCompletedAttempt(
  state: AdvancingTrainingState,
  completedAt: string,
): CompletedAttemptRecord {
  const score = scoreCase(state.scoreEntries);
  return {
    id: state.attemptId,
    userId: LOCAL_USER_ID,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    status: 'completed',
    startedAt: state.startedAt,
    updatedAt: completedAt,
    completedAt,
    currentNodeId: null,
    score,
    verdict: getVerdict(score, state.criticalErrorIds),
    criticalErrorIds: [...state.criticalErrorIds],
    visitedNodeIds: [...state.visitedNodeIds],
    roundHistory: structuredClone(state.roundHistory),
    consequences: structuredClone(state.consequences),
  };
}

function mergeCompletion(
  state: AdvancingTrainingState,
  attempt: CompletedAttemptRecord,
  context: CompletionMergeContext,
): CompletionMergeResult {
  const previousProgress = context.previousProgress;
  const progress: CaseProgressRecord = {
    userId: LOCAL_USER_ID,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    latestAttemptId: state.attemptId,
    attemptCount: (previousProgress?.attemptCount ?? 0) + 1,
    completedCount: (previousProgress?.completedCount ?? 0) + 1,
    highestScore: Math.max(previousProgress?.highestScore ?? 0, attempt.score),
    latestScore: attempt.score,
    latestVerdict: attempt.verdict,
    hasCriticalError:
      (previousProgress?.hasCriticalError ?? false) ||
      state.criticalErrorIds.length > 0,
    updatedAt: attempt.completedAt,
  };
  return {
    progress,
    mastery: buildMastery(state, context.previousMastery, attempt.completedAt),
    mistakes: buildMistakes(state),
  };
}

export function completeAttempt(
  state: TrainingState,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  if (state.phase !== 'advancing') {
    return Promise.reject(
      new TrainingSessionError(
        'Only a resolved advancing node can be completed or advanced.',
      ),
    );
  }
  return runOnce(state, 'complete', () =>
    completeAttemptOnce(state, dependencies),
  );
}

async function completeAttemptOnce(
  state: AdvancingTrainingState,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  const checkpoint = await saveInProgress(state, dependencies);
  if (checkpoint.persistenceError !== null) {
    return checkpoint;
  }

  const nextNodeId = resolveNextNode(
    checkpoint.currentNode,
    checkpoint.pendingBranchKey,
  );
  if (nextNodeId !== null) {
    const nextNode = findNode(checkpoint.caseContent, nextNodeId);
    const advanced = trainingReducer(checkpoint, {
      type: 'advanced',
      nextNode,
      token: checkpoint.transitionToken,
    });
    if (advanced.phase !== 'active') {
      throw new TrainingSessionError(
        'Advancement did not produce active state.',
      );
    }
    const candidate: ActiveTrainingState = {
      ...advanced,
      updatedAt: dependencies.now(),
    };
    const saved = await saveInProgress(candidate, dependencies);
    return saved.persistenceError === null
      ? saved
      : trainingReducer(checkpoint, {
          type: 'persistence-failed',
          message: saved.persistenceError,
        });
  }

  try {
    const attempt = buildCompletedAttempt(checkpoint, dependencies.now());
    const committed = await dependencies.progressRepository.commitCompletion(
      attempt,
      checkpoint.caseContent,
      (context) => mergeCompletion(checkpoint, attempt, context),
    );
    return trainingReducer(
      { ...checkpoint, updatedAt: committed.updatedAt },
      {
        type: 'completed',
        attempt: committed,
        token: checkpoint.transitionToken,
      },
    );
  } catch (error) {
    return trainingReducer(checkpoint, {
      type: 'persistence-failed',
      message: persistenceMessage(error),
    });
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertResumeIdentity(
  fdeCase: FdeCase,
  attempt: AttemptRecord,
): asserts attempt is InProgressAttemptRecord {
  if (attempt.status !== 'in-progress') {
    throw new TrainingSessionError(
      'Only an in-progress attempt can be resumed.',
    );
  }
  if (
    attempt.userId !== LOCAL_USER_ID ||
    attempt.caseId !== fdeCase.id ||
    attempt.caseVersion !== fdeCase.metadata.version
  ) {
    throw new TrainingSessionError(
      'The attempt user, case ID, and case version must match exactly.',
    );
  }
}

function normalizeResumeTimeline(
  attempt: InProgressAttemptRecord,
): InProgressAttemptRecord {
  const startedAt = normalizeRfc3339Timestamp(attempt.startedAt, 'startedAt');
  const updatedAt = normalizeRfc3339Timestamp(attempt.updatedAt, 'updatedAt');
  let previous = startedAt;
  const roundHistory = attempt.roundHistory.map((round, index) => {
    const submittedAt = normalizeRfc3339Timestamp(
      round.submittedAt,
      `round ${index + 1} submittedAt`,
    );
    if (compareRfc3339Timestamps(submittedAt, previous) < 0) {
      throw new TrainingSessionError(
        'Attempt timestamps must be chronological from startedAt through every round.',
      );
    }
    previous = submittedAt;
    return { ...round, submittedAt };
  });
  if (compareRfc3339Timestamps(updatedAt, previous) < 0) {
    throw new TrainingSessionError(
      'Attempt updatedAt cannot be before its last submitted round.',
    );
  }
  return { ...attempt, startedAt, updatedAt, roundHistory };
}

function baseResumeState(
  fdeCase: FdeCase,
  attempt: InProgressAttemptRecord,
): ActiveTrainingState {
  return {
    phase: 'active',
    caseContent: fdeCase,
    caseId: fdeCase.id,
    caseVersion: fdeCase.metadata.version,
    attemptId: attempt.id,
    startedAt: attempt.startedAt,
    updatedAt: attempt.updatedAt,
    currentNode: findNode(fdeCase, fdeCase.startNodeId),
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
    transitionToken: transitionToken(attempt.id, 'active', 0, 0),
  };
}

function validateStoredEvaluation(
  node: CaseNode,
  round: AttemptRoundRecord,
): void {
  const expected: EvaluationResult = evaluateNode(node, round.submission);
  if (!sameJson(expected, round.evaluation)) {
    throw new TrainingSessionError(
      `Stored evaluation for node "${node.id}" does not match its submission.`,
    );
  }
  const expectedReveal = !expected.isCorrect && round.attemptNumber === 3;
  if (round.revealed !== expectedReveal) {
    throw new TrainingSessionError(
      `Stored reveal state for node "${node.id}" is inconsistent.`,
    );
  }
}

export function resumeAttempt(
  fdeCase: FdeCase,
  rawAttempt: AttemptRecord,
): TrainingState {
  assertResumeIdentity(fdeCase, rawAttempt);
  const attempt = normalizeResumeTimeline(rawAttempt);
  let state: TrainingState = baseResumeState(fdeCase, attempt);

  for (const [roundIndex, round] of attempt.roundHistory.entries()) {
    if (state.phase === 'feedback') {
      state = trainingReducer(state, {
        type: 'retry',
        token: state.transitionToken,
      });
    }
    if (state.phase !== 'active') {
      throw new TrainingSessionError('Stored round history is not resumable.');
    }
    validateStoredEvaluation(state.currentNode, round);
    state = trainingReducer(state, {
      type: 'evaluated',
      round,
      token: state.transitionToken,
    });
    if (state.phase === 'advancing') {
      const isLastRound = roundIndex === attempt.roundHistory.length - 1;
      const isPersistedCheckpoint =
        isLastRound &&
        state.currentNode.id === attempt.currentNodeId &&
        sameJson(state.visitedNodeIds, attempt.visitedNodeIds);
      if (isPersistedCheckpoint) {
        continue;
      }
      const nextNodeId = resolveNextNode(
        state.currentNode,
        state.pendingBranchKey,
      );
      if (nextNodeId === null) {
        throw new TrainingSessionError(
          'A terminal history must remain at its resolved checkpoint.',
        );
      }
      state = trainingReducer(state, {
        type: 'advanced',
        nextNode: findNode(fdeCase, nextNodeId),
        token: state.transitionToken,
      });
    }
  }

  const storedConsequences = attempt.consequences ?? [];
  if (
    state.currentNode?.id !== attempt.currentNodeId ||
    !sameJson(state.visitedNodeIds, attempt.visitedNodeIds) ||
    !sameJson(state.criticalErrorIds, attempt.criticalErrorIds) ||
    !sameJson(state.consequences, storedConsequences)
  ) {
    throw new TrainingSessionError(
      'Stored current node, path, critical errors, or consequences are inconsistent.',
    );
  }
  return { ...state, updatedAt: attempt.updatedAt };
}
