import { WarningCircle } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  describeSubmission,
  groupAttemptVisits,
  compareRfc3339Timestamps,
  scoreVisit,
  submissionOptionExplanations,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { Alert, EmptyState, StatusBadge } from '../../components/ui';
import type { EvidenceType, FdeCase } from '../../domain/cases/types';
import { useI18n } from '../../i18n';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface MistakesPageProps {
  repositories?: ProductRepositories;
}

function versionKey(caseId: string, version: number) {
  return `${caseId}@${String(version)}`;
}

type Translate = ReturnType<typeof useI18n>['t'];

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
  return translated === key ? value : translated;
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

export function MistakesPage({ repositories: override }: MistakesPageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [
      mistakes,
      summaries,
      attemptRecords,
      activeDomainDefinitions,
      activeSkillDefinitions,
    ] = await Promise.all([
      source.mistakes.list({ userId: LOCAL_USER_ID }),
      source.cases.listActive({ status: 'published' }),
      source.attempts.list({ userId: LOCAL_USER_ID, status: 'completed' }),
      source.content.listActiveDomains(),
      source.content.listActiveSkills(),
    ]);
    const attempts = attemptRecords.filter(
      (attempt): attempt is Extract<typeof attempt, { status: 'completed' }> =>
        attempt.status === 'completed',
    );
    const uniqueVersions = new Map<
      string,
      { caseId: string; caseVersion: number }
    >();
    [...mistakes, ...attempts].forEach((record) => {
      uniqueVersions.set(versionKey(record.caseId, record.caseVersion), record);
    });
    const contents = new Map<string, FdeCase | undefined>();
    await Promise.all(
      [...uniqueVersions.values()].map(async (record) => {
        contents.set(
          versionKey(record.caseId, record.caseVersion),
          await source.cases.getVersion(record.caseId, record.caseVersion),
        );
      }),
    );
    const skillDefinitionsById = new Map(
      activeSkillDefinitions.map((definition) => [definition.id, definition]),
    );
    const referencedSkillIds = new Set([
      ...mistakes.flatMap(({ skillIds }) => skillIds),
      ...[...contents.values()].flatMap((content) => content?.skills ?? []),
    ]);
    const historicalSkillDefinitions = await Promise.all(
      [...referencedSkillIds]
        .filter((id) => !skillDefinitionsById.has(id))
        .sort()
        .map((id) => source.content.findSkillDefinition(id)),
    );
    historicalSkillDefinitions.forEach((definition) => {
      if (definition !== undefined) {
        skillDefinitionsById.set(definition.id, definition);
      }
    });

    const domainDefinitionsById = new Map(
      activeDomainDefinitions.map((definition) => [definition.id, definition]),
    );
    const referencedDomainIds = new Set([
      ...summaries.flatMap(({ domains }) => domains),
      ...[...contents.values()].flatMap((content) => content?.domains ?? []),
      ...[...skillDefinitionsById.values()].map(({ domainId }) => domainId),
    ]);
    const historicalDomainDefinitions = await Promise.all(
      [...referencedDomainIds]
        .filter((id) => !domainDefinitionsById.has(id))
        .sort()
        .map((id) => source.content.findDomainDefinition(id)),
    );
    historicalDomainDefinitions.forEach((definition) => {
      if (definition !== undefined) {
        domainDefinitionsById.set(definition.id, definition);
      }
    });
    return {
      mistakes,
      summaries: summaries.filter(
        ({ level, status }) => status === 'published' && level !== 'expert',
      ),
      contents,
      attempts,
      domainDefinitions: [...domainDefinitionsById.values()],
      skillDefinitions: [...skillDefinitionsById.values()],
    };
  }, [getRepositories]);

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === '') next.delete(name);
    else next.set(name, value);
    setSearchParams(next);
  };

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('mistakes.eyebrow')}
        title={t('mistakes.title')}
        description={t('mistakes.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({
          mistakes,
          summaries,
          contents,
          attempts,
          domainDefinitions,
          skillDefinitions,
        }) => {
          const retryableCaseIds = new Set(summaries.map(({ id }) => id));
          const domainDefinitionsById = new Map(
            domainDefinitions.map((definition) => [definition.id, definition]),
          );
          const skillDefinitionsById = new Map(
            skillDefinitions.map((definition) => [definition.id, definition]),
          );
          const domainIds = new Set([
            ...summaries.flatMap(({ domains: values }) => values),
            ...mistakes.flatMap(
              (mistake) =>
                contents.get(versionKey(mistake.caseId, mistake.caseVersion))
                  ?.domains ?? [],
            ),
          ]);
          const domains = [...domainIds]
            .map((id) => ({
              id,
              label: domainDefinitionsById.get(id)?.label ?? id,
            }))
            .sort(
              (left, right) =>
                left.label.localeCompare(right.label) ||
                left.id.localeCompare(right.id),
            );
          const errorTypes = [
            ...new Set(mistakes.flatMap(({ errorTypes: values }) => values)),
          ].sort();
          const rawDomain = searchParams.get('domain') ?? '';
          const domain = domains.some(({ id }) => id === rawDomain)
            ? rawDomain
            : '';
          const rawErrorType = searchParams.get('errorType') ?? '';
          const errorType = errorTypes.includes(rawErrorType)
            ? rawErrorType
            : '';
          const rawCritical = searchParams.get('critical') ?? '';
          const critical =
            rawCritical === 'yes' || rawCritical === 'no' ? rawCritical : '';
          const filtered = mistakes.filter((mistake) => {
            const content = contents.get(
              versionKey(mistake.caseId, mistake.caseVersion),
            );
            return (
              (domain === '' || content?.domains.includes(domain) === true) &&
              (errorType === '' || mistake.errorTypes.includes(errorType)) &&
              (critical === '' || (critical === 'yes') === mistake.critical)
            );
          });
          return (
            <div className="product-stack">
              <form
                className="filter-panel"
                aria-label={t('mistakes.filters.label')}
                onSubmit={(event) => event.preventDefault()}
              >
                <label>
                  {t('mistakes.filters.domain')}
                  <select
                    value={domain}
                    onChange={(event) => update('domain', event.target.value)}
                  >
                    <option value="">{t('mistakes.filters.allDomains')}</option>
                    {domains.map(({ id, label }) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('mistakes.filters.errorType')}
                  <select
                    value={errorType}
                    onChange={(event) =>
                      update('errorType', event.target.value)
                    }
                  >
                    <option value="">
                      {t('mistakes.filters.allErrorTypes')}
                    </option>
                    {errorTypes.map((value) => (
                      <option key={value} value={value}>
                        {translateErrorType(t, value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('mistakes.filters.critical')}
                  <select
                    value={critical}
                    onChange={(event) => update('critical', event.target.value)}
                  >
                    <option value="">{t('mistakes.filters.any')}</option>
                    <option value="yes">
                      {t('mistakes.filters.criticalOnly')}
                    </option>
                    <option value="no">
                      {t('mistakes.filters.nonCriticalOnly')}
                    </option>
                  </select>
                </label>
              </form>
              {filtered.length === 0 ? (
                <EmptyState
                  title={t('mistakes.empty.title')}
                  description={t('mistakes.empty.description')}
                />
              ) : (
                filtered.map((mistake) => {
                  const content = contents.get(
                    versionKey(mistake.caseId, mistake.caseVersion),
                  );
                  const node = content?.nodes.find(
                    ({ id }) => id === mistake.nodeId,
                  );
                  const evidenceTitles = mistake.evidenceIds.map(
                    (evidenceId) => {
                      if (node === undefined) return evidenceId;
                      const item = node.evidence.find(
                        ({ id }) => id === evidenceId,
                      );
                      if (item === undefined)
                        return t('mistakes.unknownEvidence', {
                          id: evidenceId,
                        });
                      return (
                        item.title ??
                        t('mistakes.typedEvidence', {
                          type: translateEvidenceType(t, item.type),
                          id: evidenceId,
                        })
                      );
                    },
                  );
                  const authoredExplanations =
                    node === undefined
                      ? []
                      : submissionOptionExplanations(mistake.submission, node);
                  const originalAttempt = attempts.find(
                    ({ id }) => id === mistake.attemptId,
                  );
                  const laterAttempts =
                    originalAttempt === undefined
                      ? []
                      : attempts
                          .filter(
                            (attempt) =>
                              attempt.id !== originalAttempt.id &&
                              attempt.caseId === originalAttempt.caseId &&
                              compareRfc3339Timestamps(
                                attempt.startedAt,
                                originalAttempt.completedAt,
                              ) >= 0,
                          )
                          .sort((left, right) =>
                            compareRfc3339Timestamps(
                              left.completedAt,
                              right.completedAt,
                            ),
                          );
                  let missingLaterVersion = false;
                  const derivedRetries = laterAttempts.flatMap((attempt) => {
                    const laterContent = contents.get(
                      versionKey(attempt.caseId, attempt.caseVersion),
                    );
                    if (laterContent === undefined) {
                      missingLaterVersion = true;
                      return [];
                    }
                    const laterNode = laterContent.nodes.find(
                      ({ id }) => id === mistake.nodeId,
                    );
                    if (laterNode === undefined) return [];
                    return groupAttemptVisits(attempt)
                      .filter(({ nodeId }) => nodeId === mistake.nodeId)
                      .map(({ ordinal, rounds }) => ({
                        attemptId: attempt.id,
                        visitOrdinal: ordinal,
                        completedAt: attempt.completedAt,
                        caseVersion: attempt.caseVersion,
                        score: scoreVisit(laterNode, rounds).score,
                      }));
                  });
                  return (
                    <article
                      className="panel mistake-row"
                      key={mistake.id}
                      aria-label={t('mistakes.item.label', { id: mistake.id })}
                    >
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">
                            {t('mistakes.item.version', {
                              caseId: mistake.caseId,
                              version: mistake.caseVersion,
                            })}
                          </p>
                          <h2>{node?.title ?? mistake.nodeId}</h2>
                        </div>
                        {mistake.critical ? (
                          <StatusBadge tone="critical">
                            <WarningCircle aria-hidden="true" size={16} />
                            {t('mistakes.item.criticalError')}
                          </StatusBadge>
                        ) : (
                          <StatusBadge>
                            {t('mistakes.item.nonCritical')}
                          </StatusBadge>
                        )}
                      </div>
                      {content === undefined ? (
                        <Alert
                          title={t('mistakes.versionMissing.title')}
                          tone="warning"
                        >
                          {t('mistakes.versionMissing.message')}
                        </Alert>
                      ) : null}
                      <dl className="compact-facts">
                        <div>
                          <dt>{t('mistakes.facts.selected')}</dt>
                          <dd>
                            {translateSubmissionDescription(
                              t,
                              describeSubmission(mistake.submission, node),
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('mistakes.facts.correct')}</dt>
                          <dd>
                            {translateSubmissionDescription(
                              t,
                              describeSubmission(
                                mistake.correctSubmission,
                                node,
                              ),
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('mistakes.facts.evidence')}</dt>
                          <dd>
                            {evidenceTitles.length === 0
                              ? t('mistakes.facts.noneRecorded')
                              : evidenceTitles.join(', ')}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('mistakes.facts.errorReasons')}</dt>
                          <dd>
                            {mistake.errorTypes
                              .map((value) => translateErrorType(t, value))
                              .join(', ')}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('mistakes.facts.skills')}</dt>
                          <dd>
                            {mistake.skillIds
                              .map(
                                (id) =>
                                  skillDefinitionsById.get(id)?.label ?? id,
                              )
                              .join(', ')}
                          </dd>
                        </div>
                      </dl>
                      <section>
                        <h3>{t('mistakes.explanation.title')}</h3>
                        {node === undefined ? (
                          <p>{t('mistakes.explanation.unavailable')}</p>
                        ) : (
                          <ul>
                            {authoredExplanations.map((option) => (
                              <li key={option.id}>
                                <strong>{option.label}:</strong>{' '}
                                {option.explanation}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                      {originalAttempt === undefined ? (
                        <Alert
                          title={t('mistakes.originalMissing.title')}
                          tone="warning"
                        >
                          {t('mistakes.originalMissing.message')}
                        </Alert>
                      ) : null}
                      {missingLaterVersion ? (
                        <Alert
                          title={t('mistakes.laterVersionMissing.title')}
                          tone="warning"
                        >
                          {t('mistakes.laterVersionMissing.message')}
                        </Alert>
                      ) : null}
                      <section>
                        <h3>{t('mistakes.legacy.title')}</h3>
                        {mistake.redoScores.length === 0 ? (
                          <p>{t('mistakes.legacy.empty')}</p>
                        ) : (
                          <ul>
                            {mistake.redoScores.map((score, index) => (
                              <li key={`legacy-${String(index)}`}>
                                {t('mistakes.legacy.score', {
                                  score: Math.round(score),
                                })}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section>
                        <h3>{t('mistakes.derived.title')}</h3>
                        {derivedRetries.length === 0 ? (
                          <p>{t('mistakes.derived.empty')}</p>
                        ) : (
                          <ol>
                            {derivedRetries.map((entry) => (
                              <li
                                key={`${entry.attemptId}-${String(entry.visitOrdinal)}-${entry.completedAt}-${String(entry.caseVersion)}`}
                              >
                                {t('mistakes.derived.entry', {
                                  attemptId: entry.attemptId,
                                  visit: entry.visitOrdinal,
                                  completedAt: entry.completedAt,
                                  version: entry.caseVersion,
                                  score: Math.round(entry.score),
                                })}
                              </li>
                            ))}
                          </ol>
                        )}
                      </section>
                      <div className="button-row">
                        <Link
                          className="button button--secondary"
                          to={`/debrief/${mistake.attemptId}`}
                        >
                          {t('mistakes.viewDebrief')}
                        </Link>
                        {retryableCaseIds.has(mistake.caseId) ? (
                          <Link
                            className="button button--primary"
                            to={`/training/${mistake.caseId}`}
                          >
                            {t('mistakes.retryCase')}
                          </Link>
                        ) : (
                          <span
                            className="button button--primary"
                            aria-disabled="true"
                          >
                            {t('mistakes.retryUnavailable')}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
