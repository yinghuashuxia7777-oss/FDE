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

export interface TrainingState {
  phase: TrainingPhase;
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
  feedback: TrainingFeedback | null;
  pendingBranchKey: string | null;
  persistenceError: string | null;
  completedAttempt?: CompletedAttemptRecord | undefined;
}

export interface TrainingDependencies {
  attemptRepository: Pick<AttemptRepository, 'save'>;
  progressRepository: Pick<ProgressRepository, 'get' | 'saveSnapshot'>;
  skillRepository: Pick<SkillRepository, 'list'>;
  now: () => string;
  createId: () => string;
}

export type TrainingAction =
  | { type: 'loaded' }
  | { type: 'evaluated'; round: AttemptRoundRecord }
  | { type: 'retry' }
  | { type: 'advanced'; nextNode: CaseNode }
  | { type: 'completed'; attempt: CompletedAttemptRecord }
  | { type: 'persistence-failed'; message: string }
  | { type: 'persistence-succeeded' };

export class TrainingSessionError extends Error {
  override readonly name = 'TrainingSessionError';
}
