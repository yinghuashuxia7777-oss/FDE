import { Link, useSearchParams } from 'react-router-dom';

import type { NodeType } from '../../domain/cases/types';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import {
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { EmptyState, StatusBadge } from '../../components/ui';
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

export function CaseLibraryPage({
  repositories: override,
}: CaseLibraryPageProps) {
  const getRepositories = useProductRepositories(override);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [cases, progress, attempts] = await Promise.all([
      source.cases.list({ status: 'published' }),
      source.progress.list(LOCAL_USER_ID),
      source.attempts.list({ userId: LOCAL_USER_ID }),
    ]);
    return { cases, progress, attempts };
  }, [getRepositories]);

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === '') next.delete(name);
    else next.set(name, value);
    setSearchParams(next, { replace: name === 'q' });
  };

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow="Scenario inventory"
        title="Cases"
        description="Filter local cases by capability, decision shape, risk, and prior result."
      />
      <AsyncPage state={state} retry={retry}>
        {({ cases, progress, attempts }) => {
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
          const domains = [
            ...new Set(visibleCases.flatMap(({ domains }) => domains)),
          ].sort();
          const search =
            searchParams.get('q')?.trim().toLocaleLowerCase() ?? '';
          const rawLevel = searchParams.get('level') ?? '';
          const level = levels.includes(rawLevel as (typeof levels)[number])
            ? rawLevel
            : '';
          const rawDomain = searchParams.get('domain') ?? '';
          const domain = domains.includes(rawDomain) ? rawDomain : '';
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
                className="filter-panel"
                aria-label="Case filters"
                onSubmit={(event) => event.preventDefault()}
              >
                <label>
                  Search cases
                  <input
                    type="search"
                    value={searchParams.get('q') ?? ''}
                    onChange={(event) => update('q', event.target.value)}
                  />
                </label>
                <label>
                  Level
                  <select
                    value={level}
                    onChange={(event) => update('level', event.target.value)}
                  >
                    <option value="">All levels</option>
                    {levels.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Domain
                  <select
                    value={domain}
                    onChange={(event) => update('domain', event.target.value)}
                  >
                    <option value="">All domains</option>
                    {domains.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Technology layer
                  <select
                    value={technology}
                    onChange={(event) =>
                      update('technology', event.target.value)
                    }
                  >
                    <option value="">All technologies</option>
                    {technologies.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Node type
                  <select
                    value={nodeType}
                    onChange={(event) => update('nodeType', event.target.value)}
                  >
                    <option value="">All node types</option>
                    {nodeTypes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Attempted
                  <select
                    value={done}
                    onChange={(event) => update('done', event.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="yes">Done</option>
                    <option value="no">Not done</option>
                  </select>
                </label>
                <label>
                  Passed
                  <select
                    value={passed}
                    onChange={(event) => update('passed', event.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="yes">Passed</option>
                    <option value="no">Not passed</option>
                  </select>
                </label>
                <label>
                  Critical history
                  <select
                    value={critical}
                    onChange={(event) => update('critical', event.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="yes">Has critical error</option>
                    <option value="no">No critical error</option>
                  </select>
                </label>
                <label>
                  Maximum duration
                  <select
                    value={maxDuration === 0 ? '' : String(maxDuration)}
                    onChange={(event) =>
                      update('maxDuration', event.target.value)
                    }
                  >
                    <option value="">Any duration</option>
                    <option value="10">10 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                  </select>
                </label>
              </form>
              {filtered.length === 0 ? (
                <EmptyState
                  title="No cases match"
                  description="Adjust the filters; your current URL keeps the selection for back navigation."
                />
              ) : (
                <div className="case-grid">
                  {filtered.map((summary) => {
                    const record = progressByCase.get(summary.id);
                    return (
                      <article className="case-card" key={summary.id}>
                        <div className="case-card__header">
                          <div>
                            <p className="eyebrow">{summary.level}</p>
                            <h2>{summary.title}</h2>
                          </div>
                          {record?.hasCriticalError === true ? (
                            <StatusBadge tone="critical">
                              Critical history
                            </StatusBadge>
                          ) : null}
                        </div>
                        <p>{summary.scenarioSummary ?? summary.summary}</p>
                        <dl className="compact-facts">
                          <div>
                            <dt>Time</dt>
                            <dd>{summary.estimatedMinutes} min</dd>
                          </div>
                          <div>
                            <dt>Highest</dt>
                            <dd>
                              {record === undefined
                                ? 'N/A'
                                : `${Math.round(record.highestScore)}%`}
                            </dd>
                          </div>
                          <div>
                            <dt>Latest</dt>
                            <dd>{record?.latestVerdict ?? 'Not attempted'}</dd>
                          </div>
                        </dl>
                        <p className="tag-list" aria-label="Skills">
                          {summary.skills.map((value) => (
                            <span key={value}>{value}</span>
                          ))}
                        </p>
                        <Link
                          className="button button--primary"
                          to={`/training/${summary.id}`}
                        >
                          {inProgress.has(summary.id)
                            ? 'Resume case'
                            : 'Start case'}
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
