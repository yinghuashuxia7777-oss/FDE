import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  IdentificationCard,
  ShieldCheck,
  Target,
  TrendUp,
  WarningCircle,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import type {
  CapabilityEvidenceRecord,
  CompletedChallengeProfile,
  SkillEvidenceProfile,
  MvpLeafEvidenceProfile,
} from '../../application/product';
import { StatusBadge, type FeedbackTone } from '../../components/ui';
import { useI18n } from '../../i18n';
import {
  EvidenceTimeline,
  type EvidenceSignal,
} from '../dashboard/DashboardVisuals';

interface CapabilityProfileViewProps {
  challenges: readonly CompletedChallengeProfile[];
  evidence: readonly CapabilityEvidenceRecord[];
  mvpLeafEvidence: readonly MvpLeafEvidenceProfile[];
  readiness: number | undefined;
  skills: readonly SkillEvidenceProfile[];
}

const masteryStatusKeys = {
  'Not started': 'product.common.mastery.notStarted',
  Weak: 'product.common.mastery.weak',
  Learning: 'product.common.mastery.learning',
  Competent: 'product.common.mastery.competent',
  Proficient: 'product.common.mastery.proficient',
} as const;

const skillRiskKeys = {
  critical: 'profile.skills.risk.critical',
  developing: 'profile.skills.risk.developing',
  limited: 'profile.skills.risk.limited',
  verified: 'profile.skills.risk.verified',
  'no-evidence': 'profile.skills.risk.no-evidence',
} as const;

function masteryTone(status: SkillEvidenceProfile['status']): FeedbackTone {
  if (status === 'Proficient' || status === 'Competent') return 'success';
  if (status === 'Learning') return 'info';
  if (status === 'Weak') return 'warning';
  return 'neutral';
}

function riskTone(risk: SkillEvidenceProfile['risk']): FeedbackTone {
  if (risk === 'critical') return 'danger';
  if (risk === 'developing') return 'warning';
  if (risk === 'limited') return 'info';
  if (risk === 'verified') return 'success';
  return 'neutral';
}

