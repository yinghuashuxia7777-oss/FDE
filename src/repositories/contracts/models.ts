import type {
  CaseLevel,
  CaseStatus,
  ConsequenceDelta,
  ErrorType,
  EvaluationResult,
  FdeCase,
  NodeSubmission,
} from '../../domain/cases/types';
import type { AttemptNumber } from '../../domain/scoring/score-node';
import type { Verdict } from '../../domain/scoring/case-score';

export const LOCAL_USER_ID = 'local-user' as const;

export interface CaseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: CaseLevel;
  status: CaseStatus;
  version: number;
  estimatedMinutes: number;
  domains: string[];
  skills: string[];
  riskTypes: string[];
}

export interface CaseQuery {
  level?: CaseLevel | undefined;
  status?: CaseStatus | undefined;
  domain?: string | undefined;
}

export type AttemptStatus = 'in-progress' | 'completed' | 'abandoned';

export interface AttemptRoundRecord {
  nodeId: string;
  attemptNumber: AttemptNumber;
  submission: NodeSubmission;
  evaluation: EvaluationResult;
  submittedAt: string;
  revealed: boolean;
}

export interface AttemptRecord {
  id: string;
  userId: string;
  caseId: string;
  caseVersion: number;
  status: AttemptStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
  currentNodeId: string | null;
  score?: number | undefined;
  verdict?: Verdict | undefined;
  criticalErrorIds: string[];
  visitedNodeIds: string[];
  roundHistory: AttemptRoundRecord[];
  consequences?: ConsequenceDelta[] | undefined;
}

export interface AttemptQuery {
  userId?: string | undefined;
  caseId?: string | undefined;
  status?: AttemptStatus | undefined;
  completedAfter?: string | undefined;
}

export interface CaseProgressRecord {
  userId: string;
  caseId: string;
  caseVersion: number;
  latestAttemptId: string;
  attemptCount: number;
  completedCount: number;
  highestScore: number;
  latestScore: number;
  latestVerdict: Verdict;
  hasCriticalError: boolean;
  updatedAt: string;
}

export interface SkillMasteryRecord {
  userId: string;
  skillId: string;
  score: number;
  sampleCount: number;
  updatedAt: string;
}

export interface MistakeRecord {
  id: string;
  userId: string;
  attemptId: string;
  caseId: string;
  caseVersion: number;
  nodeId: string;
  submission: NodeSubmission;
  correctSubmission: NodeSubmission;
  errorTypes: ErrorType[];
  evidenceIds: string[];
  skillIds: string[];
  critical: boolean;
  createdAt: string;
  redoScores: number[];
}

export interface MistakeQuery {
  userId?: string | undefined;
  skillId?: string | undefined;
  errorType?: ErrorType | undefined;
  critical?: boolean | undefined;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserSettings {
  userId: string;
  theme: ThemePreference;
  updatedAt: string;
}

export interface LocalUser {
  id: typeof LOCAL_USER_ID;
  displayName: string;
  createdAt: string;
}

export type CoverageStatus = 'implemented' | 'planned' | 'deprecated';

export interface CoverageRecord {
  caseId: string;
  status: CoverageStatus;
  level: CaseLevel;
  domains: string[];
  skills: string[];
  updatedAt: string;
}

export interface ProgressSnapshot {
  attempt: AttemptRecord;
  progress: CaseProgressRecord;
  mastery: SkillMasteryRecord[];
  mistakes: MistakeRecord[];
}

export interface CaseVersionRecord {
  caseId: string;
  version: number;
  status: CaseStatus;
  level: CaseLevel;
  canonicalContent: string;
  content: FdeCase;
}

export interface StoredMistakeRecord extends MistakeRecord {
  criticalIndex: 'critical' | 'non-critical';
}

export interface AppMetaRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}
