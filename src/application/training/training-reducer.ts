import { scoreNode } from '../../domain/scoring';
import type { AttemptRoundRecord } from '../../repositories/contracts';
import type { TrainingAction, TrainingFeedback, TrainingState } from './types';
import { TrainingSessionError } from './types';

function requirePhase(
  state: TrainingState,
  allowed: readonly TrainingState['phase'][],
  action: string,
): void {
  if (!allowed.includes(state.phase)) {
    throw new TrainingSessionError(
      `Cannot ${action} while training is in phase "${state.phase}".`,
    );
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function feedbackFor(
  state: TrainingState,
  round: AttemptRoundRecord,
): TrainingFeedback {
  const node = state.currentNode!;
  if (round.revealed) {
    return {
      kind: 'revealedAnswer',
      message: node.feedback.revealedAnswer,
      errorTypes: round.evaluation.errorTypes,
      revealed: true,
    };
  }
  if (round.attemptNumber === 1) {
    return {
      kind: 'firstWrong',
      message: node.feedback.firstWrong,
      errorTypes: round.evaluation.errorTypes,
      revealed: false,
    };
  }
  return {
    kind: 'secondWrong',
    message: node.feedback.secondWrong,
    errorTypes: round.evaluation.errorTypes,
    revealed: false,
  };
}

function validateRound(state: TrainingState, round: AttemptRoundRecord): void {
  const node = state.currentNode;
  if (node === null) {
    throw new TrainingSessionError('Cannot evaluate without a current node.');
  }
  if (round.nodeId !== node.id || round.attemptNumber !== state.attemptNumber) {
    throw new TrainingSessionError(
      'The evaluated round does not match the current node and attempt number.',
    );
  }
  const mustReveal = !round.evaluation.isCorrect && round.attemptNumber === 3;
  if (round.revealed !== mustReveal) {
    throw new TrainingSessionError(
      'Only a third incorrect round can reveal the authored answer.',
    );
  }
}

function reduceEvaluated(
  state: TrainingState,
  round: AttemptRoundRecord,
): TrainingState {
  requirePhase(state, ['active'], 'evaluate a node');
  validateRound(state, round);
  const node = state.currentNode!;
  const roundHistory = [...state.roundHistory, round];
  const criticalErrorIds = unique([
    ...state.criticalErrorIds,
    ...round.evaluation.criticalErrorIds,
  ]);
  const consequences = [
    ...state.consequences,
    ...round.evaluation.consequences,
  ];
  const resolved = round.evaluation.isCorrect || round.revealed;

  if (!resolved) {
    const nextAttempt = (round.attemptNumber + 1) as 2 | 3;
    return {
      ...state,
      phase: 'feedback',
      attemptNumber: nextAttempt,
      hintLevel: round.attemptNumber,
      roundHistory,
      criticalErrorIds,
      consequences,
      feedback: feedbackFor(state, round),
      persistenceError: null,
    };
  }

  const nodeRounds = roundHistory.slice(state.currentNodeRoundStartIndex);
  const nodeWasCritical = nodeRounds.some(
    (entry) => entry.evaluation.criticalErrorIds.length > 0,
  );
  const earnedPoints = scoreNode(
    node,
    round.evaluation,
    round.attemptNumber,
    round.revealed,
  );
  return {
    ...state,
    phase: 'advancing',
    hintLevel: round.revealed ? 3 : state.hintLevel,
    roundHistory,
    criticalErrorIds,
    consequences,
    feedback: round.revealed ? feedbackFor(state, round) : null,
    pendingBranchKey: nodeWasCritical ? 'critical' : round.evaluation.branchKey,
    scoreEntries: [
      ...state.scoreEntries,
      {
        nodeId: node.id,
        visitOrdinal: state.scoreEntries.length,
        attemptNumber: round.attemptNumber,
        earnedPoints,
        possiblePoints: node.scoring.weight,
        revealed: round.revealed,
        evaluation: round.evaluation,
        skillWeights: { ...node.skillWeights },
        critical: nodeWasCritical,
      },
    ],
    persistenceError: null,
  };
}

export function trainingReducer(
  state: TrainingState,
  action: TrainingAction,
): TrainingState {
  switch (action.type) {
    case 'loaded':
      requirePhase(state, ['loading'], 'finish loading');
      return { ...state, phase: 'active', persistenceError: null };
    case 'evaluated':
      return reduceEvaluated(state, action.round);
    case 'retry':
      requirePhase(state, ['feedback'], 'retry the current node');
      return {
        ...state,
        phase: 'active',
        feedback: null,
      };
    case 'advanced':
      requirePhase(state, ['advancing'], 'advance to the next node');
      return {
        ...state,
        phase: 'active',
        currentNode: action.nextNode,
        attemptNumber: 1,
        hintLevel: 0,
        revealedEvidenceIds: [],
        visitedNodeIds: [...state.visitedNodeIds, action.nextNode.id],
        currentNodeRoundStartIndex: state.roundHistory.length,
        feedback: null,
        pendingBranchKey: null,
        persistenceError: null,
      };
    case 'completed':
      requirePhase(state, ['advancing'], 'complete the attempt');
      return {
        ...state,
        phase: 'completed',
        currentNode: null,
        pendingBranchKey: null,
        persistenceError: null,
        completedAttempt: action.attempt,
      };
    case 'persistence-failed':
      return { ...state, persistenceError: action.message };
    case 'persistence-succeeded':
      return { ...state, persistenceError: null };
  }
}
