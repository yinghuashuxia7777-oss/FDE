import type { EvaluationResult, MatchingCaseNode } from '../cases/types';
import { EvaluationDomainError } from './evaluation-error';
import { assertKnownOptionIds, assertUniqueIds } from './evaluation-utils';

export function evaluateMatchingSubmission(
  node: MatchingCaseNode,
  submittedPairs: Readonly<Record<string, string>>,
): EvaluationResult {
  const canonicalEntries = Object.entries(node.answer.pairs);
  const submittedEntries = Object.entries(submittedPairs);
  if (canonicalEntries.length === 0) {
    throw new EvaluationDomainError(
      `Matching node "${node.id}" must define at least one pair.`,
    );
  }
  if (submittedEntries.length === 0) {
    throw new EvaluationDomainError(
      `Matching submission for node "${node.id}" must not be empty.`,
    );
  }

  const canonicalLeftIds = canonicalEntries.map(([leftId]) => leftId);
  const canonicalRightIds = canonicalEntries.map(([, rightId]) => rightId);
  assertUniqueIds(
    canonicalRightIds,
    `Canonical matching targets on node "${node.id}"`,
  );
  assertKnownOptionIds(node, [...canonicalLeftIds, ...canonicalRightIds]);

  const participatingOptionIds = [...canonicalLeftIds, ...canonicalRightIds];
  if (
    participatingOptionIds.length !== node.options.length ||
    new Set(participatingOptionIds).size !== node.options.length
  ) {
    throw new EvaluationDomainError(
      `Canonical pairs on node "${node.id}" must use every option exactly once.`,
    );
  }

  const canonicalLeftIdSet = new Set(canonicalLeftIds);
  const canonicalRightIdSet = new Set(canonicalRightIds);
  const invalidLeftId = submittedEntries.find(
    ([leftId]) => !canonicalLeftIdSet.has(leftId),
  )?.[0];
  if (invalidLeftId) {
    throw new EvaluationDomainError(
      `Unknown matching source ID "${invalidLeftId}" on node "${node.id}".`,
    );
  }
  const invalidRightId = submittedEntries.find(
    ([, rightId]) => !canonicalRightIdSet.has(rightId),
  )?.[1];
  if (invalidRightId) {
    throw new EvaluationDomainError(
      `Unknown matching target ID "${invalidRightId}" on node "${node.id}".`,
    );
  }

  const correctPairCount = submittedEntries.filter(
    ([leftId, rightId]) => node.answer.pairs[leftId] === rightId,
  ).length;
  const submittedRightIds = submittedEntries.map(([, rightId]) => rightId);
  const isCorrect =
    submittedEntries.length === canonicalEntries.length &&
    new Set(submittedRightIds).size === submittedRightIds.length &&
    correctPairCount === canonicalEntries.length;

  return {
    isCorrect,
    scoreRatio: correctPairCount / canonicalEntries.length,
    errorTypes: [],
    criticalErrorIds: [],
    consequences: [],
    branchKey: isCorrect ? 'correct' : 'incorrect',
  };
}
