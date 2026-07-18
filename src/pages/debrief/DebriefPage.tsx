import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  buildRecommendedPath,
  correctSubmissionForNode,
  describeSubmission,
  groupAttemptVisits,
  visitGroupingWarning,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { Alert, ErrorState, StatusBadge } from '../../components/ui';
import type { EvidenceType } from '../../domain/cases/types';
import { useI18n } from '../../i18n';
import type {
  CaseSummary,
  CompletedAttemptRecord,
} from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface DebriefPageProps {
  attemptId?: string;
  repositories?: ProductRepositories;
}

type Translate = ReturnType<typeof useI18n>['t'];

const verdictKeys = {
  excellent: 'product.common.verdict.excellent',
  pass: 'product.common.verdict.pass',
  marginal: 'product.common.verdict.marginal',
  fail: 'product.common.verdict.fail',
  'critical-risk': 'product.common.verdict.criticalRisk',
} as const;

const recommendedStopKeys = {
  terminal: 'debrief.stop.terminal',
  cycle: 'debrief.stop.cycle',
  'hop-limit': 'debrief.stop.hopLimit',
  'missing-node': 'debrief.stop.missingNode',
  'invalid-branch': 'debrief.stop.invalidBranch',
} as const;

const evidenceTypeKeys: Record<EvidenceType, string> = {
  text: 'training.evidence.type.textDetailed',
  log: 'training.evidence.type.logDetailed',
  terminal: 'training.evidence.type.terminalDetailed',
  http: 'training.evidence.type.httpDetailed',
  json: 'training.evidence.type.jsonDetailed',
  diff: 'training.evidence.type.diffDetailed',
  config: 'training.evidence.type.configDetailed',
  metric: 'training.evidence.type.metricDetailed',
  diagram: 'training.evidence.type.diagramDetailed',
  'customer-message': 'training.evidence.type.customerMessageDetailed',
};

function translateEvidenceType(t: Translate, value: string): string {
  const key = evidenceTypeKeys[value as EvidenceType];
  return key === undefined ? value : t(key);
}

function translateErrorType(t: Translate, value: string): string {
  const key = `product.errorType.${value}`;
  const translated = t(key);
  return translated === key ? t('training.errorType.other') : translated;
}

function translateGroupingWarning(t: Translate, warning: string): string {
  if (
    warning ===
    'Some historical rounds could not be assigned to their recorded visit ordinal.'
  ) {
    return t('debrief.grouping.unassigned');
  }
  if (warning === 'At least one recorded visit has no resolved round.') {
    return t('debrief.grouping.unresolved');
  }
  return warning;
}

function translateSubmissionDescription(
  t: Translate,
  description: string,
): string {
  return description
    .replace(/Unknown option \(([^)]+)\)/g, (_match, id: string) =>
      t('debrief.submission.unknownOption', { id }),
    )
    .replace(/Unknown evidence \(([^)]+)\)/g, (_match, id: string) =>
      t('debrief.submission.unknownEvidence', { id }),
    )
    .replace(
      /([a-z][a-z-]*) evidence \(([^)]+)\)/gi,
      (_match, type: string, id: string) =>
        t('debrief.submission.typedEvidence', {
          type: translateEvidenceType(t, type.toLowerCase()),
          id,
        }),
    )
    .replace('; evidence: ', t('debrief.submission.evidenceSeparator'));
}

function AttemptSummary({ attempt }: { attempt: CompletedAttemptRecord }) {
  const { t } = useI18n();
  return (
    <dl
      className="metric-strip debrief-report__metrics"
      aria-label={t('debrief.summary.label')}
    >
      <div>
        <dt>{t('debrief.summary.score')}</dt>
        <dd>{Math.round(attempt.score)}%</dd>
      </div>
      <div>
        <dt>{t('debrief.summary.verdict')}</dt>
        <dd>{t(verdictKeys[attempt.verdict])}</dd>
      </div>
      <div>
        <dt>{t('debrief.summary.criticalErrors')}</dt>
        <dd>{attempt.criticalErrorIds.length}</dd>
      </div>
      <div>
        <dt>{t('debrief.summary.caseVersion')}</dt>
        <dd>{attempt.caseVersion}</dd>
      </div>
    </dl>
  );
}

