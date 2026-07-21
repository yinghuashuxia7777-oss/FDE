import { Link, useSearchParams } from 'react-router-dom';

import type { NodeType } from '../../domain/cases/types';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import {
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { EmptyState, StatusBadge } from '../../components/ui';
import { useI18n } from '../../i18n';
import { AsyncPage, PageHeader } from '../shared';

interface CaseLibraryPageProps {
  repositories?: ProductRepositories;
}

const levels = ['beginner', 'intermediate', 'advanced'] as const;
const nodeTypes: NodeType[] = [
  'single-choice',
  'multiple-choice',
  'true-false',
  'ordering',
  'matching',
  'evidence-conclusion',
  'log-analysis',
  'command-choice',
  'diff-review',
  'configuration-review',
  'architecture-tradeoff',
  'customer-response',
];

const nodeTypeKeys: Record<NodeType, string> = {
  'single-choice': 'product.common.nodeType.singleChoice',
  'multiple-choice': 'product.common.nodeType.multipleChoice',
  'true-false': 'product.common.nodeType.trueFalse',
  ordering: 'product.common.nodeType.ordering',
  matching: 'product.common.nodeType.matching',
  'evidence-conclusion': 'product.common.nodeType.evidenceConclusion',
  'log-analysis': 'product.common.nodeType.logAnalysis',
  'command-choice': 'product.common.nodeType.commandChoice',
  'diff-review': 'product.common.nodeType.diffReview',
  'configuration-review': 'product.common.nodeType.configurationReview',
  'architecture-tradeoff': 'product.common.nodeType.architectureTradeoff',
  'customer-response': 'product.common.nodeType.customerResponse',
};

const verdictKeys = {
  excellent: 'product.common.verdict.excellent',
  pass: 'product.common.verdict.pass',
  marginal: 'product.common.verdict.marginal',
  fail: 'product.common.verdict.fail',
  'critical-risk': 'product.common.verdict.criticalRisk',
} as const;

export function CaseLibraryPage({
  repositories: override,
}: CaseLibraryPageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [cases, progress, attempts, domainDefinitions] = await Promise.all([
      source.cases.listActive({ status: 'published' }),
      source.progress.list(LOCAL_USER_ID),
      source.attempts.list({ userId: LOCAL_USER_ID }),
      source.content.listActiveDomains(),
    ]);
    return { cases, progress, attempts, domainDefinitions };
  }, [getRepositories]);

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === '') next.delete(name);
    else next.set(name, value);
    setSearchParams(next, { replace: name === 'q' });
  };

  return (
    <section
      className="product-page product-page--case-library"
      aria-labelledby="page-title"
    >
      <PageHeader
        eyebrow={t('cases.eyebrow')}
        title={t('cases.title')}
        description={t('cases.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({ cases, progress, attempts, domainDefinitions }) => {
          const visibleCases = cases.filter(
            ({ level, status }) =>
              status === 'published' &&
              levels.includes(level as (typeof levels)[number]),
          );
          const progressByCase = new Map(
            progress.map((record) => [record.caseId, record]),
          );
          const inProgress = new Set(
            attempts
              .filter(({ status }) => status === 'in-progress')
              .map(({ caseId }) => caseId),
          );
          const visibleDomainIds = new Set(
            visibleCases.flatMap(({ domains }) => domains),
          );
          const domainDefinitionsById = new Map(
            domainDefinitions.map((definition) => [definition.id, definition]),
          );
          const domains = [...visibleDomainIds]
            .map((id) => ({
              id,
              label: domainDefinitionsById.get(id)?.label ?? id,
            }))
            .sort(
              (left, right) =>
                left.label.localeCompare(right.label) ||
                left.id.localeCompare(right.id),
            );
          const search =
            searchParams.get('q')?.trim().toLocaleLowerCase() ?? '';
          const rawLevel = searchParams.get('level') ?? '';
          const level = levels.includes(rawLevel as (typeof levels)[number])
            ? rawLevel
            : '';
          const rawDomain = searchParams.get('domain') ?? '';
          const domain = domains.some(({ id }) => id === rawDomain)
            ? rawDomain
            : '';
          const technologies = [
            ...new Set(
              visibleCases.flatMap(({ technicalLayers }) => technicalLayers),
            ),
          ].sort();
          const rawTechnology = searchParams.get('technology') ?? '';
          const technology = technologies.includes(rawTechnology)
            ? rawTechnology
            : '';
          const rawNodeType = searchParams.get('nodeType') ?? '';
          const nodeType = nodeTypes.includes(rawNodeType as NodeType)
            ? rawNodeType
            : '';
          const enumValue = (name: string) => {
            const value = searchParams.get(name) ?? '';
            return value === 'yes' || value === 'no' ? value : '';
          };
          const done = enumValue('done');
          const passed = enumValue('passed');
          const critical = enumValue('critical');
          const rawDuration = Number(searchParams.get('maxDuration') ?? '0');
          const maxDuration = [10, 20, 30, 45].includes(rawDuration)
            ? rawDuration
            : 0;
          const filtered = visibleCases.filter((summary) => {
            const record = progressByCase.get(summary.id);
            const isPassed =
              record?.latestVerdict === 'excellent' ||
              record?.latestVerdict === 'pass';
            return (
              (search === '' ||
                `${summary.title} ${summary.summary} ${summary.scenarioSummary ?? ''}`
                  .toLocaleLowerCase()
                  .includes(search)) &&
              (level === '' || summary.level === level) &&
              (domain === '' || summary.domains.includes(domain)) &&
              (technology === '' ||
                summary.technicalLayers.includes(technology)) &&
              (nodeType === '' ||
                summary.nodeTypes?.includes(nodeType as NodeType)) &&
              (done === '' ||
                (done === 'yes') ===
                  (record !== undefined || inProgress.has(summary.id))) &&
              (passed === '' || (passed === 'yes') === isPassed) &&
              (critical === '' ||
                (critical === 'yes') === (record?.hasCriticalError === true)) &&
              (maxDuration === 0 || summary.estimatedMinutes <= maxDuration)
            );
          });
          return (
            <div className="product-stack" data-query={queryKey}>
              <form
                className="filter-panel case-library__toolbar"
                aria-label={t('cases.filters.label')}
                onSubmit={(event) => event.preventDefault()}
              >
                <label>
                  {t('cases.filters.search')}
                  <input
                    type="search"
                    value={searchParams.get('q') ?? ''}
                    onChange={(event) => update('q', event.target.value)}
                  />
                </label>
                <label>
                  {t('cases.filters.level')}
                  <select
                    value={level}
                    onChange={(event) => update('level', event.target.value)}
                  >
                    <option value="">{t('cases.filters.allLevels')}</option>
                    {levels.map((value) => (
                      <option key={value} value={value}>
                        {t(`product.common.level.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('cases.filters.domain')}
                  <select
                    value={domain}
                    onChange={(event) => update('domain', event.target.value)}
                  >
                    <option value="">{t('cases.filters.allDomains')}</option>
                    {domains.map(({ id, label }) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('cases.filters.technology')}
                  <select
                    value={technology}
                    onChange={(event) =>
                      update('technology', event.target.value)
                    }
                  >
                    <option value="">
                      {t('cases.filters.allTechnologies')}
                    </option>
                    {technologies.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('cases.filters.nodeType')}
                  <select
                    value={nodeType}
                    onChange={(event) => update('nodeType', event.target.value)}
                  >
                    <option value="">{t('cases.filters.allNodeTypes')}</option>
                    {nodeTypes.map((value) => (
                      <option key={value} value={value}>
                        {t(nodeTypeKeys[value])}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('cases.filters.attempted')}
                  <select
                    value={done}
                    onChange={(event) => update('done', event.target.value)}
                  >
                    <option value="">{t('cases.filters.any')}</option>
                    <option value="yes">{t('cases.filters.done')}</option>
                    <option value="no">{t('cases.filters.notDone')}</option>
                  </select>
                </label>
                <label>
                  {t('cases.filters.passed')}
                  <select
                    value={passed}
                    onChange={(event) => update('passed', event.target.value)}
                  >
                    <option value="">{t('cases.filters.any')}</option>
                    <option value="yes">{t('cases.filters.passedYes')}</option>
                    <option value="no">{t('cases.filters.notPassed')}</option>
                  </select>
                </label>
                <label>
                  {t('cases.filters.criticalHistory')}
                  <select
                    value={critical}
                    onChange={(event) => update('critical', event.target.value)}
                  >
                    <option value="">{t('cases.filters.any')}</option>
                    <option value="yes">
                      {t('cases.filters.hasCritical')}
                    </option>
                    <option value="no">{t('cases.filters.noCritical')}</option>
                  </select>
                </label>
                <label>
                  {t('cases.filters.maxDuration')}
                  <select
                    value={maxDuration === 0 ? '' : String(maxDuration)}
                    onChange={(event) =>
                      update('maxDuration', event.target.value)
                    }
                  >
                    <option value="">{t('cases.filters.anyDuration')}</option>
                    {[10, 20, 30, 45].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {t('cases.filters.minutes', { minutes })}
                      </option>
                    ))}
                  </select>
                </label>
              </form>
              <div className="case-library__results">
                {filtered.length === 0 ? (
                  <EmptyState
                    title={t('cases.empty.title')}
                    description={t('cases.empty.description')}
                  />
                ) : (
                  <div className="case-grid">
                    {filtered.map((summary) => {
                      const record = progressByCase.get(summary.id);
                      return (
                        <article
                          className="case-card case-card--incident"
                          data-level={summary.level}
                          key={summary.id}
                        >
                          <div className="case-card__header">
                            <div>
                              <p className="eyebrow">
                                {t(`product.common.level.${summary.level}`)}
                              </p>
                              <h2>{summary.title}</h2>
                            </div>
                            {record?.hasCriticalError === true ? (
                              <StatusBadge tone="critical">
                                {t('cases.card.criticalHistory')}
                              </StatusBadge>
                            ) : null}
                          </div>
                          <p className="case-card__summary">
                            {summary.scenarioSummary ?? summary.summary}
                          </p>
                          <dl className="compact-facts case-card__facts">
                            <div>
                              <dt>{t('cases.card.time')}</dt>
                              <dd>
                                {t('product.common.minutesShort', {
                                  minutes: summary.estimatedMinutes,
                                })}
                              </dd>
                            </div>
                            <div>
                              <dt>{t('cases.card.highest')}</dt>
                              <dd>
                                {record === undefined
                                  ? t('product.common.notAvailable')
                                  : `${Math.round(record.highestScore)}%`}
                              </dd>
                            </div>
                            <div>
                              <dt>{t('cases.card.latest')}</dt>
                              <dd>
                                {record === undefined
                                  ? t('cases.card.notAttempted')
                                  : t(verdictKeys[record.latestVerdict])}
                              </dd>
                            </div>
                          </dl>
                          <p
                            className="tag-list case-card__skills"
                            aria-label={t('cases.card.skillsLabel')}
                          >
                            {summary.skills.map((value) => (
                              <span key={value}>{value}</span>
                            ))}
                          </p>
                          <Link
                            className="button button--primary case-card__action"
                            to={`/training/${summary.id}`}
                          >
                            {inProgress.has(summary.id)
                              ? t('cases.card.resume')
                              : t('cases.card.start')}
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
