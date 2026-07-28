import { Link } from 'react-router-dom';

import { useAsyncPageData } from '../../application/product';
import {
  bundledAcademySource,
  type AcademyContentSource,
} from '../../content/academy-source';
import type {
  AcademySectionKind,
  AcademyStageId,
  AcademyTool,
  AcademyTopic,
} from '../../domain/academy';
import { useI18n } from '../../i18n';
import { AsyncPage, PageHeader } from '../shared';
import {
  AcademyBackLink,
  AcademyGrowthConnections,
  AcademyMissingState,
  AcademySources,
  AcademyTags,
  AcademyUnavailable,
} from './AcademyPageParts';

interface AcademySourceProps {
  academySource?: AcademyContentSource;
}

const academyStageKeys: Record<
  AcademyStageId,
  { objectiveKey: string; titleKey: string }
> = {
  'stage-0': {
    objectiveKey: 'academy.stage.stage-0.objective',
    titleKey: 'academy.stage.stage-0.title',
  },
  'stage-1': {
    objectiveKey: 'academy.stage.stage-1.objective',
    titleKey: 'academy.stage.stage-1.title',
  },
  'stage-2': {
    objectiveKey: 'academy.stage.stage-2.objective',
    titleKey: 'academy.stage.stage-2.title',
  },
  'stage-3': {
    objectiveKey: 'academy.stage.stage-3.objective',
    titleKey: 'academy.stage.stage-3.title',
  },
  'stage-4': {
    objectiveKey: 'academy.stage.stage-4.objective',
    titleKey: 'academy.stage.stage-4.title',
  },
};

const academySectionKeys: Record<AcademySectionKind, string> = {
  overview: 'academy.section.overview',
  mechanism: 'academy.section.mechanism',
  scenario: 'academy.section.scenario',
  pitfalls: 'academy.section.pitfalls',
  'hands-on': 'academy.section.hands-on',
};

export function AcademyCatalogPage({
  academySource = bundledAcademySource,
}: AcademySourceProps) {
  const { language } = useI18n();
  if (language === 'en-US') return <AcademyUnavailable />;
  return <ChineseAcademyCatalogPage academySource={academySource} />;
}

