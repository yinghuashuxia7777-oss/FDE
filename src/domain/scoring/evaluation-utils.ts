import type {
  CaseNode,
  ChoiceCaseNode,
  Consequence,
  ConsequenceDelta,
  EvidenceConclusionCaseNode,
  EvaluationResult,
  MultipleChoiceCaseNode,
} from '../cases/types';
import { EvaluationDomainError } from './evaluation-error';

export const FALLBACK_ERROR_TYPE = 'incorrect-option';

export function isChoiceNode(node: CaseNode): node is ChoiceCaseNode {
  switch (node.type) {
    case 'single-choice':
    case 'true-false':
    case 'log-analysis':
    case 'command-choice':
    case 'diff-review':
    case 'configuration-review':
    case 'architecture-tradeoff':
    case 'customer-response':
      return true;
    default:
      return false;
  }
}

export function assertUniqueIds(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new EvaluationDomainError(`${label} must not contain duplicate IDs.`);
  }
}

export function assertKnownOptionIds(
  node: CaseNode,
  optionIds: readonly string[],
): void {
  const knownOptionIds = new Set(node.options.map(({ id }) => id));
  const unknownOptionId = optionIds.find(
    (optionId) => !knownOptionIds.has(optionId),
  );
  if (unknownOptionId) {
    throw new EvaluationDomainError(
      `Unknown option ID "${unknownOptionId}" on node "${node.id}".`,
    );
  }
}

export function uniqueErrorTypes(errorTypes: readonly string[]): string[] {
  return [...new Set(errorTypes)];
}

export function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function toConsequenceDelta(consequence: Consequence): ConsequenceDelta {
  const delta = { ...consequence };
  Reflect.deleteProperty(delta, 'optionId');
  return delta;
}

export function applyDecisionEffects(
  node: ChoiceCaseNode | MultipleChoiceCaseNode | EvidenceConclusionCaseNode,
  selectedOptionIds: readonly string[],
  result: EvaluationResult,
): EvaluationResult {
  const selectedOptionIdSet = new Set(selectedOptionIds);
  const criticalOptionIdSet = new Set(
    node.scoring.criticalErrorOptionIds ?? [],
  );
  const criticalErrorIds = [
    ...new Set(
      selectedOptionIds.filter((optionId) => criticalOptionIdSet.has(optionId)),
    ),
  ];
  const consequences = (node.consequences ?? [])
    .filter(({ optionId }) => selectedOptionIdSet.has(optionId))
    .map(toConsequenceDelta);

  return {
    ...result,
    criticalErrorIds,
    consequences,
    branchKey: criticalErrorIds.length > 0 ? 'critical' : result.branchKey,
  };
}
