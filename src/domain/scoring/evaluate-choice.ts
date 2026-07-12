import type {
  ChoiceCaseNode,
  EvaluationResult,
  MultipleChoiceCaseNode,
} from '../cases/types';
import { EvaluationDomainError } from './evaluation-error';
import {
  applyDecisionEffects,
  assertKnownOptionIds,
  assertUniqueIds,
  FALLBACK_ERROR_TYPE,
  isChoiceNode,
  uniqueErrorTypes,
} from './evaluation-utils';

export function evaluateChoiceSubmission(
  node: ChoiceCaseNode | MultipleChoiceCaseNode,
  selectedOptionIds: readonly string[],
): EvaluationResult {
  if (selectedOptionIds.length === 0) {
    throw new EvaluationDomainError(
      `Choice submission for node "${node.id}" must not be empty.`,
    );
  }
  assertUniqueIds(selectedOptionIds, 'Choice submission');
  assertKnownOptionIds(node, selectedOptionIds);

  if (isChoiceNode(node) && selectedOptionIds.length !== 1) {
    throw new EvaluationDomainError(
      `Choice node "${node.id}" requires exactly one selected option.`,
    );
  }

  const correctOptionIds = isChoiceNode(node)
    ? [node.answer.correctOptionId]
    : node.answer.correctOptionIds;
  if (correctOptionIds.length === 0) {
    throw new EvaluationDomainError(
      `Node "${node.id}" must define at least one correct option.`,
    );
  }
  assertUniqueIds(correctOptionIds, `Correct options on node "${node.id}"`);
  assertKnownOptionIds(node, correctOptionIds);

  const selectedOptionIdSet = new Set(selectedOptionIds);
  const correctOptionIdSet = new Set(correctOptionIds);
  const correctSelected = selectedOptionIds.filter((optionId) =>
    correctOptionIdSet.has(optionId),
  ).length;
  const wrongSelected = selectedOptionIds.length - correctSelected;
  const missingCorrect = correctOptionIds.length - correctSelected;
  const isCorrect =
    wrongSelected === 0 &&
    missingCorrect === 0 &&
    selectedOptionIds.length === correctOptionIds.length;
  const rawScore =
    (correctSelected - wrongSelected - 0.5 * missingCorrect) /
    correctOptionIds.length;
  const scoreRatio = isChoiceNode(node)
    ? isCorrect
      ? 1
      : 0
    : Math.min(1, Math.max(0, rawScore));
  const wrongOptions = node.options.filter(
    (option) =>
      selectedOptionIdSet.has(option.id) && !correctOptionIdSet.has(option.id),
  );
  const optionBranchKey = `option:${selectedOptionIds[0] ?? ''}`;
  const hasOptionBranch =
    isChoiceNode(node) &&
    node.branches.some((branch) => branch.key === optionBranchKey);
  const branchKey = hasOptionBranch
    ? optionBranchKey
    : isCorrect
      ? 'correct'
      : 'incorrect';

  return applyDecisionEffects(node, selectedOptionIds, {
    isCorrect,
    scoreRatio,
    errorTypes: uniqueErrorTypes(
      wrongOptions.map((option) => option.errorType ?? FALLBACK_ERROR_TYPE),
    ),
    criticalErrorIds: [],
    consequences: [],
    branchKey,
  });
}
