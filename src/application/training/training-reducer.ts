import { scoreNode } from '../../domain/scoring';
import type { AttemptRoundRecord } from '../../repositories/contracts';
import type {
  ActiveTrainingState,
  AdvancingTrainingState,
  FeedbackTrainingState,
  TrainingAction,
  TrainingFeedback,
  TrainingState,
} from './types';
import { TrainingSessionError } from './types';

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function nextTransitionToken(
  state: TrainingState,
  phase: TrainingState['phase'],
  roundCount = state.roundHistory.length,
  scoreCount = state.scoreEntries.length,
): string {
  return `${state.attemptId}:${phase}:${roundCount}:${scoreCount}`;
}

function feedbackFor(
  state: ActiveTrainingState,
  round: AttemptRoundRecord,
): TrainingFeedback {
  if (round.revealed) {
    return {
      kind: 'revealedAnswer',
      message: state.currentNode.feedback.revealedAnswer,
      errorTypes: round.evaluation.errorTypes,
      revealed: true,
    };
  }
  if (round.attemptNumber === 1) {
    return {
      kind: 'firstWrong',
      message: state.currentNode.feedback.firstWrong,
      errorTypes: round.evaluation.errorTypes,
      revealed: false,
    };
  }
  return {
    kind: 'secondWrong',
    message: state.currentNode.feedback.secondWrong,
    errorTypes: round.evaluation.errorTypes,
    revealed: false,
  };
}

function validateRound(
  state: ActiveTrainingState,
  round: AttemptRoundRecord,
): void {
  if (
    round.nodeId !== state.currentNode.id ||
    round.attemptNumber !== state.attemptNumber
  ) {
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
  state: ActiveTrainingState,
  round: AttemptRoundRecord,
): FeedbackTrainingState | AdvancingTrainingState {
  validateRound(state, round);
  const node = state.currentNode;
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
    return {
      ...state,
      phase: 'feedback',
      attemptNumber: (round.attemptNumber + 1) as 2 | 3,
      hintLevel: round.attemptNumber,
      roundHistory,
      criticalErrorIds,
      consequences,
      feedback: feedbackFor(state, round),
      persistenceError: null,
      transitionToken: nextTransitionToken(
        state,
        'feedback',
        roundHistory.length,
      ),
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
    transitionToken: nextTransitionToken(
      state,
      'advancing',
      roundHistory.length,
      state.scoreEntries.length + 1,
    ),
  };
}

function isTransitionAction(
  action: TrainingAction,
): action is Exclude<
  TrainingAction,
  { type: 'persistence-failed' } | { type: 'persistence-succeeded' }
> {
  return (
    action.type !== 'persistence-failed' &&
    action.type !== 'persistence-succeeded'
  );
}

function invalidPhase(state: TrainingState, action: string): never {
  throw new TrainingSessionError(
    `Cannot ${action} while training is in phase "${state.phase}".`,
  );
}

export function trainingReducer(
  state: TrainingState,
  action: TrainingAction,
): TrainingState {
  if (isTransitionAction(action) && action.token !== state.transitionToken) {
    return state;
  }

  switch (action.type) {
    case 'loaded':
      if (state.phase !== 'loading') {
        return invalidPhase(state, 'finish loading');
      }
      return {
        ...state,
        phase: 'active',
        persistenceError: null,
        transitionToken: nextTransitionToken(state, 'active'),
      };
    case 'evaluated':
      return state.phase === 'active'
        ? reduceEvaluated(state, action.round)
        : invalidPhase(state, 'evaluate a node');
    case 'retry':
      if (state.phase !== 'feedback') {
        return invalidPhase(state, 'retry the current node');
      }
      return {
        ...state,
        phase: 'active',
        feedback: null,
        transitionToken: nextTransitionToken(state, 'active'),
      };
    case 'advanced':
      if (state.phase !== 'advancing') {
        return invalidPhase(state, 'advance to the next node');
      }
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
        transitionToken: nextTransitionToken(state, 'active'),
      };
    case 'completed':
      if (state.phase !== 'advancing') {
        return invalidPhase(state, 'complete the attempt');
      }
      return {
        ...state,
        phase: 'completed',
        currentNode: null,
        feedback: null,
        pendingBranchKey: null,
        persistenceError: null,
        completedAttempt: action.attempt,
        transitionToken: nextTransitionToken(state, 'completed'),
      };
    case 'persistence-failed':
      return { ...state, persistenceError: action.message };
    case 'persistence-succeeded':
      return { ...state, persistenceError: null };
  }
}