export function CapabilityProfileView({
  challenges,
  evidence,
  mvpLeafEvidence,
  readiness,
  skills,
}: CapabilityProfileViewProps) {
  const { language, t } = useI18n();
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
  });
  const skillById = new Map(skills.map((skill) => [skill.skillId, skill]));
  const strengths = skills.filter(({ isStrength }) => isStrength);
  const growthAreas = skills.filter(({ isGrowthArea }) => isGrowthArea);
  const hasSkillEvidence = skills.some(
    ({ criticalMistakeCount, latestEvidence, sampleCount }) =>
      sampleCount > 0 ||
      criticalMistakeCount > 0 ||
      latestEvidence !== undefined,
  );
  const latestEvidence = evidence[0];
  const roundedReadiness =
    readiness === undefined ? undefined : Math.round(readiness);
  const normalizedReadiness = Math.min(100, Math.max(0, readiness ?? 0));
  const meterStyle = {
    '--profile-readiness-angle': `${normalizedReadiness * 3.6}deg`,
  } as CSSProperties;

  const skillLabels = (skillIds: readonly string[]): string => {
    const labels = skillIds.map(
      (skillId) => skillById.get(skillId)?.label ?? skillId,
    );
    return labels.length === 0
      ? t('product.common.notAvailable')
      : labels.join(', ');
  };

  const timelineSignals: EvidenceSignal[] = evidence.map((record) => ({
    completedAt: dateFormatter.format(new Date(record.completedAt)),
    completedAtIso: record.completedAt,
    id: record.attemptId,
    score: record.score,
    title: record.title,
    tone: record.tone,
    to: `/debrief/${record.attemptId}`,
    verdict: t('profile.timeline.verdictWithSkills', {
      skills: skillLabels(record.skillIds),
      verdict: t(`product.common.verdict.${record.verdict}`),
    }),
  }));

  return (
    <div className="capability-profile">
      <div className="capability-profile__top-grid">
        <section
          className="growth-card capability-profile__identity"
          aria-label={t('profile.identity.label')}
        >
          <div className="capability-profile__identity-heading">
            <span className="capability-profile__icon" aria-hidden="true">
              <IdentificationCard size={24} weight="duotone" />
            </span>
            <div>
              <p>{t('profile.identity.kicker')}</p>
              <h2>{t('profile.identity.role')}</h2>
              <span>{t('profile.identity.statement')}</span>
            </div>
          </div>
          <div className="capability-profile__goal">
            <Target aria-hidden="true" size={19} weight="duotone" />
            <span>{t('profile.identity.goal')}</span>
            <strong>{t('profile.identity.goalValue')}</strong>
          </div>
          <dl className="capability-profile__identity-stats">
            <div>
              <dt>{t('profile.identity.evidence')}</dt>
              <dd>{evidence.length}</dd>
            </div>
            <div>
              <dt>{t('profile.identity.challenges')}</dt>
              <dd>{challenges.length}</dd>
            </div>
            <div>
              <dt>{t('profile.identity.lastActive')}</dt>
              <dd>
                {latestEvidence === undefined ? (
                  t('profile.identity.noActivity')
                ) : (
                  <time dateTime={latestEvidence.completedAt}>
                    {dateFormatter.format(new Date(latestEvidence.completedAt))}
                  </time>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="growth-card capability-profile__readiness"
          aria-label={t('profile.readiness.label')}
        >
          <div className="growth-card__heading">
            <div>
              <h2>{t('profile.readiness.title')}</h2>
              <p>{t('profile.readiness.description')}</p>
            </div>
            <TrendUp aria-hidden="true" size={22} weight="duotone" />
          </div>
          <div
            className="capability-profile__readiness-meter"
            aria-label={t('profile.readiness.meterLabel')}
            aria-live={readiness === undefined ? 'polite' : undefined}
            aria-valuemax={readiness === undefined ? undefined : 100}
            aria-valuemin={readiness === undefined ? undefined : 0}
            aria-valuenow={roundedReadiness}
            data-empty={readiness === undefined ? true : undefined}
            role={readiness === undefined ? 'status' : 'meter'}
            style={meterStyle}
          >
            <strong>
              {roundedReadiness === undefined
                ? t('product.common.notAvailable')
                : `${String(roundedReadiness)}%`}
            </strong>
            <span>
              {readiness === undefined
                ? t('profile.readiness.insufficient')
                : t('profile.readiness.ready')}
            </span>
          </div>
          <p className="capability-profile__readiness-basis">
            <ShieldCheck aria-hidden="true" size={17} weight="duotone" />
            {t('profile.readiness.basis')}
          </p>
        </section>
      </div>

      <section
        className="growth-card capability-profile__skills"
        aria-label={t('profile.mvpSkills.label')}
      >
        <div className="growth-card__heading">
          <div>
            <h2>{t('profile.mvpSkills.title')}</h2>
            <p>{t('profile.mvpSkills.description')}</p>
          </div>
          <Target aria-hidden="true" size={22} weight="duotone" />
        </div>
        {mvpLeafEvidence.length === 0 ? (
          <div className="capability-profile__empty">
            <p>{t('profile.mvpSkills.empty')}</p>
          </div>
        ) : (
          <div className="capability-profile__skill-grid">
            {mvpLeafEvidence.map((skill) => (
              <article
                className="capability-profile__skill-card"
                key={skill.skillId}
              >
                <div className="capability-profile__skill-heading">
                  <div>
                    <h3>{skill.label}</h3>
                  </div>
                  <div className="capability-profile__skill-score">
                    <span>{t('profile.skills.masteryScore')}</span>
                    <strong>
                      {skill.score === undefined
                        ? t('product.common.notAvailable')
                        : Math.round(skill.score)}
                    </strong>
                  </div>
                </div>
                <p>
                  {t('profile.mvpSkills.evidence', {
                    primary: skill.primaryEvidenceCount,
                    supporting: skill.supportingEvidenceCount,
                  })}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="growth-card capability-profile__skills"
        aria-label={t('profile.skills.label')}
      >
        <div className="growth-card__heading">
          <div>
            <h2>{t('profile.skills.title')}</h2>
            <p>{t('profile.skills.description')}</p>
          </div>
          <ShieldCheck aria-hidden="true" size={22} weight="duotone" />
        </div>
        {!hasSkillEvidence ? (
          <div className="capability-profile__empty">
            <p>{t('profile.skills.empty')}</p>
            <Link to="/cases">
              {t('profile.empty.action')}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        ) : (
          <div className="capability-profile__skill-grid">
            {skills.map((skill) => (
              <article
                className="capability-profile__skill-card"
                aria-label={skill.label}
                data-risk={skill.risk}
                key={skill.skillId}
              >
                <div className="capability-profile__skill-heading">
                  <div>
                    <h3>{skill.label}</h3>
                    {skill.description === '' ? null : (
                      <p>{skill.description}</p>
                    )}
                  </div>
                  <div className="capability-profile__skill-score">
                    <span>{t('profile.skills.masteryScore')}</span>
                    <strong>
                      {skill.score === undefined
                        ? t('product.common.notAvailable')
                        : `${String(Math.round(skill.score))}`}
                    </strong>
                  </div>
                </div>
                <div className="capability-profile__skill-badges">
                  <StatusBadge tone={masteryTone(skill.status)}>
                    {t(masteryStatusKeys[skill.status])}
                  </StatusBadge>
                  <StatusBadge tone={riskTone(skill.risk)}>
                    {t(skillRiskKeys[skill.risk])}
                  </StatusBadge>
                </div>
                <dl>
                  <div>
                    <dt>{t('profile.skills.level')}</dt>
                    <dd>{t(masteryStatusKeys[skill.status])}</dd>
                  </div>
                  <div>
                    <dt>{t('profile.skills.evidence')}</dt>
                    <dd>
                      {t(
                        skill.sampleCount === 1
                          ? 'profile.skills.sampleOne'
                          : 'profile.skills.samples',
                        { count: skill.sampleCount },
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('profile.skills.latest')}</dt>
                    <dd>
                      {skill.latestEvidence?.title ??
                        t('profile.skills.noLatest')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('profile.skills.strength')}</dt>
                    <dd>
                      {t(
                        skill.isStrength
                          ? 'profile.skills.strength.strong'
                          : skill.isGrowthArea
                            ? 'profile.skills.strength.developing'
                            : 'profile.skills.strength.unverified',
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('profile.skills.riskLabel')}</dt>
                    <dd>{t(skillRiskKeys[skill.risk])}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="capability-profile__signals-grid">
        <section
          className="growth-card capability-profile__signal-card"
          aria-label={t('profile.strengths.label')}
        >
          <div className="growth-card__heading">
            <div>
              <h2>{t('profile.strengths.title')}</h2>
              <p>{t('profile.strengths.description')}</p>
            </div>
            <CheckCircle aria-hidden="true" size={22} weight="duotone" />
          </div>
          {strengths.length === 0 ? (
            <p className="capability-profile__signal-empty">
              {t('profile.strengths.empty')}
            </p>
          ) : (
            <ul>
              {strengths.map((skill) => (
                <li key={skill.skillId}>
                  <CheckCircle aria-hidden="true" size={18} weight="fill" />
                  <span>
                    <strong>{skill.label}</strong>
                    <small>
                      {t('profile.strengths.score', {
                        score: Math.round(skill.score ?? 0),
                      })}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="growth-card capability-profile__signal-card capability-profile__signal-card--growth"
          aria-label={t('profile.growth.label')}
        >
          <div className="growth-card__heading">
            <div>
              <h2>{t('profile.growth.title')}</h2>
              <p>{t('profile.growth.description')}</p>
            </div>
            <WarningCircle aria-hidden="true" size={22} weight="duotone" />
          </div>
          {growthAreas.length === 0 ? (
            <p className="capability-profile__signal-empty">
              {t('profile.growth.empty')}
            </p>
          ) : (
            <ul>
              {growthAreas.map((skill) => (
                <li key={skill.skillId}>
                  <WarningCircle aria-hidden="true" size={18} weight="fill" />
                  <span>
                    <strong>{skill.label}</strong>
                    <small>
                      {skill.criticalMistakeCount > 0
                        ? t(
                            skill.criticalMistakeCount === 1
                              ? 'profile.growth.criticalOne'
                              : 'profile.growth.criticalMany',
                            { count: skill.criticalMistakeCount },
                          )
                        : t('profile.growth.score', {
                            score: Math.round(skill.score ?? 0),
                          })}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="capability-profile__evidence-grid">
        <EvidenceTimeline
          empty={t('profile.timeline.empty')}
          linkLabel={t('profile.timeline.browse')}
          linkTo="/cases"
          reviewLabel={t('profile.timeline.review')}
          scoreLabel={t('profile.timeline.score')}
          signals={timelineSignals}
          title={t('profile.timeline.title')}
        />

        <section
          className="growth-card capability-profile__challenges"
          aria-label={t('profile.challenges.label')}
        >
          <div className="growth-card__heading">
            <div>
              <h2>{t('profile.challenges.title')}</h2>
              <p>{t('profile.challenges.description')}</p>
            </div>
            <ClockCounterClockwise
              aria-hidden="true"
              size={22}
              weight="duotone"
            />
          </div>
          {challenges.length === 0 ? (
            <div className="capability-profile__empty">
              <p>{t('profile.challenges.empty')}</p>
              <Link to="/cases">
                {t('profile.empty.action')}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          ) : (
            <ul>
              {challenges.map((challenge) => (
                <li key={challenge.caseId}>
                  <div className="capability-profile__challenge-heading">
                    <div>
                      <h3>{challenge.title}</h3>
                      <p>{skillLabels(challenge.skillIds)}</p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>{t('profile.challenges.difficulty')}</dt>
                      <dd>{t(`product.common.level.${challenge.level}`)}</dd>
                    </div>
                    <div>
                      <dt>{t('profile.challenges.score')}</dt>
                      <dd>{Math.round(challenge.score)}</dd>
                    </div>
                    <div>
                      <dt>{t('profile.challenges.completed')}</dt>
                      <dd>
                        <time dateTime={challenge.completedAt}>
                          {dateFormatter.format(
                            new Date(challenge.completedAt),
                          )}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>{t('profile.challenges.skills')}</dt>
                      <dd>{skillLabels(challenge.skillIds)}</dd>
                    </div>
                  </dl>
                  <Link to={`/debrief/${challenge.attemptId}`}>
                    {t('profile.timeline.review')}
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
