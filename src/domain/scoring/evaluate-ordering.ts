import type { EvaluationResult, OrderingCaseNode } from '../cases/types';
import { EvaluationDomainError } from './evaluation-error';
import {
  arraysEqual,
  assertKnownOptionIds,
  assertUniqueIds,
} from './evaluation-utils';

function pairwiseAccuracy(
  canonicalOrder: readonly string[],
  submittedOrder: readonly string[],
): number {
  const submittedPositions = new Map(
    submittedOrder.map((optionId, index) => [optionId, index]),
  );
  let correctlyOrderedPairs = 0;
  let totalPairs = 0;

  for (let leftIndex = 0; leftIndex < canonicalOrder.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < canonicalOrder.length;
      rightIndex += 1
    ) {
      totalPairs += 1;
      const leftPosition = submittedPositions.get(canonicalOrder[leftIndex]!);
      const rightPosition = submittedPositions.get(canonicalOrder[rightIndex]!);
      if (
        leftPosition !== undefined &&
        rightPosition !== undefined &&
        leftPosition < rightPosition
      ) {
        correctlyOrderedPairs += 1;
      }
    }
  }

  return totalPairs === 0 ? 1 : correctlyOrderedPairs / totalPairs;
}

function milestoneAccuracy(
  node: OrderingCaseNode,
  canonicalOrder: readonly string[],
  submittedOrder: readonly string[],
): number {
  const milestoneOptionIds = [
    ...new Set([
      ...(node.answer.priorityOptionIds ?? []),
      ...(node.answer.hazardousOptionIds ?? []),
    ]),
  ];
  assertKnownOptionIds(node, milestoneOptionIds);

  return milestoneOptionIds.length === 0
    ? 1
    : milestoneOptionIds.filter((optionId) => {
        const canonicalIndex = canonicalOrder.indexOf(optionId);
        return submittedOrder[canonicalIndex] === optionId;
      }).length / milestoneOptionIds.length;
}

export function evaluateOrderingSubmission(
  node: OrderingCaseNode,
  submittedOrder: readonly string[],
): EvaluationResult {
  const canonicalOrder = node.answer.orderedOptionIds;
  if (canonicalOrder.length === 0) {
    throw new EvaluationDomainError(
      `Ordering node "${node.id}" must define a canonical order.`,
    );
  }
  if (submittedOrder.length === 0) {
    throw new EvaluationDomainError(
      `Ordering submission for node "${node.id}" must not be empty.`,
    );
  }
  assertUniqueIds(canonicalOrder, `Canonical order on node "${node.id}"`);
  assertUniqueIds(submittedOrder, 'Ordering submission');
  assertKnownOptionIds(node, canonicalOrder);
  assertKnownOptionIds(node, submittedOrder);

  const knownOptionIds = new Set(node.options.map(({ id }) => id));
  if (
    canonicalOrder.length !== knownOptionIds.size ||
    canonicalOrder.some((optionId) => !knownOptionIds.has(optionId))
  ) {
    throw new EvaluationDomainError(
      `Canonical order on node "${node.id}" must contain every option exactly once.`,
    );
  }
  const submittedOptionIds = new Set(submittedOrder);
  if (
    submittedOrder.length !== canonicalOrder.length ||
    canonicalOrder.some((optionId) => !submittedOptionIds.has(optionId))
  ) {
    throw new EvaluationDomainError(
      `Ordering submission for node "${node.id}" must be a complete permutation of the canonical options.`,
    );
  }

  const isCorrect = arraysEqual(submittedOrder, canonicalOrder);
  const scoreRatio =
    (submittedOrder[0] === canonicalOrder[0] ? 0.35 : 0) +
    pairwiseAccuracy(canonicalOrder, submittedOrder) * 0.45 +
    milestoneAccuracy(node, canonicalOrder, submittedOrder) * 0.2;

  return {
    isCorrect,
    scoreRatio,
    errorTypes: [],
    criticalErrorIds: [],
    consequences: [],
    branchKey: isCorrect ? 'correct' : 'incorrect',
  };
}
