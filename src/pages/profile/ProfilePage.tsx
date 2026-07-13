import {
  buildDomainSignals,
  calculateCapabilityDimensions,
  calculateLevelPassRates,
  type ProductRepositories,
  type TrustedAttempt,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { Alert, StatusBadge } from '../../components/ui';
import type { FdeCase } from '../../domain/cases/types';
import { useI18n } from '../../i18n';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface ProfilePageProps {
  repositories?: ProductRepositories;
}

type Translate = ReturnType<typeof useI18n>['t'];

const masteryStatusKeys = {
  'Not started': 'product.common.mastery.notStarted',
  Weak: 'product.common.mastery.weak',
  Learning: 'product.common.mastery.learning',
  Competent: 'product.common.mastery.competent',
  Proficient: 'product.common.mastery.proficient',
} as const;

function translateErrorType(t: Translate, value: string): string {
  const key = `product.errorType.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

export function ProfilePage({ repositories: override }: ProfilePageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [
      attempts,
      mistakes,
      mastery,
      activeDomainDefinitions,
      activeSkillDefinitions,
    ] = await Promise.all([
      source.attempts.list({ userId: LOCAL_USER_ID, status: 'completed' }),
      source.mistakes.list({ userId: LOCAL_USER_ID }),
      source.skills.list(LOCAL_USER_ID),
      source.content.listActiveDomains(),
      source.content.listActiveSkills(),
    ]);
    const completed = attempts.filter(
      (attempt): attempt is Extract<typeof attempt, { status: 'completed' }> =>
        attempt.status === 'completed',
    );
    const trusted: TrustedAttempt[] = [];
    const missing: string[] = [];
    const contentByVersion = new Map<string, FdeCase | undefined>();
    const uniqueVersions = [
      ...new Map(
        completed.map((attempt) => [
          `${attempt.caseId}@${String(attempt.caseVersion)}`,
          attempt,
        ]),
      ).values(),
    ];
    await Promise.all(
      uniqueVersions.map(async (attempt) => {
        contentByVersion.set(
          `${attempt.caseId}@${String(attempt.caseVersion)}`,
          await source.cases.getVersion(attempt.caseId, attempt.caseVersion),
        );
      }),
    );
    completed.forEach((attempt) => {
      const key = `${attempt.caseId}@${String(attempt.caseVersion)}`;
      const content = contentByVersion.get(key);
      if (content === undefined) {
        missing.push(key);
      } else {
        trusted.push({ attempt, caseContent: content });
      }
    });
    trusted.sort((left, right) =>
      left.attempt.id.localeCompare(right.attempt.id),
    );
    missing.sort();
    const skillDefinitionsById = new Map(
      activeSkillDefinitions.map((definition) => [definition.id, definition]),
    );
    const referencedSkillIds = new Set([
      ...mastery.map(({ skillId }) => skillId),
      ...trusted.flatMap(({ caseContent }) => caseContent.skills),
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
      ...trusted.flatMap(({ caseContent }) => caseContent.domains),
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
      trusted,
      missing,
      mistakes,
      mastery,
      domainDefinitions: [...domainDefinitionsById.values()],
      skillDefinitions: [...skillDefinitionsById.values()],
    };
  }, [getRepositories]);

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({
          trusted,
          missing,
          mistakes,
          mastery,
          domainDefinitions,
          skillDefinitions,
        }) => {
          const missingVersions = [...new Set(missing)];
          const domains = buildDomainSignals(
            domainDefinitions,
            skillDefinitions,
            mastery,
          );
          const levels = calculateLevelPassRates(trusted);
          const dimensions = calculateCapabilityDimensions(trusted);
          const errorCounts = new Map<string, number>();
          mistakes.forEach(({ errorTypes }) =>
            errorTypes.forEach((error) =>
              errorCounts.set(error, (errorCounts.get(error) ?? 0) + 1),
            ),
          );
          const frequentErrors = [...errorCounts].sort(
            (left, right) =>
              right[1] - left[1] || left[0].localeCompare(right[0]),
          );
          const availableDimensionScores = dimensions.flatMap(({ score }) =>
            score === undefined ? [] : [score],
          );
          const criticalAttempts = trusted.filter(
            ({ attempt }) => attempt.criticalErrorIds.length > 0,
          ).length;
          const missingDimensions = dimensions.filter(
            ({ samples }) => samples === 0,
          );
          const enoughSamples =
            trusted.length >= 3 && missingDimensions.length === 0;
          const readiness = enoughSamples
            ? availableDimensionScores.reduce((sum, score) => sum + score, 0) /
              5
            : undefined;
          return (
            <div className="product-stack">
              {missing.length === 0 ? null : (
                <Alert
                  title={t('profile.missingVersions.title')}
                  tone="warning"
                >
                  {t(
                    missing.length === 1
                      ? 'profile.missingVersions.messageOne'
                      : 'profile.missingVersions.message',
                    {
                      count: missing.length,
                      versions: missingVersions.join(', '),
                    },
                  )}
                </Alert>
              )}
              <section className="panel" aria-labelledby="readiness-title">
                <h2 id="readiness-title">{t('profile.readiness.title')}</h2>
                {readiness === undefined ? (
                  <p>
                    {t('profile.readiness.insufficient', {
                      dimensions:
                        missingDimensions.length === 0
                          ? t('product.common.none')
                          : missingDimensions
                              .map(({ id }) => t(`profile.dimension.${id}`))
                              .join(', '),
                    })}
                  </p>
                ) : (
                  <p>
                    <strong>{Math.round(readiness)} / 100</strong>
                  </p>
                )}
                <p>
                  {t('profile.readiness.formula', {
                    trusted: trusted.length,
                    critical: criticalAttempts,
                  })}
                </p>
              </section>
              <section
                className="panel"
                aria-labelledby="profile-domains-title"
              >
                <h2 id="profile-domains-title">
                  {t('profile.domainMastery.title')}
                </h2>
                <div className="domain-grid">
                  {domains.map((domain) => (
                    <article className="domain-cell" key={domain.id}>
                      <h3>{domain.label}</h3>
                      <p>
                        {domain.score === undefined
                          ? t('product.common.notAvailable')
                          : `${Math.round(domain.score)} / 100`}
                      </p>
                      <StatusBadge>
                        {t(masteryStatusKeys[domain.status])}
                      </StatusBadge>
                      <p>
                        {t(
                          domain.sampleCount === 1
                            ? 'profile.domainMastery.sampleOne'
                            : 'profile.domainMastery.samples',
                          { count: domain.sampleCount },
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
              <section className="panel" aria-labelledby="level-rates-title">
                <h2 id="level-rates-title">{t('profile.levelRates.title')}</h2>
                <table>
                  <caption>{t('profile.levelRates.caption')}</caption>
                  <thead>
                    <tr>
                      <th>{t('profile.levelRates.level')}</th>
                      <th>{t('profile.levelRates.passed')}</th>
                      <th>{t('profile.levelRates.samples')}</th>
                      <th>{t('profile.levelRates.rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((level) => (
                      <tr key={level.level}>
                        <th scope="row">
                          {t(`product.common.level.${level.level}`)}
                        </th>
                        <td>{level.passed}</td>
                        <td>{level.samples}</td>
                        <td>
                          {level.rate === undefined
                            ? t('product.common.notAvailable')
                            : `${Math.round(level.rate)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="panel" aria-labelledby="dimensions-title">
                <h2 id="dimensions-title">{t('profile.dimensions.title')}</h2>
                <table>
                  <caption>{t('profile.dimensions.caption')}</caption>
                  <thead>
                    <tr>
                      <th>{t('profile.dimensions.dimension')}</th>
                      <th>{t('profile.dimensions.score')}</th>
                      <th>{t('profile.dimensions.samples')}</th>
                      <th>{t('profile.dimensions.basis')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dimensions.map((dimension) => (
                      <tr key={dimension.id}>
                        <th scope="row">
                          {t(`profile.dimension.${dimension.id}`)}
                        </th>
                        <td>
                          {dimension.score === undefined
                            ? t('product.common.notAvailable')
                            : Math.round(dimension.score)}
                        </td>
                        <td>{dimension.samples}</td>
                        <td>{t('profile.dimension.basisText')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section
                className="panel"
                aria-labelledby="frequent-errors-title"
              >
                <h2 id="frequent-errors-title">
                  {t('profile.frequentErrors.title')}
                </h2>
                {frequentErrors.length === 0 ? (
                  <p>{t('profile.frequentErrors.empty')}</p>
                ) : (
                  <ol>
                    {frequentErrors.map(([error, count]) => (
                      <li key={error}>
                        {translateErrorType(t, error)}: {count}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
