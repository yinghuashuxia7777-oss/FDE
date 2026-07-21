import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  prerequisitesForCase,
  type FoundationItemProgress,
} from '../../application/foundation';
import { conceptsForCase } from '../../application/concepts';
import {
  createTrainingSession,
  resumeAttempt,
  selectLatestResumeAttempt,
  type TrainingDependencies,
  type TrainingState,
} from '../../application/training';
import {
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import {
  bundledConceptSource,
  type ConceptSource,
} from '../../content/concept-source';
import {
  bundledFoundationSource,
  type FoundationSource,
} from '../../content/foundation-source';
import { ErrorState, LoadingState } from '../../components/ui';
import type { FdeCase } from '../../domain/cases/types';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import { localizeUiError, useI18n } from '../../i18n';
import { localizeFoundations } from '../../i18n/content-localization';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { TrainingSessionPage } from './TrainingSessionPage';
import { PrerequisiteKnowledgeGate } from './PrerequisiteKnowledgeGate';

type RouteSession =
  | { kind: 'not-active' }
  | {
      kind: 'ready';
      dependencies: TrainingDependencies;
      initialState: TrainingState;
    }
  | {
      kind: 'prerequisite';
      content: FdeCase;
      dependencies: TrainingDependencies;
      prerequisites: FoundationItemProgress[];
    };

interface TrainingRoutePageProps {
  conceptSource?: ConceptSource;
  foundationSource?: FoundationSource;
}

function InactiveTrainingState() {
  const { t } = useI18n();
  const pageTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    pageTitleRef.current?.focus();
  }, []);

  return (
    <section className="state-panel" aria-labelledby="page-title">
      <p className="eyebrow">{t('training.route.activeCatalog')}</p>
      <h1 id="page-title" ref={pageTitleRef} tabIndex={-1}>
        {t('training.route.inactiveTitle')}
      </h1>
      <p>{t('training.route.inactiveDescription')}</p>
      <Link className="button button--secondary" to="/cases">
        {t('training.route.returnToCases')}
      </Link>
    </section>
  );
}

function PrerequisiteTrainingStart({
  concepts,
  content,
  dependencies,
  prerequisites,
}: Extract<RouteSession, { kind: 'prerequisite' }> & {
  concepts: readonly ConceptKnowledge[];
}) {
  const [initialState, setInitialState] = useState<TrainingState>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const starting = useRef(false);

  if (initialState !== undefined) {
    return (
      <TrainingSessionPage
        concepts={concepts}
        dependencies={dependencies}
        initialState={initialState}
      />
    );
  }

  const start = () => {
    if (starting.current) return;
    starting.current = true;
    setPending(true);
    setError(false);
    void createTrainingSession(content, dependencies).then(
      (state) => {
        if (state.persistenceError !== null) {
          starting.current = false;
          setPending(false);
          setError(true);
          return;
        }
        setInitialState(state);
      },
      () => {
        starting.current = false;
        setPending(false);
        setError(true);
      },
    );
  };

  return (
    <PrerequisiteKnowledgeGate
      concepts={concepts}
      error={error}
      onStart={start}
      pending={pending}
      prerequisites={prerequisites}
    />
  );
}

function useCaseConcepts(conceptSource: ConceptSource, caseId: string) {
  const [snapshot, setSnapshot] = useState<{
    caseId: string;
    concepts: readonly ConceptKnowledge[];
    source: ConceptSource;
  }>();

  useEffect(() => {
    let active = true;
    void conceptSource.loadAll().then(
      (items) => {
        if (!active) return;
        setSnapshot({
          caseId,
          concepts: conceptsForCase(items, caseId),
          source: conceptSource,
        });
      },
      () => {
        // Concept guidance is advisory; the Case action remains available.
      },
    );
    return () => {
      active = false;
    };
  }, [caseId, conceptSource]);

  return snapshot?.caseId === caseId && snapshot.source === conceptSource
    ? snapshot.concepts
    : [];
}

function ConceptAwarePrerequisiteTrainingStart({
  conceptSource,
  ...session
}: Extract<RouteSession, { kind: 'prerequisite' }> & {
  conceptSource: ConceptSource;
}) {
  const concepts = useCaseConcepts(conceptSource, session.content.id);
  return <PrerequisiteTrainingStart {...session} concepts={concepts} />;
}

function ConceptAwareTrainingSession({
  caseId,
  conceptSource,
  dependencies,
  initialState,
}: Extract<RouteSession, { kind: 'ready' }> & {
  caseId: string;
  conceptSource: ConceptSource;
}) {
  const concepts = useCaseConcepts(conceptSource, caseId);

  return (
    <TrainingSessionPage
      concepts={concepts}
      dependencies={dependencies}
      initialState={initialState}
    />
  );
}

