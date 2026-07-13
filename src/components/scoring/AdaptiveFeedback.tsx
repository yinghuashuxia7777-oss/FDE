import type { TrainingFeedback } from '../../application/training';
import type { CaseNode } from '../../domain/cases/types';

interface AdaptiveFeedbackProps {
  feedback: TrainingFeedback | null;
  node: CaseNode;
}

interface ErrorTypeListProps {
  errorTypes: readonly string[];
}

function ErrorTypeList({ errorTypes }: ErrorTypeListProps) {
  if (errorTypes.length === 0) {
    return <p>No error classification recorded.</p>;
  }

  return (
    <div>
      <strong>Error types</strong>
      <ul aria-label="Error types">
        {errorTypes.map((errorType, index) => (
          <li key={`${errorType}-${String(index)}`}>{errorType}</li>
        ))}
      </ul>
    </div>
  );
}

export function AdaptiveFeedback({ feedback, node }: AdaptiveFeedbackProps) {
  if (feedback === null) {
    return null;
  }

  const isRevealed =
    feedback.kind === 'revealedAnswer' && feedback.revealed === true;

  if (isRevealed) {
    return (
      <section
        className="adaptive-feedback"
        data-feedback-kind="revealedAnswer"
        role="status"
        aria-label="Answer revealed"
        aria-live="polite"
      >
        <h3>Answer revealed</h3>
        <p>{node.feedback.revealedAnswer}</p>
        <ErrorTypeList errorTypes={feedback.errorTypes} />
        <div>
          <strong>Option explanations</strong>
          <ul aria-label="Option explanations">
            {node.options.map((option) => (
              <li key={option.id}>
                <strong>{option.label}</strong>
                <span>{option.explanation}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (feedback.kind === 'revealedAnswer') {
    return (
      <section
        className="adaptive-feedback"
        data-feedback-kind="reveal-withheld"
        role="status"
        aria-label="Answer remains hidden"
        aria-live="polite"
      >
        <h3>Answer remains hidden</h3>
        <p>
          Reveal confirmation is incomplete. The authored answer is not shown.
        </p>
        <ErrorTypeList errorTypes={feedback.errorTypes} />
      </section>
    );
  }

  const isSecondHint = feedback.kind === 'secondWrong';
  const label = isSecondHint ? 'Second hint' : 'First hint';

  return (
    <section
      className="adaptive-feedback"
      data-feedback-kind={isSecondHint ? 'secondWrong' : 'firstWrong'}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <h3>{label}</h3>
      <p>{feedback.message}</p>
      <ErrorTypeList errorTypes={feedback.errorTypes} />
    </section>
  );
}
