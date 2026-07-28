import { Link } from 'react-router-dom';

import type {
  AcademySourceReference,
  AcademyTopic,
} from '../../domain/academy';
import { useI18n } from '../../i18n';

export function AcademyUnavailable() {
  const { t } = useI18n();

  return (
    <section className="product-page" aria-labelledby="page-title">
      <h1 id="page-title" tabIndex={-1}>
        {t('academy.unavailable')}
      </h1>
    </section>
  );
}

export function AcademyBackLink({
  to,
  labelKey,
}: {
  to: string;
  labelKey: string;
}) {
  const { t } = useI18n();

  return (
    <Link className="button button--ghost" to={to}>
      {t(labelKey)}
    </Link>
  );
}

export function AcademyTags({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

export function AcademyMissingState({
  actionKey,
  descriptionKey,
  titleKey,
  to,
}: {
  actionKey: string;
  descriptionKey: string;
  titleKey: string;
  to: string;
}) {
  const { t } = useI18n();

  return (
    <section className="product-page" aria-labelledby="page-title">
      <div className="page-intro">
        <h1 id="page-title" tabIndex={-1}>
          {t(titleKey)}
        </h1>
        <p>{t(descriptionKey)}</p>
      </div>
      <Link className="button button--primary" to={to}>
        {t(actionKey)}
      </Link>
    </section>
  );
}

const academyRelationshipKeys = {
  foundation: 'academy.growth.foundation',
  practice: 'academy.growth.practice',
  case: 'academy.growth.case',
  skill: 'academy.growth.skill',
} as const;

function RelationshipGroup({
  ids,
  kind,
  route,
}: {
  ids: readonly string[];
  kind: keyof typeof academyRelationshipKeys;
  route: (id: string) => string;
}) {
  const { t } = useI18n();

  return (
    <section className="panel">
      <h3>{t(academyRelationshipKeys[kind])}</h3>
      {ids.length === 0 ? (
        <p>{t('academy.growth.empty')}</p>
      ) : (
        <ul className="foundation-related-list">
          {ids.map((id) => (
            <li key={id}>
              <Link to={route(id)}>{id}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AcademyGrowthConnections({ topic }: { topic: AcademyTopic }) {
  const { t } = useI18n();

  return (
    <section className="product-stack" aria-labelledby="academy-growth-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('academy.growth.title')}</p>
          <h2 id="academy-growth-title">{t('academy.growth.title')}</h2>
          <p>{t('academy.growth.description')}</p>
        </div>
      </div>
      <div className="case-grid">
        <RelationshipGroup
          ids={topic.relatedFoundationIds}
          kind="foundation"
          route={(id) => `/foundation/${id}`}
        />
        <RelationshipGroup
          ids={topic.relatedPracticeIds}
          kind="practice"
          route={(id) => `/practices/${id}`}
        />
        <RelationshipGroup
          ids={topic.relatedCaseIds}
          kind="case"
          route={(id) => `/training/${id}`}
        />
        <RelationshipGroup
          ids={topic.relatedSkillIds}
          kind="skill"
          route={() => '/skills'}
        />
      </div>
    </section>
  );
}

export function AcademySources({
  sources,
}: {
  sources: readonly AcademySourceReference[];
}) {
  const { t } = useI18n();

  return (
    <section className="panel" aria-labelledby="academy-sources-title">
      <p className="eyebrow">{t('academy.sources.title')}</p>
      <h2 id="academy-sources-title">{t('academy.sources.title')}</h2>
      <p>{t('academy.sources.description')}</p>
      <ul className="foundation-related-list">
        {sources.map((source) => (
          <li key={`${source.url}:${source.retrievedAt}`}>
            <a href={source.url} rel="noreferrer" target="_blank">
              {source.title}
            </a>
            <small>
              {t('academy.sources.meta', { date: source.retrievedAt })}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}