function DebriefNextStep({
  caseTitle,
  knowledgePoints,
  recommendedCaseIds,
  repositories,
}: {
  caseTitle: string;
  knowledgePoints: readonly string[];
  recommendedCaseIds: readonly string[] | undefined;
  repositories: ProductRepositories | undefined;
}) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(repositories);
  const [activeCases, setActiveCases] = useState<readonly CaseSummary[]>([]);

  useEffect(() => {
    let active = true;
    void getRepositories()
      .then((source) => source.cases.listActive({ status: 'published' }))
      .then(
        (items) => {
          if (active) {
            setActiveCases(
              items.filter(({ status }) => status === 'published'),
            );
          }
        },
        () => {
          // Active recommendations are optional; the Case library is safe.
        },
      );
    return () => {
      active = false;
    };
  }, [getRepositories]);

  const activeCaseById = new Map(
    activeCases.map((candidate) => [candidate.id, candidate]),
  );
  const recommendedCases = (recommendedCaseIds ?? []).flatMap((caseId) => {
    const candidate = activeCaseById.get(caseId);
    return candidate === undefined ? [] : [candidate];
  });
  return (
    <section
      className="panel debrief-next-step"
      aria-labelledby="debrief-next-step-title"
      data-learning-mode="true"
    >
      <h2 id="debrief-next-step-title">{t('onboarding.debrief.title')}</h2>
      <p>{t('onboarding.debrief.completed', { title: caseTitle })}</p>
      <div className="debrief-next-step__grid">
        <section>
          <h3>{t('onboarding.debrief.learn')}</h3>
          <ul>
            {knowledgePoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link className="button button--secondary" to="/foundation">
            {t('onboarding.debrief.openFoundation')}
          </Link>
        </section>
        <section>
          <h3>{t('onboarding.debrief.challenge')}</h3>
          {recommendedCases.length === 0 ? (
            <Link className="button button--primary" to="/cases">
              {t('onboarding.debrief.openCases')}
            </Link>
          ) : (
            <div className="button-row">
              {recommendedCases.map((candidate) => (
                <Link
                  className="button button--primary"
                  key={candidate.id}
                  to={`/training/${candidate.id}`}
                >
                  {t('onboarding.nextStep.openCase', {
                    title: candidate.title,
                  })}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export function DebriefPage({
  attemptId: suppliedId,
  repositories: override,
}: DebriefPageProps) {
  const { t } = useI18n();
  const params = useParams();
  const attemptId = suppliedId ?? params.attemptId ?? '';
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const attempt = await source.attempts.get(attemptId);
    if (attempt === undefined) return { kind: 'missing' as const };
    if (attempt.status !== 'completed')
      return { kind: 'incomplete' as const, attempt };
    const content = await source.cases.getVersion(
      attempt.caseId,
      attempt.caseVersion,
    );
    return { kind: 'completed' as const, attempt, content };
  }, [attemptId, getRepositories]);

  return (
    <section
      className="product-page product-page--debrief-report"
      aria-labelledby="page-title"
    >
      <div className="debrief-report__header">
        <PageHeader
          eyebrow={t('debrief.eyebrow')}
          title={t('debrief.title')}
          description={t('debrief.description')}
        />
      </div>
      <AsyncPage state={state} retry={retry}>
        {(data) => {
          if (data.kind === 'missing')
            return (
              <ErrorState
                title={t('debrief.missing.title')}
                message={t('debrief.missing.message')}
              />
            );
          if (data.kind === 'incomplete')
            return (
              <ErrorState
                title={t('debrief.incomplete.title')}
                message={t('debrief.incomplete.message')}
              />
            );
          const { attempt, content } = data;
          if (content === undefined) {
            return (
              <div className="product-stack">
                <AttemptSummary attempt={attempt} />
                <Alert title={t('debrief.versionMissing.title')} tone="danger">
                  {t('debrief.versionMissing.message', {
                    caseId: attempt.caseId,
                    version: attempt.caseVersion,
                  })}
                </Alert>
                <section className="panel">
                  <h2>{t('debrief.recordedPath')}</h2>
                  <ol>
                    {attempt.visitedNodeIds.map((nodeId, index) => (
                      <li key={`${nodeId}-${String(index)}`}>
                        {t('debrief.visit', { visit: index + 1, nodeId })}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            );
          }
          const nodes = new Map(content.nodes.map((node) => [node.id, node]));
          const optionLabels = new Map(
            content.nodes.flatMap((node) =>
              node.options.map((option) => [option.id, option.label] as const),
            ),
          );
          const describeCriticalError = (criticalErrorId: string) =>
            optionLabels.get(criticalErrorId) ??
            t('debrief.critical.unknownDecision');
          const visits = groupAttemptVisits(attempt);
          const groupingWarning = visitGroupingWarning(attempt, visits);
          const recommended = buildRecommendedPath(content);
          const affectedSkillIds = [
            ...new Set(
              visits.flatMap((visit) => {
                const node = nodes.get(visit.nodeId);
                return node === undefined ? [] : Object.keys(node.skillWeights);
              }),
            ),
          ].sort((left, right) => left.localeCompare(right));
          return (
            <div className="product-stack debrief-report">
              <AttemptSummary attempt={attempt} />
              {attempt.criticalErrorIds.length === 0 ? null : (
                <Alert title={t('debrief.criticalRecorded')} tone="critical">
                  {attempt.criticalErrorIds
                    .map(describeCriticalError)
                    .join(', ')}
                </Alert>
              )}
              {groupingWarning === undefined ? null : (
                <Alert title={t('debrief.pathInconsistency')} tone="warning">
                  {translateGroupingWarning(t, groupingWarning)}
                </Alert>
              )}
              {recommended.stopped === 'terminal' ? null : (
                <Alert
                  title={t('debrief.recommendedStopped.title')}
                  tone="warning"
                >
                  {t('debrief.recommendedStopped.message', {
                    reason: t(recommendedStopKeys[recommended.stopped]),
                  })}
                </Alert>
              )}
              <div className="product-split debrief-report__path-comparison">
                <section className="panel debrief-report__path-card">
                  <h2>{t('debrief.actualPath')}</h2>
                  <ol>
                    {visits.map((visit) => (
                      <li key={visit.ordinal}>
                        {t('debrief.visit', {
                          visit: visit.ordinal,
                          nodeId:
                            nodes.get(visit.nodeId)?.title ??
                            t('debrief.unknownDecision'),
                        })}
                        {visit.rounds.some(
                          (round) =>
                            round.evaluation.criticalErrorIds.length > 0,
                        )
                          ? t('debrief.criticalBranch')
                          : ''}
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="panel debrief-report__path-card">
                  <h2>{t('debrief.recommendedPath')}</h2>
                  <ol>
                    {recommended.nodeIds.map((nodeId, index) => (
                      <li key={`${nodeId}-${String(index)}`}>
                        {nodes.get(nodeId)?.title ??
                          t('debrief.unknownDecision')}
                      </li>
                    ))}
                  </ol>
                  <p>
                    {t('debrief.pathEnded', {
                      reason: t(recommendedStopKeys[recommended.stopped]),
                    })}
                  </p>
                </section>
              </div>
              <section
                className="product-stack debrief-report__timeline"
                aria-labelledby="decision-timeline-title"
              >
                <h2 id="decision-timeline-title">
                  {t('debrief.timeline.title')}
                </h2>
                {visits.map((visit) => {
                  const node = nodes.get(visit.nodeId);
                  const hasCriticalError = visit.rounds.some(
                    (round) => round.evaluation.criticalErrorIds.length > 0,
                  );
                  return (
                    <article
                      className="panel debrief-report__decision-card"
                      data-critical={hasCriticalError}
                      key={visit.ordinal}
                      aria-label={t('debrief.timeline.itemLabel', {
                        visit: visit.ordinal,
                        nodeId: node?.title ?? t('debrief.unknownDecision'),
                      })}
                    >
                      <div className="section-heading">
                        <h3>
                          {t('debrief.timeline.heading', {
                            visit: visit.ordinal,
                            title: node?.title ?? t('debrief.unknownDecision'),
                          })}
                        </h3>
                        <StatusBadge>
                          {t(
                            visit.rounds.length === 1
                              ? 'debrief.timeline.roundOne'
                              : 'debrief.timeline.rounds',
                            { count: visit.rounds.length },
                          )}
                        </StatusBadge>
                      </div>
                      <p>{node?.prompt}</p>
                      <ol>
                        {visit.rounds.map((round) => (
                          <li
                            key={`${round.nodeId}-${String(round.attemptNumber)}`}
                          >
                            <strong>
                              {t('debrief.timeline.round', {
                                round: round.attemptNumber,
                              })}
                            </strong>{' '}
                            {translateSubmissionDescription(
                              t,
                              describeSubmission(round.submission, node),
                            )}
                            .{' '}
                            {round.evaluation.isCorrect
                              ? t('debrief.timeline.correct')
                              : t('debrief.timeline.incorrect')}
                            {round.evaluation.errorTypes.length === 0 ? null : (
                              <span>
                                {' '}
                                {t('debrief.timeline.errorTypes', {
                                  types: round.evaluation.errorTypes
                                    .map((value) =>
                                      translateErrorType(t, value),
                                    )
                                    .join(', '),
                                })}
                              </span>
                            )}
                            {round.evaluation.criticalErrorIds.length ===
                            0 ? null : (
                              <span>
                                {' '}
                                {t('debrief.timeline.critical', {
                                  errors: round.evaluation.criticalErrorIds
                                    .map(describeCriticalError)
                                    .join(', '),
                                })}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                      {node === undefined ? null : (
                        <>
                          <p>
                            <strong>
                              {t('debrief.timeline.correctSubmission')}
                            </strong>{' '}
                            {translateSubmissionDescription(
                              t,
                              describeSubmission(
                                correctSubmissionForNode(node),
                                node,
                              ),
                            )}
                          </p>
                          <h4>{t('debrief.timeline.optionExplanations')}</h4>
                          <ul>
                            {node.options.map((option) => (
                              <li key={option.id}>
                                <strong>{option.label}:</strong>{' '}
                                {option.explanation}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {visit.rounds.some((round) =>
                        round.evaluation.errorTypes.some((error) =>
                          /evidence|infer|verify/i.test(error),
                        ),
                      ) ? (
                        <p>
                          <strong>{t('debrief.evidenceCallout.label')}</strong>{' '}
                          {t('debrief.evidenceCallout.message')}
                        </p>
                      ) : null}
                      {visit.rounds.some((round) =>
                        round.evaluation.errorTypes.some((error) =>
                          /priorit|triage|sequence/i.test(error),
                        ),
                      ) ? (
                        <p>
                          <strong>{t('debrief.priorityCallout.label')}</strong>{' '}
                          {t('debrief.priorityCallout.message')}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </section>
              <section
                className="panel debrief-report__skill-impact"
                aria-labelledby="debrief-skill-impact-title"
              >
                <h2 id="debrief-skill-impact-title">
                  {t('debrief.skillImpact.title')}
                </h2>
                <p>{t('debrief.skillImpact.description')}</p>
                {affectedSkillIds.length === 0 ? (
                  <p>{t('debrief.skillImpact.empty')}</p>
                ) : (
                  <ul className="debrief-report__skill-list">
                    {affectedSkillIds.map((skillId) => (
                      <li key={skillId}>{skillId}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section
                className="panel debrief-report__assessment"
                aria-labelledby="case-debrief-title"
              >
                <h2 id="case-debrief-title">{t('debrief.assessment.title')}</h2>
                <div className="debrief-report__assessment-grid">
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.summary')}</h3>
                    <p>{content.debrief.summary}</p>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.rootCause')}</h3>
                    <p>{content.debrief.rootCause}</p>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.correctApproach')}</h3>
                    <ol>
                      {content.debrief.correctApproach.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.keyLessons')}</h3>
                    <ul>
                      {content.debrief.keyLessons.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.interviewer')}</h3>
                    <p>{content.debrief.interviewerPerspective}</p>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.customerRisk')}</h3>
                    <p>{content.debrief.customerRiskPerspective}</p>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.remediation')}</h3>
                    <ul>
                      {content.debrief.remediation.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.verification')}</h3>
                    <ul>
                      {content.debrief.verification.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="debrief-report__assessment-card">
                    <h3>{t('debrief.assessment.knowledgePoints')}</h3>
                    <ul>
                      {content.debrief.knowledgePoints.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </section>
              <DebriefNextStep
                caseTitle={content.title}
                knowledgePoints={content.debrief.knowledgePoints}
                recommendedCaseIds={content.debrief.recommendedCaseIds}
                repositories={override}
              />
              <div className="button-row debrief-report__actions">
                <Link className="button button--primary" to="/">
                  {t('debrief.backToPlan')}
                </Link>
              </div>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
