export type CaseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type UnreviewedCaseStatus = 'planned' | 'draft';
export type ReviewedCaseStatus = 'reviewed' | 'published' | 'deprecated';
export type CaseStatus = UnreviewedCaseStatus | ReviewedCaseStatus;

export type ChoiceNodeType =
  | 'single-choice'
  | 'true-false'
  | 'log-analysis'
  | 'command-choice'
  | 'diff-review'
  | 'configuration-review'
  | 'architecture-tradeoff'
  | 'customer-response';

export type NodeType =
  | ChoiceNodeType
  | 'multiple-choice'
  | 'ordering'
  | 'matching'
  | 'evidence-conclusion';

export type EvidenceType =
  | 'text'
  | 'log'
  | 'terminal'
  | 'http'
  | 'json'
  | 'diff'
  | 'config'
  | 'metric'
  | 'diagram'
  | 'customer-message';

/** Error identifiers are content-defined so the taxonomy can evolve safely. */
export type ErrorType = string;

export interface Evidence {
  id: string;
  type: EvidenceType;
  title?: string | undefined;
  content: string;
  language?: string | undefined;
}

export interface Option {
  id: string;
  label: string;
  explanation: string;
  errorType?: ErrorType | undefined;
}

export interface Feedback {
  firstWrong: string;
  secondWrong: string;
  revealedAnswer: string;
}

export interface Scoring {
  firstTry: number;
  secondTry: number;
  thirdTry: number;
  weight: number;
  criticalErrorOptionIds?: string[] | undefined;
}

export interface Consequence {
  optionId: string;
  timeDelta?: number | undefined;
  costDelta?: number | undefined;
  trustDelta?: number | undefined;
  riskDelta?: number | undefined;
  message?: string | undefined;
}

export interface ConsequenceDelta {
  timeDelta?: number | undefined;
  costDelta?: number | undefined;
  trustDelta?: number | undefined;
  riskDelta?: number | undefined;
  message?: string | undefined;
}

/** A null next node terminates the case explicitly. */
export interface Branch {
  key: string;
  nextNodeId: string | null;
}

interface SharedCaseNode {
  id: string;
  title?: string | undefined;
  prompt: string;
  skillWeights: Record<string, number>;
  evidence: Evidence[];
  options: Option[];
  feedback: Feedback;
  scoring: Scoring;
  consequences?: Consequence[] | undefined;
  branches: Branch[];
}

export interface ChoiceAnswer {
  correctOptionId: string;
}

export interface MultipleChoiceAnswer {
  correctOptionIds: string[];
}

export interface OrderingAnswer {
  orderedOptionIds: string[];
  priorityOptionIds?: string[] | undefined;
  hazardousOptionIds?: string[] | undefined;
}

export interface MatchingAnswer {
  pairs: Record<string, string>;
}

export interface EvidenceConclusionAnswer {
  conclusionId: string;
  evidenceIds: string[];
}

export interface ChoiceCaseNode extends SharedCaseNode {
  type: ChoiceNodeType;
  answer: ChoiceAnswer;
}

export interface MultipleChoiceCaseNode extends SharedCaseNode {
  type: 'multiple-choice';
  answer: MultipleChoiceAnswer;
}

export interface OrderingCaseNode extends SharedCaseNode {
  type: 'ordering';
  answer: OrderingAnswer;
}

export interface MatchingCaseNode extends SharedCaseNode {
  type: 'matching';
  answer: MatchingAnswer;
}

export interface EvidenceConclusionCaseNode extends SharedCaseNode {
  type: 'evidence-conclusion';
  answer: EvidenceConclusionAnswer;
}

export type CaseNode =
  | ChoiceCaseNode
  | MultipleChoiceCaseNode
  | OrderingCaseNode
  | MatchingCaseNode
  | EvidenceConclusionCaseNode;

export interface Debrief {
  summary: string;
  rootCause: string;
  correctApproach: string[];
  keyLessons: string[];
  interviewerPerspective: string;
  customerRiskPerspective: string;
  remediation: string[];
  verification: string[];
  knowledgePoints: string[];
  recommendedCaseIds?: string[] | undefined;
}

export interface CaseScenario {
  customerProfile: string;
  background: string;
  initialIncident: string;
  constraints: string[];
  confirmedFacts: string[];
}

export interface CaseMetadata {
  version: number;
  sourceType: string;
  sourceReferences?: string[] | undefined;
  createdAt: string;
  reviewedAt: string | null;
  applicableVersions: string[];
  author: string;
  reviewer: string | null;
}

export interface UnreviewedCaseMetadata extends CaseMetadata {
  reviewedAt: null;
  reviewer: null;
}

export interface ReviewedCaseMetadata extends CaseMetadata {
  reviewedAt: string;
  reviewer: string;
}

interface SharedFdeCase {
  schemaVersion: 1;
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: CaseLevel;
  estimatedMinutes: number;
  domains: string[];
  skills: string[];
  lifecycleStages: string[];
  technicalLayers: string[];
  environments: string[];
  riskTypes: string[];
  behaviorPatterns: string[];
  scenario: CaseScenario;
  startNodeId: string;
  nodes: CaseNode[];
  debrief: Debrief;
}

export interface UnreviewedFdeCase extends SharedFdeCase {
  status: UnreviewedCaseStatus;
  metadata: UnreviewedCaseMetadata;
}

export interface ReviewedFdeCase extends SharedFdeCase {
  status: ReviewedCaseStatus;
  metadata: ReviewedCaseMetadata;
}

export type FdeCase = UnreviewedFdeCase | ReviewedFdeCase;

export type NodeSubmission =
  | { type: 'choice'; selectedOptionIds: string[] }
  | { type: 'ordering'; orderedOptionIds: string[] }
  | { type: 'matching'; pairs: Record<string, string> }
  | {
      type: 'evidence-conclusion';
      conclusionId: string;
      evidenceIds: string[];
    };

export interface EvaluationResult {
  isCorrect: boolean;
  scoreRatio: number;
  errorTypes: ErrorType[];
  criticalErrorIds: string[];
  consequences: ConsequenceDelta[];
  branchKey: string;
}
