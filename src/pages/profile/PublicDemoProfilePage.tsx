import { CheckCircle, MapTrifold, ShieldCheck } from '@phosphor-icons/react';

import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';

const demoSkills = [
  ['LLM', 85],
  ['Agent', 75],
  ['RAG', 80],
  ['Cloud', 60],
] as const;

export function PublicDemoProfilePage() {
  const { t } = useI18n();
  return (
    <section
      className="product-page public-capability-profile"
      aria-labelledby="page-title"
      data-demo-profile="true"
    >
      <PageHeader
        eyebrow={t('demoProfile.eyebrow')}
        title={t('demoProfile.nameTitle')}
        description={t('demoProfile.description')}
      />
      <div className="capability-profile__top-grid">
        <section className="growth-card capability-profile__readiness">
          <div className="growth-card__heading">
            <div>
              <h2>{t('demoProfile.readiness')}</h2>
              <p>{t('demoProfile.isolated')}</p>
            </div>
            <ShieldCheck aria-hidden="true" size={22} />
          </div>
          <div
            className="capability-profile__readiness-meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={72}
            style={
              { '--profile-readiness-angle': '259.2deg' } as React.CSSProperties
            }
          >
            <strong>72%</strong>
            <span>{t('demoProfile.readinessLabel')}</span>
          </div>
        </section>
        <section className="growth-card capability-profile__identity">
          <h2>{t('demoProfile.delivery')}</h2>
          <dl className="capability-profile__identity-stats">
            <div>
              <dt>{t('demoProfile.completedCases')}</dt>
              <dd>20</dd>
            </div>
            <div>
              <dt>{t('demoProfile.projects')}</dt>
              <dd>1</dd>
            </div>
          </dl>
          <p>
            <CheckCircle aria-hidden="true" size={18} />{' '}
            {t('demoProfile.projectName')}
          </p>
        </section>
      </div>
      <section className="growth-card capability-profile__skills">
        <div className="growth-card__heading">
          <div>
            <h2>{t('demoProfile.skills')}</h2>
            <p>{t('demoProfile.skillsDescription')}</p>
          </div>
        </div>
        <div className="capability-profile__skill-grid">
          {demoSkills.map(([label, score]) => (
            <article className="capability-profile__skill-card" key={label}>
              <div className="capability-profile__skill-heading">
                <h3>{label}</h3>
                <div className="capability-profile__skill-score">
                  <span>{t('demoProfile.evidenceScore')}</span>
                  <strong>{score}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section
        className="growth-card capability-profile__skills"
        aria-label={t('demoProfile.capabilityMap')}
      >
        <div className="growth-card__heading">
          <div>
            <h2>{t('demoProfile.capabilityMap')}</h2>
            <p>{t('demoProfile.capabilityMapDescription')}</p>
          </div>
          <MapTrifold aria-hidden="true" size={22} />
        </div>
        <div className="capability-profile__skill-grid">
          {demoSkills.map(([label, score]) => (
            <article
              className="capability-profile__skill-card"
              key={`map-${label}`}
            >
              <h3>{label}</h3>
              <progress aria-label={label} max={100} value={score} />
              <strong>{score}%</strong>
            </article>
          ))}
        </div>
      </section>
      <section className="growth-card capability-profile__identity">
        <h2>{t('demoProfile.journey')}</h2>
        <ol className="growth-journey__steps">
          {['learn', 'practice', 'challenge', 'project', 'capability'].map(
            (step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <strong>{t(`demoProfile.journey.${step}`)}</strong>
              </li>
            ),
          )}
        </ol>
      </section>
    </section>
  );
}
