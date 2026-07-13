import type { TrainingFeedback } from '../../application/training';
import type { CaseNode } from '../../domain/cases/types';
import { useI18n } from '../../i18n';

interface AdaptiveFeedbackProps {
  feedback: TrainingFeedback | null;
  node: CaseNode;
}

interface ErrorTypeListProps {
  errorTypes: readonly string[];
}

function ErrorTypeList({ errorTypes }: ErrorTypeListProps) {
  const { t } = useI18n();

  if (errorTypes.length === 0) {
    return <p>{t('training.feedback.noErrorClassification')}</p>;
  }

  return (
    <div>
      <strong>{t('training.feedback.errorTypes')}</strong>
      <ul aria-label={t('training.feedback.errorTypes')}>
        {errorTypes.map((errorType, index) => {
          const key = `training.errorType.${errorType}`;
          const translated = t(key);
          return (
            <li key={`${errorType}-${String(index)}`}>
              {translated === key ? t('training.errorType.other') : translated}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdaptiveFeedback({ feedback, node }: AdaptiveFeedbackProps) {
  const { t } = useI18n();

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
        aria-label={t('training.feedback.answerRevealed')}
        aria-live="polite"
      >
        <h3>{t('training.feedback.answerRevealed')}</h3>
        <p>{node.feedback.revealedAnswer}</p>
        <ErrorTypeList errorTypes={feedback.errorTypes} />
        <div>
          <strong>{t('training.feedback.optionExplanations')}</strong>
          <ul aria-label={t('training.feedback.optionExplanations')}>
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
        aria-label={t('training.feedback.answerHidden')}
        aria-live="polite"
      >
        <h3>{t('training.feedback.answerHidden')}</h3>
        <p>{t('training.feedback.revealIncomplete')}</p>
        <ErrorTypeList errorTypes={feedback.errorTypes} />
      </section>
    );
  }

  const isSecondHint = feedback.kind === 'secondWrong';
  const label = isSecondHint
    ? t('training.feedback.secondHint')
    : t('training.feedback.firstHint');

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
