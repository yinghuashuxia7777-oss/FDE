import { useState } from 'react';

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

interface TrainingSessionPageProps {
  dependencies: TrainingDependencies;
  initialState: TrainingState;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'The training action could not be completed.';
}

export function TrainingSessionPage({
  dependencies,
  initialState,
}: TrainingSessionPageProps) {
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  if (state.phase === 'completed') {
    return (
      <main className="training-complete">
        <p className="eyebrow">Attempt recorded locally</p>
        <h1>Case complete</h1>
        <p>
          Score {Math.round(state.completedAttempt.score)}%. Verdict:{' '}
          {state.completedAttempt.verdict}.
        </p>
      </main>
    );
  }

  if (state.phase === 'loading') {
    return state.persistenceError === null ? (
      <LoadingState label="Preparing training case" />
    ) : (
      <ErrorState
        title="Training session was not saved"
        message={state.persistenceError}
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
      setOperationError(errorMessage(error));
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
      setOperationError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  const feedback = state.phase === 'active' ? null : state.feedback;
  const persistenceError = state.persistenceError;
  const decisionDisabled = pending || state.phase !== 'active';

  return (
    <main className="training-session-page">
      <TrainingLayout
        scene={
          <div className="training-context-panel">
            <div className="training-section-heading">
              <p className="eyebrow">Case context</p>
              <h2>Scene</h2>
            </div>
            <CaseScene scenario={state.caseContent.scenario} />
          </div>
        }
        evidence={
          <div className="training-context-panel">
            <div className="training-section-heading">
              <p className="eyebrow">Observed signals</p>
              <h2>Evidence</h2>
            </div>
            <CaseEvidence evidence={node.evidence} />
          </div>
        }
        question={
          <div className="decision-context">
            <div className="decision-context__heading">
              <div>
                <p className="eyebrow">{state.caseContent.title}</p>
                <h1>{node.title ?? 'Current decision'}</h1>
              </div>
              <StatusBadge tone={state.hintLevel > 1 ? 'warning' : 'neutral'}>
                Round {state.attemptNumber} of 3
              </StatusBadge>
            </div>
            <p className="decision-context__prompt">{node.prompt}</p>
            <TrainingProgress
              scoreEntries={state.scoreEntries}
              visitedNodeIds={state.visitedNodeIds}
            />
            <AdaptiveFeedback feedback={feedback} node={node} />
          </div>
        }
        options={
          <div
            className="decision-controls"
            aria-label="Decision controls"
            aria-busy={pending || undefined}
          >
            {operationError === null ? null : (
              <Alert title="Decision could not be processed" tone="danger">
                {operationError}
              </Alert>
            )}
            {persistenceError === null ? null : (
              <Alert title="Progress not saved" tone="danger">
                {persistenceError}
              </Alert>
            )}
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
                Try again
              </Button>
            ) : null}
            {state.phase === 'advancing' ? (
              <Button
                loading={pending}
                onClick={() => {
                  void handleContinue();
                }}
              >
                {state.persistenceError === null ? 'Continue' : 'Retry save'}
              </Button>
            ) : null}
            <ConsequenceMeter
              consequences={state.consequences}
              criticalErrorIds={state.criticalErrorIds}
            />
          </div>
        }
      />
    </main>
  );
}
