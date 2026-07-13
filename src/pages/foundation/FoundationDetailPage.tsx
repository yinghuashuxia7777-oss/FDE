import { Link } from 'react-router-dom';

import { foundationStatus } from '../../application/foundation';
import {
  masteryStatus,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import {
  bundledFoundationSource,
  type FoundationSource,
} from '../../content/foundation-source';
import { StatusBadge } from '../../components/ui';
import type { FoundationLearningStatus } from '../../domain/foundation/types';
import { useI18n } from '../../i18n';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface FoundationDetailPageProps {
  foundationId: string;
  foundationSource?: FoundationSource;
  repositories?: ProductRepositories;
}

const foundationStatusKeys: Record<FoundationLearningStatus, string> = {
  'not-started': 'foundation.status.notStarted',
  learning: 'foundation.status.learning',
  mastered: 'foundation.status.mastered',
};

const masteryStatusKeys = {
  'Not started': 'product.common.mastery.notStarted',
  Weak: 'product.common.mastery.weak',
  Learning: 'product.common.mastery.learning',
  Competent: 'product.common.mastery.competent',
  Proficient: 'product.common.mastery.proficient',
} as const;

function foundationTone(status: FoundationLearningStatus) {
  if (status === 'mastered') return 'success' as const;
  if (status === 'learning') return 'warning' as const;
  return 'neutral' as const;
}

export function FoundationDetailPage({
  foundationId,
  foundationSource = bundledFoundationSource,
  repositories: override,
}: FoundationDetailPageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [item, mastery, attempts, skillDefinitions, cases] =
      await Promise.all([
        foundationSource.findById(foundationId),
        source.skills.list(LOCAL_USER_ID),
        source.attempts.list({ userId: LOCAL_USER_ID }),
        source.content.listActiveSkills(),
        source.cases.listActive({ status: 'published' }),
      ]);
    return { item, mastery, attempts, skillDefinitions, cases };
  }, [foundationId, foundationSource, getRepositories]);
  const readyItem = state.status === 'ready' ? state.data.item : undefined;
  const notFound = state.status === 'ready' && readyItem === undefined;
  const unavailable = state.status === 'error';

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t(
          notFound
            ? 'foundation.notFound.eyebrow'
            : 'foundation.detail.eyebrow',
        )}
        title={
          readyItem?.title ??
          t(
            notFound
              ? 'foundation.notFound.title'
              : unavailable
                ? 'foundation.detail.unavailableTitle'
                : 'foundation.detail.loadingTitle',
          )
        }
        description={t(
          notFound
            ? 'foundation.notFound.description'
            : 'foundation.detail.description',
        )}
      />
      <AsyncPage state={state} retry={retry}>
        {({ item, mastery, attempts, skillDefinitions, cases }) => {
          if (item === undefined) {
            return (
              <div className="panel">
                <Link className="button button--secondary" to="/foundation">
                  {t('foundation.notFound.back')}
                </Link>
              </div>
            );
          }

          const status = foundationStatus(item, mastery, attempts);
          const masteryBySkill = new Map(
            mastery.map((record) => [record.skillId, record]),
          );
          const skillById = new Map(
            skillDefinitions
              .filter((definition) => definition.status === 'active')
              .map((definition) => [definition.id, definition]),
          );
          const activeSkills = item.skills.flatMap((skillId) => {
            const definition = skillById.get(skillId);
            return definition === undefined ? [] : [definition];
          });
          const activeCaseById = new Map(
            cases
              .filter((candidate) => candidate.status === 'published')
              .map((candidate) => [candidate.id, candidate]),
          );
          const relatedCases = item.relatedCases.flatMap((caseId) => {
            const candidate = activeCaseById.get(caseId);
            return candidate === undefined ? [] : [candidate];
          });

          return (
            <div className="product-stack foundation-detail-stack">
              <div className="button-row">
                <Link className="button button--secondary" to="/foundation">
                  {t('foundation.detail.back')}
                </Link>
              </div>
              <dl className="compact-facts foundation-facts">
                <div>
                  <dt>{t('foundation.detail.level')}</dt>
                  <dd>{t(`product.common.level.${item.level}`)}</dd>
                </div>
                <div>
                  <dt>{t('foundation.detail.time')}</dt>
                  <dd>
                    {t('product.common.minutesShort', {
                      minutes: item.estimatedMinutes,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>{t('foundation.detail.status')}</dt>
                  <dd>
                    <StatusBadge tone={foundationTone(status)}>
                      {t(foundationStatusKeys[status])}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>

              <article className="foundation-reading panel">
                <section className="foundation-reading__section">
                  <h2>{t('foundation.detail.simpleExplanation')}</h2>
                  <p>{item.content.simpleExplanation}</p>
                </section>
                <section className="foundation-reading__section">
                  <h2>{t('foundation.detail.analogy')}</h2>
                  <p>{item.content.analogy}</p>
                </section>
                <section className="foundation-reading__section">
                  <h2>{t('foundation.detail.technicalExplanation')}</h2>
                  <p>{item.content.technicalExplanation}</p>
                </section>
                <section className="foundation-reading__section">
                  <h2>{t('foundation.detail.example')}</h2>
                  <p>{item.content.example}</p>
                </section>
                <section className="foundation-reading__section">
                  <h2>{t('foundation.detail.commonMistakes')}</h2>
                  <p>{item.content.commonMistakes}</p>
                </section>
              </article>

              <section
                className="panel foundation-support-panel"
                aria-labelledby="foundation-skills-title"
              >
                <h2 id="foundation-skills-title">
                  {t('foundation.detail.skills')}
                </h2>
                {activeSkills.length === 0 ? (
                  <p>{t('foundation.detail.noActiveSkills')}</p>
                ) : (
                  <dl className="foundation-skill-list">
                    {activeSkills.map((skill) => {
                      const record = masteryBySkill.get(skill.id);
                      const skillStatus = masteryStatus(
                        record?.score,
                        record?.sampleCount,
                      );
                      return (
                        <div key={skill.id}>
                          <dt>{skill.label}</dt>
                          <dd>
                            <span>
                              {record === undefined
                                ? t('product.common.notAvailable')
                                : `${Math.round(record.score)} / 100`}
                            </span>
                            <StatusBadge
                              tone={
                                skillStatus === 'Weak' ? 'warning' : 'neutral'
                              }
                            >
                              {t(masteryStatusKeys[skillStatus])}
                            </StatusBadge>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </section>

              <section
                className="panel foundation-support-panel"
                aria-labelledby="foundation-related-cases-title"
              >
                <div>
                  <h2 id="foundation-related-cases-title">
                    {t('foundation.detail.relatedCases')}
                  </h2>
                  <p>{t('foundation.detail.relatedCasesDescription')}</p>
                </div>
                {relatedCases.length === 0 ? (
                  <p>{t('foundation.detail.noActiveCases')}</p>
                ) : (
                  <ul className="plain-list foundation-related-list">
                    {relatedCases.map((candidate) => (
                      <li key={candidate.id}>
                        <Link
                          className="button button--secondary"
                          to={`/training/${candidate.id}`}
                        >
                          {t('foundation.detail.startCase', {
                            title: candidate.title,
                          })}
                        </Link>
                        <p>{candidate.scenarioSummary ?? candidate.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
