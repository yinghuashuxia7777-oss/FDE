export type ConceptCategory = 'api-backend' | 'system' | 'ai' | 'fde';

export interface ConceptKnowledge {
  schemaVersion: 1;
  id: string;
  type: 'concept';
  category: ConceptCategory;
  order: number;
  title: string;
  technicalTerm: string;
  simpleExplanation: string;
  analogy: string;
  technicalExplanation: string;
  whyItMatters: string;
  commonMistakes: string;
  relatedFoundation: string[];
  relatedCases: string[];
}
