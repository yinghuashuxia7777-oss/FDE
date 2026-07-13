import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  completeAttempt,
  submitNode,
  trainingReducer,
  type TrainingDependencies,
  type TrainingState,
} from '../../application/training';
import { CaseEvidence, CaseScene, TrainingLayout } from '../../components/case';
import { QuestionRenderer } from '../../components/question';
import {
  AdaptiveFeedback,
  ConsequenceMeter,
  TrainingProgress,
} from '../../components/scoring';
import {
  Alert,
  Button,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../components/ui';
import type { NodeSubmission } from '../../domain/cases/types';
import { localizeUiError, useI18n } from '../../i18n';

interface TrainingSessionPageProps {
  dependencies: TrainingDependencies;
  initialState: TrainingState;
}

export function TrainingSessionPage({
  dependencies,
  initialState,
}: TrainingSessionPageProps) {
  const { language, t } = useI18n();
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<unknown>(null);
  const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const completed = state.phase === 'completed';

  useEffect(() => {
    pageTitleRef.current?.focus();
  }, [completed]);

  if (state.phase === 'completed') {
    const verdict = t(`training.verdict.${state.completedAttempt.verdict}`);
    return (
      <section className="training-complete">
        <p className="eyebrow">{t('training.session.recordedLocally')}</p>
        <h1 id="page-title" ref={pageTitleRef} tabIndex={-1}>
          {t('training.session.completeTitle')}
        </h1>
        <p>
          {t('training.session.result', {
            score: Math.round(state.completedAttempt.score),
            verdict,
          })}
        </p>
        <p>{t('training.session.masteryUpdated')}</p>
        <Link
          className="button button--primary"
          to={`/debrief/${state.completedAttempt.id}`}
        >
          {t('training.session.reviewDecisions')}
        </Link>
        <Link className="button button--secondary" to="/skills">
          {t('training.session.viewMastery')}
        </Link>
        <Link className="button button--secondary" to="/">
          {t('training.session.backToPlan')}
        </Link>
      </section>
    );
  }

  if (state.phase === 'loading') {
    return state.persistenceError === null ? (
      <LoadingState
        focusTitle
        label={t('training.route.preparing')}
        titleAs="h1"
        titleId="page-title"
      />
    ) : (
      <ErrorState
        focusTitle
        title={t('training.session.notSavedTitle')}
        titleAs="h1"
        titleId="page-title"
        message={localizeUiError(
          language,
          state.persistenceError,
          t('training.session.persistenceFailed'),
        )}
      />
    );
  }

  const node = state.currentNode;

  async function handleSubmission(submission: NodeSubmission) {
    if (pending || state.phase !== 'active') return;
    setPending(true);
    setOperationError(null);
    try {
      setState(await submitNode(state, submission, dependencies));
    } catch (error) {
      setOperationError(error);
    } finally {
      setPending(false);
    }
  }

  function handleRetry() {
    if (state.phase !== 'feedback' || pending) return;
    setOperationError(null);
    setState(
      trainingReducer(state, {
        type: 'retry',
        token: state.transitionToken,
      }),
    );
  }

  async function handleContinue() {
    if (state.phase !== 'advancing' || pending) return;
    setPending(true);
    setOperationError(null);
    try {
      setState(await completeAttempt(state, dependencies));
    } catch (error) {
      setOperationError(error);
    } finally {
      setPending(false);
    }
  }

  const feedback = state.phase === 'active' ? null : state.feedback;
  const persistenceError = state.persistenceError;
  const decisionDisabled = pending || state.phase !== 'active';

  return (
    <section className="training-session-page">
      <TrainingLayout
        scene={
          <div className="training-context-panel">
            <div className="training-section-heading">
              <p className="eyebrow">{t('training.session.caseContext')}</p>
              <h2>{t('training.session.scene')}</h2>
            </div>
            <CaseScene scenario={state.caseContent.scenario} />
          </div>
        }
        evidence={
          <div className="training-context-panel">
            <div className="training-section-heading">
              <p className="eyebrow">{t('training.session.observedSignals')}</p>
              <h2>{t('training.session.evidence')}</h2>
            </div>
            <CaseEvidence evidence={node.evidence} />
          </div>
        }
        question={
          <div className="decision-context">
            <div className="decision-context__heading">
              <div>
                <p className="eyebrow">{state.caseContent.title}</p>
                <h1 id="page-title" ref={pageTitleRef} tabIndex={-1}>
                  {node.title ?? t('training.session.currentDecision')}
                </h1>
              </div>
              <StatusBadge tone={state.hintLevel > 1 ? 'warning' : 'neutral'}>
                {t('training.session.round', {
                  attempt: state.attemptNumber,
                })}
              </StatusBadge>
            </div>
            <p className="decision-context__prompt">{node.prompt}</p>
            <TrainingProgress
              scoreEntries={state.scoreEntries}
              visitedNodeIds={state.visitedNodeIds}
            />
          </div>
        }
        options={
          <div
            className="decision-controls"
            aria-label={t('training.session.decisionControls')}
            aria-busy={pending || undefined}
          >
            {operationError === null ? null : (
              <Alert title={t('training.session.decisionFailed')} tone="danger">
                {localizeUiError(
                  language,
                  operationError,
                  t('training.session.actionFailed'),
                )}
              </Alert>
            )}
            {persistenceError === null ? null : (
              <Alert
                title={t('training.session.progressNotSaved')}
                tone="danger"
              >
                {localizeUiError(
                  language,
                  persistenceError,
                  t('training.session.persistenceFailed'),
                )}
              </Alert>
            )}
            <AdaptiveFeedback feedback={feedback} node={node} />
            <QuestionRenderer
              node={node}
              disabled={decisionDisabled}
              onSubmit={(submission) => {
                void handleSubmission(submission);
              }}
              promptPlacement="external"
            />
            {state.phase === 'feedback' ? (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={handleRetry}
              >
                {t('training.session.tryAgain')}
              </Button>
            ) : null}
            {state.phase === 'advancing' ? (
              <Button
                loading={pending}
                onClick={() => {
                  void handleContinue();
                }}
              >
                {state.persistenceError === null
                  ? t('training.session.continue')
                  : t('training.session.retrySave')}
              </Button>
            ) : null}
            <ConsequenceMeter
              consequences={state.consequences}
              criticalErrorIds={state.criticalErrorIds}
            />
          </div>
        }
      />
    </section>
  );
}
