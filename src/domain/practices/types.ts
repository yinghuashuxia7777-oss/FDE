export type PracticeStatus =
  'planned' | 'draft' | 'reviewed' | 'published' | 'deprecated';

export type PracticeDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type PracticeActionKind =
  'decision' | 'diagnose' | 'construct' | 'evaluate' | 'configure';

export type PracticeResponseType =
  'single-choice' | 'multiple-choice' | 'text' | 'json' | 'configuration';

export interface PracticeStimulus {
  id: string;
  type: string;
  content: string;
}

export interface PracticeResponseContract {
  type: PracticeResponseType;
  requiredFields: string[];
}

export interface PracticeAction {
  id: string;
  kind: PracticeActionKind;
  prompt: string;
  stimulus: PracticeStimulus[];
  responseContract: PracticeResponseContract;
  /** A Practice has exactly one authored action, and it is always scored. */
  scored: true;
}

export interface PracticeRubricReference {
  rubricId: string;
  skillId: string;
  version: number;
}

export type PracticeExpectedValue = string | number | boolean | string[];

export interface PracticeDeterministicAnswerContract {
  expectedFields: Record<string, PracticeExpectedValue>;
  scoring: {
    mode: 'exact-match' | 'required-field-match';
    passingScore: number;
  };
}

interface SharedPracticeEvaluation {
  rubricRef: PracticeRubricReference;
  criterionIds: string[];
}

export interface DeterministicPracticeEvaluation extends SharedPracticeEvaluation {
  method: 'deterministic';
  answerContract: PracticeDeterministicAnswerContract;
}

export interface ReviewedPracticeEvaluation extends SharedPracticeEvaluation {
  method: 'reviewed';
  answerContract?: PracticeDeterministicAnswerContract | undefined;
}

export type PracticeEvaluation =
  DeterministicPracticeEvaluation | ReviewedPracticeEvaluation;

export interface PracticeEvidenceOutputContract {
  artifactType: string;
  requiredFields: string[];
  eligibilityRule: string;
  sourceReferencePolicy: 'required' | 'optional' | 'forbidden';
  criticalFailurePolicy: string;
}

export interface PracticeFeedback {
  correct: string;
  partial: string;
  incorrect: string;
  criticalFailure: string;
}

export interface PracticeMetadata {
  createdAt: string;
  reviewedAt: string | null;
  author: string;
  reviewer: string | null;
}

/** Authored content only. Runtime outcomes belong to a future evidence ledger. */
export interface PracticeDefinition {
  schemaVersion: 1;
  skillCatalogVersion: string;
  rubricSetVersion: string;
  id: string;
  version: number;
  status: PracticeStatus;
  title: string;
  summary: string;
  primaryConceptId: string;
  foundationIds: string[];
  primaryLeafSkillId: string;
  difficulty: PracticeDifficulty;
  estimatedMinutes: number;
  action: PracticeAction;
  evaluation: PracticeEvaluation;
  evidenceOutputContract: PracticeEvidenceOutputContract;
  feedback: PracticeFeedback;
  metadata: PracticeMetadata;
}
