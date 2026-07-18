import { Link } from 'react-router-dom';

import {
  buildDomainSignals,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { StatusBadge } from '../../components/ui';
import { useI18n } from '../../i18n';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface SkillsPageProps {
  repositories?: ProductRepositories;
}

const masteryStatusKeys = {
  'Not started': 'product.common.mastery.notStarted',
  Weak: 'product.common.mastery.weak',
  Learning: 'product.common.mastery.learning',
  Competent: 'product.common.mastery.competent',
  Proficient: 'product.common.mastery.proficient',
} as const;

export function SkillsPage({ repositories: override }: SkillsPageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [cases, mastery, domainDefinitions, skillDefinitions] =
      await Promise.all([
        source.cases.listActive({ status: 'published' }),
        source.skills.list(LOCAL_USER_ID),
        source.content.listActiveDomains(),
        source.content.listActiveSkills(),
      ]);
    return {
      cases: cases.filter(
        ({ level, status }) => status === 'published' && level !== 'expert',
      ),
      mastery,
      domainDefinitions,
      skillDefinitions,
    };
  }, [getRepositories]);

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('skills.eyebrow')}
        title={t('skills.title')}
        description={t('skills.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({ cases, mastery, domainDefinitions, skillDefinitions }) => {
          const domains = buildDomainSignals(
            domainDefinitions,
            skillDefinitions,
            mastery,
          );
          const masteryBySkill = new Map(
            mastery.map((record) => [record.skillId, record]),
          );
          return (
            <div className="product-stack">
              <p>{t('skills.scoreExplanation')}</p>
              <div
                className="domain-grid"
                role="list"
                aria-label={t('skills.domainMasteryLabel')}
              >
                {domains.map((domain) => {
                  const relatedCases = cases.filter(({ domains: values }) =>
                    values.includes(domain.id),
                  );
                  const skills = skillDefinitions.filter(
                    ({ domainId }) => domainId === domain.id,
                  );
                  return (
                    <article
                      className="domain-cell"
                      data-testid="domain-signal"
                      key={domain.id}
                      role="listitem"
                    >
                      <h2>{domain.label}</h2>
                      <p>
                        <strong>
                          {domain.score === undefined
                            ? t('product.common.notAvailable')
                            : `${Math.round(domain.score)} / 100`}
                        </strong>
                      </p>
                      <StatusBadge
                        tone={domain.status === 'Weak' ? 'warning' : 'neutral'}
                      >
                        {t(masteryStatusKeys[domain.status])}
                      </StatusBadge>
                      <p>
                        {t(
                          domain.sampleCount === 1
                            ? 'skills.masterySampleOne'
                            : 'skills.masterySamples',
                          { count: domain.sampleCount },
                        )}
                      </p>
                      <dl>
                        {skills.map((skill) => (
                          <div key={skill.id}>
                            <dt>{skill.label}</dt>
                            <dd>
                              {masteryBySkill.get(skill.id)?.score ??
                                t('product.common.notAvailable')}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {relatedCases.length === 0 ? (
                        <p>{t('skills.noRelatedCase')}</p>
                      ) : (
                        <ul>
                          {relatedCases.map((caseSummary) => (
                            <li key={caseSummary.id}>
                              <Link
                                to={`/cases?domain=${encodeURIComponent(domain.id)}`}
                              >
                                {caseSummary.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>
              <table>
                <caption>{t('skills.table.caption')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('skills.table.domain')}</th>
                    <th scope="col">{t('skills.table.score')}</th>
                    <th scope="col">{t('skills.table.status')}</th>
                    <th scope="col">{t('skills.table.samples')}</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain) => (
                    <tr key={domain.id}>
                      <th scope="row">{domain.label}</th>
                      <td>
                        {domain.score === undefined
                          ? t('product.common.notAvailable')
                          : Math.round(domain.score)}
                      </td>
                      <td>{t(masteryStatusKeys[domain.status])}</td>
                      <td>{domain.sampleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
