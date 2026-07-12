import type {
  EvidenceConclusionCaseNode,
  EvaluationResult,
} from '../cases/types';
import { EvaluationDomainError } from './evaluation-error';
import {
  applyDecisionEffects,
  assertKnownOptionIds,
  assertUniqueIds,
  FALLBACK_ERROR_TYPE,
} from './evaluation-utils';

export function evaluateEvidenceConclusionSubmission(
  node: EvidenceConclusionCaseNode,
  conclusionId: string,
  submittedEvidenceIds: readonly string[],
): EvaluationResult {
  if (submittedEvidenceIds.length === 0) {
    throw new EvaluationDomainError(
      `Evidence submission for node "${node.id}" must not be empty.`,
    );
  }
  assertUniqueIds(submittedEvidenceIds, 'Evidence submission');
  assertKnownOptionIds(node, [node.answer.conclusionId, conclusionId]);

  const canonicalEvidenceIds = node.answer.evidenceIds;
  if (canonicalEvidenceIds.length === 0) {
    throw new EvaluationDomainError(
      `Evidence-conclusion node "${node.id}" must define supporting evidence.`,
    );
  }
  assertUniqueIds(
    canonicalEvidenceIds,
    `Supporting evidence on node "${node.id}"`,
  );
  const knownEvidenceIds = new Set(node.evidence.map(({ id }) => id));
  const unknownEvidenceId = [
    ...canonicalEvidenceIds,
    ...submittedEvidenceIds,
  ].find((evidenceId) => !knownEvidenceIds.has(evidenceId));
  if (unknownEvidenceId) {
    throw new EvaluationDomainError(
      `Unknown evidence ID "${unknownEvidenceId}" on node "${node.id}".`,
    );
  }

  const canonicalEvidenceIdSet = new Set(canonicalEvidenceIds);
  const submittedEvidenceIdSet = new Set(submittedEvidenceIds);
  const intersectionSize = submittedEvidenceIds.filter((evidenceId) =>
    canonicalEvidenceIdSet.has(evidenceId),
  ).length;
  const unionSize = new Set([...canonicalEvidenceIds, ...submittedEvidenceIds])
    .size;
  const evidenceSimilarity = intersectionSize / unionSize;
  const conclusionIsCorrect = conclusionId === node.answer.conclusionId;
  const evidenceIsExact =
    submittedEvidenceIdSet.size === canonicalEvidenceIdSet.size &&
    submittedEvidenceIds.every((evidenceId) =>
      canonicalEvidenceIdSet.has(evidenceId),
    );
  const isCorrect = conclusionIsCorrect && evidenceIsExact;
  const selectedConclusion = node.options.find(
    (option) => option.id === conclusionId,
  )!;

  return applyDecisionEffects(node, [conclusionId], {
    isCorrect,
    scoreRatio: (conclusionIsCorrect ? 0.5 : 0) + evidenceSimilarity * 0.5,
    errorTypes: conclusionIsCorrect
      ? []
      : [selectedConclusion.errorType ?? FALLBACK_ERROR_TYPE],
    criticalErrorIds: [],
    consequences: [],
    branchKey: isCorrect ? 'correct' : 'incorrect',
  });
}
