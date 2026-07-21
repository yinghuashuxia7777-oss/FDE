import {
  ArrowRight,
  CheckCircle,
  FolderOpen,
  MapTrifold,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';

const demoSkills = [
  ['LLM', 85],
  ['Agent', 75],
  ['RAG', 80],
  ['Cloud', 60],
] as const;

const verifiedEvidence = [
  'tool-calling-case',
  'rag-evaluation-practice',
  'production-readiness-challenge',
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
      <section className="growth-card demo-profile-hero">
        <div>
          <p className="eyebrow">{t('demoProfile.publicLabel')}</p>
          <h2>{t('demoProfile.publicTitle')}</h2>
          <p>{t('demoProfile.publicDescription')}</p>
        </div>
        <div className="button-row">
          <Link className="button button--primary" to="/journey">
            {t('demoProfile.exploreJourney')}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <Link className="button button--secondary" to="/">
            {t('demoProfile.startOwn')}
          </Link>
        </div>
      </section>
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
      <section className="growth-card demo-profile-evidence">
        <div className="growth-card__heading">
          <div>
            <h2>{t('demoProfile.verifiedEvidence')}</h2>
            <p>{t('demoProfile.verifiedEvidenceDescription')}</p>
          </div>
          <ShieldCheck aria-hidden="true" size={22} />
        </div>
        <ul>
          {verifiedEvidence.map((item) => (
            <li key={item}>
              <CheckCircle aria-hidden="true" size={19} weight="fill" />
              <span>
                <strong>{t(`demoProfile.evidence.${item}.title`)}</strong>
                <small>{t(`demoProfile.evidence.${item}.source`)}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="growth-card demo-profile-projects">
        <div className="growth-card__heading">
          <div>
            <h2>{t('demoProfile.projectsTitle')}</h2>
            <p>{t('demoProfile.projectsDescription')}</p>
          </div>
          <FolderOpen aria-hidden="true" size={22} />
        </div>
        <article>
          <CheckCircle aria-hidden="true" size={22} weight="fill" />
          <div>
            <h3>{t('demoProfile.projectName')}</h3>
            <p>{t('demoProfile.projectProof')}</p>
          </div>
        </article>
      </section>
      <section className="growth-card capability-profile__identity">
        <div className="growth-card__heading">
          <div>
            <p className="eyebrow">{t('demoProfile.journeyCompleted')}</p>
            <h2>{t('demoProfile.journey')}</h2>
          </div>
          <CheckCircle aria-hidden="true" size={22} />
        </div>
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
