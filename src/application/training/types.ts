import type {
  CaseNode,
  ConsequenceDelta,
  EvaluationResult,
  FdeCase,
} from '../../domain/cases/types';
import type { AttemptNumber } from '../../domain/scoring';
import type {
  AttemptRepository,
  AttemptRoundRecord,
  CompletedAttemptRecord,
  ProgressRepository,
  SkillRepository,
} from '../../repositories/contracts';

export type TrainingPhase =
  'loading' | 'active' | 'feedback' | 'advancing' | 'completed';

export interface TrainingFeedback {
  kind: 'firstWrong' | 'secondWrong' | 'revealedAnswer';
  message: string;
  errorTypes: string[];
  revealed: boolean;
}

export interface NodeScoreEntry {
  nodeId: string;
  visitOrdinal: number;
  attemptNumber: AttemptNumber;
  earnedPoints: number;
  possiblePoints: number;
  revealed: boolean;
  evaluation: EvaluationResult;
  skillWeights: Record<string, number>;
  critical: boolean;
}

interface TrainingStateBase {
  caseContent: FdeCase;
  caseId: string;
  caseVersion: number;
  attemptId: string;
  startedAt: string;
  updatedAt: string;
  currentNode: CaseNode | null;
  attemptNumber: AttemptNumber;
  hintLevel: 0 | 1 | 2 | 3;
  revealedEvidenceIds: string[];
  roundHistory: AttemptRoundRecord[];
  visitedNodeIds: string[];
  scoreEntries: NodeScoreEntry[];
  consequences: ConsequenceDelta[];
  criticalErrorIds: string[];
  currentNodeRoundStartIndex: number;
  persistenceError: string | null;
  transitionToken: string;
}

export interface LoadingTrainingState extends TrainingStateBase {
  phase: 'loading';
  currentNode: CaseNode;
  feedback: null;
  pendingBranchKey: null;
  completedAttempt?: never;
}

export interface ActiveTrainingState extends TrainingStateBase {
  phase: 'active';
  currentNode: CaseNode;
  feedback: null;
  pendingBranchKey: null;
  completedAttempt?: never;
}

export interface FeedbackTrainingState extends TrainingStateBase {
  phase: 'feedback';
  currentNode: CaseNode;
  feedback: TrainingFeedback;
  pendingBranchKey: null;
  completedAttempt?: never;
}

export interface AdvancingTrainingState extends TrainingStateBase {
  phase: 'advancing';
  currentNode: CaseNode;
  feedback: TrainingFeedback | null;
  pendingBranchKey: string;
  completedAttempt?: never;
}

export interface CompletedTrainingState extends TrainingStateBase {
  phase: 'completed';
  currentNode: null;
  feedback: null;
  pendingBranchKey: null;
  completedAttempt: CompletedAttemptRecord;
}

export type TrainingState =
  | LoadingTrainingState
  | ActiveTrainingState
  | FeedbackTrainingState
  | AdvancingTrainingState
  | CompletedTrainingState;

export interface TrainingDependencies {
  attemptRepository: Pick<AttemptRepository, 'save'>;
  progressRepository: Pick<ProgressRepository, 'commitCompletion'>;
  /** Kept for repository-bundle compatibility; completion reads are transactional. */
  skillRepository?: Pick<SkillRepository, 'list'> | undefined;
  now: () => string;
  createId: () => string;
}

export type TrainingAction =
  | TransitionAction<'loaded'>
  | (TransitionAction<'evaluated'> & { round: AttemptRoundRecord })
  | TransitionAction<'retry'>
  | (TransitionAction<'advanced'> & { nextNode: CaseNode })
  | (TransitionAction<'completed'> & { attempt: CompletedAttemptRecord })
  | { type: 'persistence-failed'; message: string }
  | { type: 'persistence-succeeded' };

interface TransitionAction<Type extends string> {
  type: Type;
  token: string;
}

export class TrainingSessionError extends Error {
  override readonly name = 'TrainingSessionError';
}
