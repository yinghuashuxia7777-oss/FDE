import type { ConceptKnowledge } from '../../domain/concepts/types';

function compareConcepts(
  left: ConceptKnowledge,
  right: ConceptKnowledge,
): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function selectRelated(
  concepts: readonly ConceptKnowledge[],
  relation: (concept: ConceptKnowledge) => readonly string[],
  id: string,
): ConceptKnowledge[] {
  return concepts
    .filter((concept) => relation(concept).includes(id))
    .sort(compareConcepts);
}

export function conceptsForFoundation(
  concepts: readonly ConceptKnowledge[],
  foundationId: string,
): ConceptKnowledge[] {
  return selectRelated(
    concepts,
    (concept) => concept.relatedFoundation,
    foundationId,
  );
}

export function conceptsForCase(
  concepts: readonly ConceptKnowledge[],
  caseId: string,
): ConceptKnowledge[] {
  return selectRelated(concepts, (concept) => concept.relatedCases, caseId);
}

export interface ConceptRelationSummary {
  conceptCount: number;
  foundationRelationCount: number;
  relatedFoundationCount: number;
  caseRelationCount: number;
  relatedCaseCount: number;
}

export function summarizeConceptRelations(
  concepts: readonly ConceptKnowledge[],
): ConceptRelationSummary {
  const relatedFoundation = new Set<string>();
  const relatedCases = new Set<string>();
  let foundationRelationCount = 0;
  let caseRelationCount = 0;

  concepts.forEach((concept) => {
    foundationRelationCount += concept.relatedFoundation.length;
    caseRelationCount += concept.relatedCases.length;
    concept.relatedFoundation.forEach((id) => relatedFoundation.add(id));
    concept.relatedCases.forEach((id) => relatedCases.add(id));
  });

  return {
    conceptCount: concepts.length,
    foundationRelationCount,
    relatedFoundationCount: relatedFoundation.size,
    caseRelationCount,
    relatedCaseCount: relatedCases.size,
  };
}