function ChineseAcademyCatalogPage({
  academySource,
}: Required<AcademySourceProps>) {
  const { t } = useI18n();
  const { state, retry } = useAsyncPageData(async () => {
    const [catalog, topics] = await Promise.all([
      academySource.loadCatalog(),
      academySource.loadTopics(),
    ]);
    return { catalog, topics };
  }, [academySource]);

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('academy.catalog.eyebrow')}
        title={t('academy.catalog.title')}
        description={t('academy.catalog.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({ catalog, topics }) => {
          const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
          const firstTopic = catalog.stages
            .flatMap((stage) => stage.topicIds)
            .map((id) => topicsById.get(id))
            .find((topic): topic is AcademyTopic => topic !== undefined);

          return (
            <div className="product-stack">
              <section className="panel">
                <p className="eyebrow">{t('academy.catalog.heroLabel')}</p>
                <h2>{t('academy.catalog.heroTitle')}</h2>
                <p>{t('academy.catalog.heroDescription')}</p>
              </section>

              {firstTopic === undefined ? null : (
                <section className="panel">
                  <p className="eyebrow">
                    {t('academy.catalog.recommendedLabel')}
                  </p>
                  <h2>{t('academy.catalog.recommendedTitle')}</h2>
                  <p>{firstTopic.summary}</p>
                  <Link
                    className="button button--primary"
                    to={`/academy/${firstTopic.id}`}
                  >
                    {t('academy.catalog.recommendedAction', {
                      title:
                        firstTopic.title.split('：')[0] ?? firstTopic.title,
                    })}
                  </Link>
                </section>
              )}

              <section className="product-stack">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{t('academy.catalog.pathLabel')}</p>
                    <h2>{t('academy.catalog.pathTitle')}</h2>
                  </div>
                </div>
                {catalog.stages.map((stage) => {
                  const stageTopics = stage.topicIds
                    .map((id) => topicsById.get(id))
                    .filter(
                      (topic): topic is AcademyTopic => topic !== undefined,
                    );
                  const keys = academyStageKeys[stage.id];
                  return (
                    <section
                      className="panel product-stack"
                      data-testid="academy-stage"
                      key={stage.id}
                    >
                      <div className="section-heading">
                        <div>
                          <h2>{t(keys.titleKey)}</h2>
                          <p>{t(keys.objectiveKey)}</p>
                        </div>
                        <strong>
                          {t('academy.catalog.stageTopicCount', {
                            count: stageTopics.length,
                          })}
                        </strong>
                      </div>
                      <div className="case-grid">
                        {stageTopics.map((topic) => (
                          <article className="case-card" key={topic.id}>
                            <div className="case-card__header">
                              <h3>
                                <Link to={`/academy/${topic.id}`}>
                                  {topic.title}
                                </Link>
                              </h3>
                              <strong>
                                {t('academy.topic.meta', {
                                  minutes: topic.estimatedMinutes,
                                })}
                              </strong>
                            </div>
                            <p>{topic.summary}</p>
                            <AcademyTags tags={topic.tags} />
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </section>

              <section className="panel" data-testid="academy-tool-radar">
                <p className="eyebrow">{t('academy.catalog.toolLabel')}</p>
                <h2>
                  <Link to="/academy/tools">
                    {t('academy.catalog.toolTitle')}
                  </Link>
                </h2>
                <p>{t('academy.catalog.toolDescription')}</p>
              </section>

              <section className="panel">
                <h2>{t('academy.catalog.loopTitle')}</h2>
                <p>{t('academy.catalog.loopDescription')}</p>
              </section>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}

interface AcademyTopicPageProps extends AcademySourceProps {
  topicId: string;
}

export function AcademyTopicPage({
  academySource = bundledAcademySource,
  topicId,
}: AcademyTopicPageProps) {
  const { language } = useI18n();
  if (language === 'en-US') return <AcademyUnavailable />;
  return (
    <ChineseAcademyTopicPage academySource={academySource} topicId={topicId} />
  );
}

function ChineseAcademyTopicPage({
  academySource,
  topicId,
}: Required<AcademyTopicPageProps>) {
  const { t } = useI18n();
  const { state, retry } = useAsyncPageData(
    () => academySource.findTopic(topicId),
    [academySource, topicId],
  );

  return (
    <AsyncPage state={state} retry={retry}>
      {(topic) =>
        topic === undefined ? (
          <AcademyMissingState
            actionKey="academy.missingTopic.action"
            descriptionKey="academy.missingTopic.description"
            titleKey="academy.missingTopic.title"
            to="/academy"
          />
        ) : (
          <article className="product-page" aria-labelledby="page-title">
            <div className="button-row">
              <AcademyBackLink to="/academy" labelKey="academy.topic.back" />
            </div>
            <header className="page-intro">
              <p className="eyebrow">
                {t(academyStageKeys[topic.stageId].titleKey)}
              </p>
              <h1 id="page-title" tabIndex={-1}>
                {topic.title}
              </h1>
              <p>{topic.summary}</p>
              <strong>
                {t('academy.topic.meta', {
                  minutes: topic.estimatedMinutes,
                })}
              </strong>
              <AcademyTags tags={topic.tags} />
            </header>

            <div className="product-stack">
              <div className="foundation-detail-layout">
                <div className="product-stack">
                  {topic.sections.map((section) => (
                    <section
                      className="panel"
                      data-testid="academy-topic-section"
                      key={section.kind}
                    >
                      <p className="eyebrow">
                        {t(academySectionKeys[section.kind])}
                      </p>
                      <h2>{section.title}</h2>
                      <p>{section.content}</p>
                    </section>
                  ))}
                </div>
                <aside className="product-stack">
                  <AcademyGrowthConnections topic={topic} />
                </aside>
              </div>
              <AcademySources sources={topic.sourceRefs} />
            </div>
          </article>
        )
      }
    </AsyncPage>
  );
}

export function AcademyToolsPage({
  academySource = bundledAcademySource,
}: AcademySourceProps) {
  const { language } = useI18n();
  if (language === 'en-US') return <AcademyUnavailable />;
  return <ChineseAcademyToolsPage academySource={academySource} />;
}

function ToolDecisionParts({ tool }: { tool: AcademyTool }) {
  const { t } = useI18n();
  const parts = [
    ['academy.tools.bestFor', tool.bestFor],
    ['academy.tools.watchOutFor', tool.watchOutFor],
    ['academy.tools.nextAction', tool.nextAction],
  ] as const;

  return (
    <div className="product-stack">
      {parts.map(([key, content]) => (
        <section key={key}>
          <h3>{t(key)}</h3>
          <p>{content}</p>
        </section>
      ))}
    </div>
  );
}

function ChineseAcademyToolsPage({
  academySource,
}: Required<AcademySourceProps>) {
  const { t } = useI18n();
  const { state, retry } = useAsyncPageData(
    () => academySource.loadTools(),
    [academySource],
  );

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('academy.tools.eyebrow')}
        title={t('academy.tools.title')}
        description={t('academy.tools.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {(tools) => (
          <div className="case-grid">
            {tools.map((tool) => (
              <article
                aria-label={tool.title}
                className="case-card"
                key={tool.id}
              >
                <div className="case-card__header">
                  <h2>{tool.title}</h2>
                  <span className="eyebrow">
                    {t('academy.catalog.toolLabel')}
                  </span>
                </div>
                <p>{tool.summary}</p>
                <AcademyTags tags={tool.tags} />
                <ToolDecisionParts tool={tool} />
                <Link
                  className="button button--secondary"
                  to={`/academy/tools/${tool.id}`}
                >
                  {t('academy.tools.view', { title: tool.title })}
                </Link>
              </article>
            ))}
          </div>
        )}
      </AsyncPage>
    </section>
  );
}

interface AcademyToolPageProps extends AcademySourceProps {
  toolId: string;
}

export function AcademyToolPage({
  academySource = bundledAcademySource,
  toolId,
}: AcademyToolPageProps) {
  const { language } = useI18n();
  if (language === 'en-US') return <AcademyUnavailable />;
  return (
    <ChineseAcademyToolPage academySource={academySource} toolId={toolId} />
  );
}

function ChineseAcademyToolPage({
  academySource,
  toolId,
}: Required<AcademyToolPageProps>) {
  const { t } = useI18n();
  const { state, retry } = useAsyncPageData(async () => {
    const [tool, topics] = await Promise.all([
      academySource.findTool(toolId),
      academySource.loadTopics(),
    ]);
    return { tool, topicIds: new Set(topics.map((topic) => topic.id)) };
  }, [academySource, toolId]);

  return (
    <AsyncPage state={state} retry={retry}>
      {({ tool, topicIds }) =>
        tool === undefined ? (
          <AcademyMissingState
            actionKey="academy.missingTool.action"
            descriptionKey="academy.missingTool.description"
            titleKey="academy.missingTool.title"
            to="/academy/tools"
          />
        ) : (
          <article className="product-page" aria-labelledby="page-title">
            <div className="button-row">
              <AcademyBackLink
                to="/academy/tools"
                labelKey="academy.tool.back"
              />
            </div>
            <header className="page-intro">
              <p className="eyebrow">{t('academy.tools.eyebrow')}</p>
              <h1 id="page-title" tabIndex={-1}>
                {tool.title}
              </h1>
              <p>{tool.summary}</p>
              <AcademyTags tags={tool.tags} />
            </header>
            <div className="product-stack">
              <section className="panel">
                <ToolDecisionParts tool={tool} />
                <a
                  className="button button--secondary"
                  href={tool.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t('academy.tool.openWebsite', { title: tool.title })}
                </a>
              </section>
              <section className="panel">
                <h2>{t('academy.tool.relatedTopics')}</h2>
                <ul className="foundation-related-list">
                  {tool.relatedTopicIds
                    .filter((id) => topicIds.has(id))
                    .map((id) => (
                      <li key={id}>
                        <Link to={`/academy/${id}`}>{id}</Link>
                      </li>
                    ))}
                </ul>
              </section>
              <AcademySources sources={tool.sourceRefs} />
            </div>
          </article>
        )
      }
    </AsyncPage>
  );
}