export function TrainingRoutePage({
  conceptSource = bundledConceptSource,
  foundationSource = bundledFoundationSource,
}: TrainingRoutePageProps = {}) {
  const { caseId } = useParams<{ caseId: string }>();

  return (
    <TrainingRouteForCase
      key={caseId ?? ''}
      caseId={caseId ?? ''}
      conceptSource={conceptSource}
      foundationSource={foundationSource}
    />
  );
}

function TrainingRouteForCase({
  caseId,
  conceptSource,
  foundationSource,
}: {
  caseId: string;
  conceptSource: ConceptSource;
  foundationSource: FoundationSource;
}) {
  const { language, t } = useI18n();
  const getRepositories = useProductRepositories();
  const pending = useRef<
    { caseId: string; value: Promise<RouteSession> } | undefined
  >(undefined);
  const { state, retry } = useAsyncPageData(() => {
    const selectedCaseId = caseId;
    if (pending.current?.caseId === selectedCaseId) {
      return pending.current.value;
    }
    const value = (async (): Promise<RouteSession> => {
      if (selectedCaseId === '') return { kind: 'not-active' };
      const repositories = await getRepositories();
      const activeCases = await repositories.cases.listActive({
        status: 'published',
      });
      const active = activeCases.find(({ id }) => id === selectedCaseId);
      if (active === undefined) return { kind: 'not-active' };
      const content = await repositories.cases.getVersion(
        active.id,
        active.version,
      );
      if (content === undefined) {
        throw new Error(
          t('training.route.notInstalled', {
            caseId: active.id,
            caseVersion: active.version,
          }),
        );
      }
      const inProgressAttempts = await repositories.attempts.list({
        userId: LOCAL_USER_ID,
        caseId: active.id,
        status: 'in-progress',
      });
      const latestMatchingAttempt = selectLatestResumeAttempt(
        inProgressAttempts,
        active.version,
      );
      const dependencies: TrainingDependencies = {
        attemptRepository: repositories.attempts,
        progressRepository: repositories.progress,
        now: () => new Date().toISOString(),
        createId: () => `attempt-${globalThis.crypto.randomUUID()}`,
      };
      if (latestMatchingAttempt !== undefined) {
        return {
          kind: 'ready',
          dependencies,
          initialState: resumeAttempt(content, latestMatchingAttempt),
        };
      }
      try {
        const foundationItems = localizeFoundations(
          await foundationSource.loadAll(),
          language,
        );
        if (
          foundationItems.some((item) => item.relatedCases.includes(active.id))
        ) {
          const [mastery, attempts] = await Promise.all([
            repositories.skills.list(LOCAL_USER_ID),
            repositories.attempts.list({ userId: LOCAL_USER_ID }),
          ]);
          const prerequisites = prerequisitesForCase(
            foundationItems,
            active.id,
            mastery,
            attempts,
          );
          if (prerequisites.length > 0) {
            return {
              kind: 'prerequisite',
              content,
              dependencies,
              prerequisites,
            };
          }
        }
      } catch {
        // Foundation and its evidence projection are advisory; training fails open.
      }

      return {
        kind: 'prerequisite',
        content,
        dependencies,
        prerequisites: [],
      };
    })();
    pending.current = { caseId: selectedCaseId, value };
    return value;
  }, [caseId, conceptSource, foundationSource, getRepositories, language, t]);

  if (state.status === 'loading') {
    return (
      <LoadingState
        focusTitle
        label={t('training.route.preparing')}
        titleAs="h1"
        titleId="page-title"
      />
    );
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        focusTitle
        title={t('training.route.unavailableTitle')}
        titleAs="h1"
        titleId="page-title"
        message={localizeUiError(
          language,
          state.error,
          t('training.route.unavailableMessage'),
        )}
        onRetry={() => {
          pending.current = undefined;
          retry();
        }}
      />
    );
  }
  if (state.data.kind === 'not-active') {
    return <InactiveTrainingState />;
  }
  if (state.data.kind === 'prerequisite') {
    return (
      <ConceptAwarePrerequisiteTrainingStart
        key={`${state.data.content.id}@${state.data.content.metadata.version}`}
        conceptSource={conceptSource}
        {...state.data}
      />
    );
  }
  return (
    <ConceptAwareTrainingSession
      key={`${state.data.initialState.caseId}@${state.data.initialState.caseVersion}`}
      caseId={state.data.initialState.caseId}
      conceptSource={conceptSource}
      {...state.data}
    />
  );
}
