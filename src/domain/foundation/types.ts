export type FoundationTrack = 'computer-basics' | 'network-api' | 'ai-basics';

export type FoundationLearningStatus = 'not-started' | 'learning' | 'mastered';

export type FoundationLevel = 'beginner' | 'intermediate' | 'advanced';

export interface FoundationKnowledgeContent {
  simpleExplanation: string;
  analogy: string;
  technicalExplanation: string;
  example: string;
  commonMistakes: string;
}

export interface FoundationKnowledge {
  schemaVersion: 1;
  id: string;
  type: 'foundation';
  title: string;
  domain: string;
  track: FoundationTrack;
  skills: string[];
  level: FoundationLevel;
  order: number;
  estimatedMinutes: number;
  content: FoundationKnowledgeContent;
  relatedCases: string[];
}
