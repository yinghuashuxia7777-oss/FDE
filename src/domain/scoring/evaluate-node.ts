import type {
  CaseNode,
  EvaluationResult,
  NodeSubmission,
} from '../cases/types';
import { evaluateChoiceSubmission } from './evaluate-choice';
import { EvaluationDomainError } from './evaluation-error';
import { evaluateEvidenceConclusionSubmission } from './evaluate-evidence-conclusion';
import { evaluateMatchingSubmission } from './evaluate-matching';
import { evaluateOrderingSubmission } from './evaluate-ordering';
import { isChoiceNode } from './evaluation-utils';

export { EvaluationDomainError } from './evaluation-error';

function submissionMismatch(node: CaseNode, submission: NodeSubmission): never {
  throw new EvaluationDomainError(
    `Submission type "${submission.type}" does not match node type "${node.type}".`,
  );
}

export function evaluateNode(
  node: CaseNode,
  submission: NodeSubmission,
): EvaluationResult {
  switch (node.type) {
    case 'ordering':
      return submission.type === 'ordering'
        ? evaluateOrderingSubmission(node, submission.orderedOptionIds)
        : submissionMismatch(node, submission);
    case 'matching':
      return submission.type === 'matching'
        ? evaluateMatchingSubmission(node, submission.pairs)
        : submissionMismatch(node, submission);
    case 'evidence-conclusion':
      return submission.type === 'evidence-conclusion'
        ? evaluateEvidenceConclusionSubmission(
            node,
            submission.conclusionId,
            submission.evidenceIds,
          )
        : submissionMismatch(node, submission);
    case 'multiple-choice':
      return submission.type === 'choice'
        ? evaluateChoiceSubmission(node, submission.selectedOptionIds)
        : submissionMismatch(node, submission);
    default:
      if (!isChoiceNode(node) || submission.type !== 'choice') {
        return submissionMismatch(node, submission);
      }
      return evaluateChoiceSubmission(node, submission.selectedOptionIds);
  }
}
