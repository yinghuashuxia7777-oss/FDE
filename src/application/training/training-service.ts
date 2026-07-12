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
  InProgressAttemptRecord,
  MistakeRecord,
  ProgressSnapshot,
  SkillMasteryRecord,
} from '../../repositories/contracts';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { trainingReducer } from './training-reducer';
import type { TrainingDependencies, TrainingState } from './types';
import { TrainingSessionError } from './types';

const FALLBACK_ERROR_TYPE = 'incorrect-submission';

function findNode(fdeCase: FdeCase, nodeId: string): CaseNode {
  const node = fdeCase.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) {
    throw new TrainingSessionError(
      `Case "${fdeCase.id}" does not contain node "${nodeId}".`,
    );
  }
  return node;
}

function persistenceMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Training progress could not be saved.';
}

function toInProgressAttempt(state: TrainingState): InProgressAttemptRecord {
  if (state.currentNode === null) {
    throw new TrainingSessionError(
      'An in-progress attempt requires a current node.',
    );
  }
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

async function saveInProgress(
  state: TrainingState,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  try {
    await dependencies.attemptRepository.save(toInProgressAttempt(state));
    return trainingReducer(state, { type: 'persistence-succeeded' });
  } catch (error) {
    return trainingReducer(state, {
      type: 'persistence-failed',
      message: persistenceMessage(error),
    });
  }
}

function initialState(
  fdeCase: FdeCase,
  dependencies: TrainingDependencies,
): TrainingState {
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
  };
}

export async function createTrainingSession(
  fdeCase: FdeCase,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  const loading = initialState(fdeCase, dependencies);
  const active = trainingReducer(loading, { type: 'loaded' });
  const saved = await saveInProgress(active, dependencies);
  if (saved.persistenceError !== null) {
    return { ...loading, persistenceError: saved.persistenceError };
  }
  return saved;
}

function assertActive(state: TrainingState): asserts state is TrainingState & {
  currentNode: CaseNode;
} {
  if (state.phase !== 'active' || state.currentNode === null) {
    throw new TrainingSessionError(
      `A node can only be submitted from the active phase, not "${state.phase}".`,
    );
  }
}

export async function submitNode(
  state: TrainingState,
  submission: NodeSubmission,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  assertActive(state);
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
    { type: 'evaluated', round },
  );

  if (evaluated.phase === 'feedback') {
    return saveInProgress(evaluated, dependencies);
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

function buildMistakes(state: TrainingState): MistakeRecord[] {
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

async function buildMastery(
  state: TrainingState,
  dependencies: TrainingDependencies,
  completedAt: string,
): Promise<SkillMasteryRecord[]> {
  const previousRecords =
    await dependencies.skillRepository.list(LOCAL_USER_ID);
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

async function buildSnapshot(
  state: TrainingState,
  dependencies: TrainingDependencies,
): Promise<ProgressSnapshot & { attempt: CompletedAttemptRecord }> {
  const completedAt = dependencies.now();
  const score = scoreCase(state.scoreEntries);
  const verdict = getVerdict(score, state.criticalErrorIds);
  const attempt: CompletedAttemptRecord = {
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
    verdict,
    criticalErrorIds: [...state.criticalErrorIds],
    visitedNodeIds: [...state.visitedNodeIds],
    roundHistory: structuredClone(state.roundHistory),
    consequences: structuredClone(state.consequences),
  };
  const previousProgress = await dependencies.progressRepository.get(
    LOCAL_USER_ID,
    state.caseId,
  );
  const progress: CaseProgressRecord = {
    userId: LOCAL_USER_ID,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    latestAttemptId: state.attemptId,
    attemptCount: (previousProgress?.attemptCount ?? 0) + 1,
    completedCount: (previousProgress?.completedCount ?? 0) + 1,
    highestScore: Math.max(previousProgress?.highestScore ?? 0, score),
    latestScore: score,
    latestVerdict: verdict,
    hasCriticalError:
      (previousProgress?.hasCriticalError ?? false) ||
      state.criticalErrorIds.length > 0,
    updatedAt: completedAt,
  };
  return {
    attempt,
    progress,
    mastery: await buildMastery(state, dependencies, completedAt),
    mistakes: buildMistakes(state),
  };
}

export async function completeAttempt(
  state: TrainingState,
  dependencies: TrainingDependencies,
): Promise<TrainingState> {
  if (
    state.phase !== 'advancing' ||
    state.currentNode === null ||
    state.pendingBranchKey === null
  ) {
    throw new TrainingSessionError(
      'Only a resolved advancing node can be completed or advanced.',
    );
  }
  const nextNodeId = resolveNextNode(state.currentNode, state.pendingBranchKey);
  if (nextNodeId !== null) {
    const nextNode = findNode(state.caseContent, nextNodeId);
    const advanced = trainingReducer(state, { type: 'advanced', nextNode });
    const candidate = { ...advanced, updatedAt: dependencies.now() };
    const saved = await saveInProgress(candidate, dependencies);
    if (saved.persistenceError !== null) {
      return trainingReducer(state, {
        type: 'persistence-failed',
        message: saved.persistenceError,
      });
    }
    return saved;
  }

  try {
    const snapshot = await buildSnapshot(state, dependencies);
    await dependencies.progressRepository.saveSnapshot(snapshot);
    return trainingReducer(
      { ...state, updatedAt: snapshot.attempt.updatedAt },
      { type: 'completed', attempt: snapshot.attempt },
    );
  } catch (error) {
    return trainingReducer(state, {
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

function baseResumeState(
  fdeCase: FdeCase,
  attempt: InProgressAttemptRecord,
): TrainingState {
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
  attempt: AttemptRecord,
): TrainingState {
  assertResumeIdentity(fdeCase, attempt);
  let state = baseResumeState(fdeCase, attempt);

  for (const [roundIndex, round] of attempt.roundHistory.entries()) {
    if (state.phase === 'feedback') {
      state = trainingReducer(state, { type: 'retry' });
    }
    if (state.phase !== 'active' || state.currentNode === null) {
      throw new TrainingSessionError('Stored round history is not resumable.');
    }
    validateStoredEvaluation(state.currentNode, round);
    state = trainingReducer(state, { type: 'evaluated', round });
    if (state.phase === 'advancing') {
      const isPersistedRevealCheckpoint =
        round.revealed && roundIndex === attempt.roundHistory.length - 1;
      if (isPersistedRevealCheckpoint) {
        continue;
      }
      const nextNodeId = resolveNextNode(
        state.currentNode!,
        state.pendingBranchKey!,
      );
      if (nextNodeId === null) {
        throw new TrainingSessionError(
          'A terminal history must be stored as a completed attempt.',
        );
      }
      state = trainingReducer(state, {
        type: 'advanced',
        nextNode: findNode(fdeCase, nextNodeId),
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
