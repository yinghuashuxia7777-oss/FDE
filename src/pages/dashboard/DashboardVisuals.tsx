import {
  ArrowRight,
  ArrowsOutSimple,
  BookOpenText,
  Brain,
  CheckCircle,
  Cloud,
  Code,
  Database,
  Flask,
  Network,
  Pulse,
  Robot,
  ShieldCheck,
  Target,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import type { CapabilitySignal } from './capability-map-data';

export interface ChallengeSignal {
  completed: boolean;
  difficulty: string;
  estimatedTime: string;
  id: string;
  reason: string;
  skills: string;
  title: string;
  to: string;
}

export interface EvidenceSignal {
  completedAt: string;
  completedAtIso: string;
  id: string;
  score: number;
  title: string;
  tone: 'positive' | 'warning' | 'negative';
  to: string;
  verdict: string;
}

export interface GrowthMissionStep {
  label: string;
  title: string;
  to: string;
  type: 'learn' | 'practice' | 'challenge' | 'evidence';
}

interface GrowthMissionCardProps {
  actionLabel: string;
  actionTo: string;
  complete: boolean;
  completeDescription: string;
  completeTitle: string;
  description: string;
  label: string;
  steps: readonly GrowthMissionStep[];
  title: string;
}

export function GrowthMissionCard({
  actionLabel,
  actionTo,
  complete,
  completeDescription,
  completeTitle,
  description,
  label,
  steps,
  title,
}: GrowthMissionCardProps) {
  const icon = (type: GrowthMissionStep['type']) => {
    if (type === 'learn') return <BookOpenText aria-hidden="true" size={22} />;
    if (type === 'practice') return <Flask aria-hidden="true" size={22} />;
    if (type === 'challenge') return <Target aria-hidden="true" size={22} />;
    return <ShieldCheck aria-hidden="true" size={22} />;
  };
  return (
    <section className="growth-card growth-mission" aria-label={label}>
      <div className="growth-mission__heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2>{complete ? completeTitle : title}</h2>
          <p>{complete ? completeDescription : description}</p>
        </div>
        <span className="growth-mission__day">
          {complete ? <CheckCircle aria-hidden="true" size={28} /> : '01'}
        </span>
      </div>
      {complete ? null : (
        <>
          <ol className="growth-mission__steps">
            {steps.map((step) => (
              <li key={step.type}>
                <Link to={step.to}>
                  <span className="growth-mission__icon">
                    {icon(step.type)}
                  </span>
                  <span>
                    <small>{step.label}</small>
                    <strong>{step.title}</strong>
                  </span>
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </li>
            ))}
          </ol>
          <div className="growth-mission__action">
            <Link className="button button--primary" to={actionTo}>
              {actionLabel}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

interface JourneyCardProps {
  actionLabel?: string;
  actionTo?: string;
  description: string;
  label: string;
  steps: readonly { label: string; to: string }[];
  title: string;
}

export function JourneyCard({
  actionLabel,
  actionTo,
  description,
  label,
  steps,
  title,
}: JourneyCardProps) {
  return (
    <section className="growth-journey" aria-label={label}>
      <h2 aria-label={title.replace(/\s+/g, ' ')}>{title}</h2>
      <p className="growth-journey__description">{description}</p>
      {actionLabel === undefined ? null : (
        <Link
          className="button button--secondary"
          to={actionTo ?? steps[0]?.to ?? '/foundation'}
        >
          {actionLabel}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
      <ol className="growth-journey__steps">
        {steps.map((step, index) => (
          <li key={step.to}>
            <span>{index + 1}</span>
            <Link to={step.to}>{step.label}</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface ReadinessCardProps {
  evidenceBasis: string;
  evidenceCurrent: number;
  evidenceGoal: number;
  evidenceProgressLabel: string;
  gaps: readonly string[];
  gapsLabel: string;
  insufficientLabel: string;
  label: string;
  readiness: number | undefined;
  reportLabel: string;
  reportTo: string;
  stage: string;
  stageLabel: string;
  strengths: readonly string[];
  strengthsLabel: string;
  target: string;
  targetLabel: string;
  title: string;
}

export function ReadinessCard({
  evidenceBasis,
  evidenceCurrent,
  evidenceGoal,
  evidenceProgressLabel,
  gaps,
  gapsLabel,
  insufficientLabel,
  label,
  readiness,
  reportLabel,
  reportTo,
  stage,
  stageLabel,
  strengths,
  strengthsLabel,
  target,
  targetLabel,
  title,
}: ReadinessCardProps) {
  const normalizedReadiness = Math.max(0, Math.min(100, readiness ?? 0));
  const meterStyle = {
    '--readiness-angle': `${normalizedReadiness * 3.6}deg`,
  } as CSSProperties;

  return (
    <section className="growth-card growth-readiness" aria-label={label}>
      <div className="growth-readiness__summary">
        <div
          className="growth-readiness__meter"
          aria-label={title}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={
            readiness === undefined ? undefined : Math.round(readiness)
          }
          data-empty={readiness === undefined ? true : undefined}
          role="meter"
          style={meterStyle}
        >
          <strong className="dashboard-metric-value">
            {readiness === undefined
              ? insufficientLabel
              : `${Math.round(readiness)}%`}
          </strong>
          <span>{title}</span>
        </div>
        <dl>
          <div>
            <dt>{targetLabel}</dt>
            <dd>{target}</dd>
          </div>
          <div>
            <dt>{stageLabel}</dt>
            <dd className="growth-readiness__stage">{stage}</dd>
          </div>
          <div>
            <dt>{evidenceBasis}</dt>
            <dd className="dashboard-metric-value">
              {evidenceCurrent} / {evidenceGoal}
            </dd>
          </div>
        </dl>
      </div>

      <progress
        className="sr-only"
        aria-label={evidenceProgressLabel}
        max={evidenceGoal}
        value={Math.min(evidenceCurrent, evidenceGoal)}
      />

      <div className="growth-readiness__signals">
        <div>
          <span>{strengthsLabel}</span>
          {strengths.length === 0 ? (
            <p>{insufficientLabel}</p>
          ) : (
            <ul>
              {strengths.map((strength) => (
                <li key={strength}>
                  <CheckCircle aria-hidden="true" size={16} weight="fill" />
                  {strength}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <span>{gapsLabel}</span>
          {gaps.length === 0 ? (
            <p>{insufficientLabel}</p>
          ) : (
            <ul>
              {gaps.map((gap) => (
                <li key={gap}>
                  <WarningCircle aria-hidden="true" size={16} weight="fill" />
                  {gap}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Link className="growth-readiness__report" to={reportTo}>
        {reportLabel}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </section>
  );
}

export interface CapabilityLegendItem {
  label: string;
  mastery: CapabilitySignal['mastery'];
}

interface CapabilityMapCardProps {
  badgeLabel?: string | undefined;
  confidenceLabel: string;
  coreEvidence: string;
  coreLabel: string;
  levelLabel: string;
  legendItems: readonly CapabilityLegendItem[];
  linkLabel: string;
  signals: readonly CapabilitySignal[];
  sourceLabel: string;
  title: string;
  viewLabel: string;
}

const capabilityMasteryRank: Record<CapabilitySignal['mastery'], number> = {
  'not-started': 0,
  learning: 1,
  competent: 2,
  proficient: 3,
};

interface CapabilityPresentationSnapshot {
  masteryBySkill: ReadonlyMap<string, CapabilitySignal['mastery']>;
  showcase: boolean;
}

const capabilityEvolutionDurationMs = 1500;

function clearCapabilityEvolution(root: HTMLDivElement | null): void {
  root
    ?.querySelectorAll<HTMLElement>('[data-evolving]')
    .forEach((element) => element.removeAttribute('data-evolving'));
}

export function CapabilityMapCard({
  badgeLabel,
  confidenceLabel,
  coreEvidence,
  coreLabel,
  levelLabel,
  legendItems,
  linkLabel,
  signals,
  sourceLabel,
  title,
  viewLabel,
}: CapabilityMapCardProps) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const evolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSnapshotRef = useRef<CapabilityPresentationSnapshot | null>(
    null,
  );
  const showcase = badgeLabel !== undefined;

  useEffect(() => {
    const currentSnapshot: CapabilityPresentationSnapshot = {
      masteryBySkill: new Map(
        signals.map(({ mastery, skillId }) => [skillId, mastery]),
      ),
      showcase,
    };
    const previousSnapshot = previousSnapshotRef.current;
    previousSnapshotRef.current = currentSnapshot;

    if (previousSnapshot === null) {
      return;
    }

    if (showcase) {
      if (evolutionTimerRef.current !== null) {
        clearTimeout(evolutionTimerRef.current);
        evolutionTimerRef.current = null;
      }
      clearCapabilityEvolution(orbitRef.current);
      return;
    }

    const evolvingSkillIds = signals
      .filter(({ mastery, skillId }) => {
        if (previousSnapshot.showcase) {
          return mastery !== 'not-started';
        }
        const previousMastery = previousSnapshot.masteryBySkill.get(skillId);
        return (
          previousMastery !== undefined &&
          capabilityMasteryRank[mastery] >
            capabilityMasteryRank[previousMastery]
        );
      })
      .map(({ skillId }) => skillId);

    if (evolvingSkillIds.length === 0 || orbitRef.current === null) {
      return;
    }

    if (evolutionTimerRef.current !== null) {
      clearTimeout(evolutionTimerRef.current);
    }
    clearCapabilityEvolution(orbitRef.current);

    const evolvingSkills = new Set(evolvingSkillIds);
    orbitRef.current
      .querySelectorAll<HTMLElement>('[data-skill-id]')
      .forEach((node) => {
        if (
          node.dataset.skillId !== undefined &&
          evolvingSkills.has(node.dataset.skillId)
        ) {
          node.setAttribute('data-evolving', 'true');
        }
      });
    orbitRef.current
      .querySelector<HTMLElement>('.capability-orbit__core')
      ?.setAttribute('data-evolving', 'true');

    evolutionTimerRef.current = setTimeout(() => {
      clearCapabilityEvolution(orbitRef.current);
      evolutionTimerRef.current = null;
    }, capabilityEvolutionDurationMs);
  }, [showcase, signals]);

  useEffect(
    () => () => {
      if (evolutionTimerRef.current !== null) {
        clearTimeout(evolutionTimerRef.current);
      }
      clearCapabilityEvolution(orbitRef.current);
    },
    [],
  );

  return (
    <figure
      className="growth-card capability-map"
      aria-label={title}
      data-showcase={badgeLabel === undefined ? undefined : 'true'}
    >
      <div className="growth-card__heading">
        <div>
          <div className="capability-map__title">
            <h2>{title}</h2>
            {badgeLabel === undefined ? null : (
              <span className="capability-map__badge">{badgeLabel}</span>
            )}
          </div>
          <p className="capability-map__source">{sourceLabel}</p>
        </div>
        <div className="capability-map__actions">
          <span className="capability-map__view">{viewLabel}</span>
          <Link
            aria-label={linkLabel}
            className="capability-map__expand"
            to="/skills"
          >
            <ArrowsOutSimple aria-hidden="true" size={17} />
          </Link>
        </div>
      </div>

      <div className="capability-orbit" ref={orbitRef}>
        <span
          className="capability-orbit__ring capability-orbit__ring--one"
          aria-hidden="true"
        />
        <span
          className="capability-orbit__ring capability-orbit__ring--two"
          aria-hidden="true"
        />
        <span
          className="capability-orbit__ring capability-orbit__ring--three"
          aria-hidden="true"
        />
        <div className="capability-orbit__core">
          <span
            className="capability-orbit__core-feedback"
            aria-hidden="true"
          />
          <span className="capability-orbit__core-content">
            <span className="capability-orbit__core-icon" aria-hidden="true">
              <Code size={30} weight="bold" />
            </span>
            <strong>{coreLabel}</strong>
            <small>{coreEvidence}</small>
          </span>
        </div>
        {signals.map((signal, index) => (
          <article
            className="capability-node"
            data-orbit-index={index}
            data-mastery={signal.mastery}
            data-skill-id={signal.skillId}
            key={signal.skillId}
            title={signal.sourceLabel}
          >
            <div className="capability-node__surface">
              <span className="capability-node__glyph" aria-hidden="true">
                <CapabilityGlyph skillId={signal.skillId} />
              </span>
              <div className="capability-node__copy">
                <strong>{signal.label}</strong>
                <span>
                  {signal.score === undefined
                    ? signal.statusLabel
                    : `${levelLabel} ${signal.level} · ${signal.statusLabel}`}
                </span>
                <small>
                  {signal.score === undefined
                    ? signal.evidence
                    : `${confidenceLabel} ${signal.confidence} · ${signal.evidence}`}
                </small>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="capability-map__legend">
        {legendItems.map((item) => (
          <span data-mastery={item.mastery} key={item.mastery}>
            <i aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

function CapabilityGlyph({ skillId }: { skillId: string }) {
  if (skillId === 'llm.applications') {
    return <Brain size={21} weight="duotone" />;
  }
  if (skillId === 'agents.evaluation') {
    return <Robot size={21} weight="duotone" />;
  }
  if (skillId === 'rag.search') {
    return <Database size={21} weight="duotone" />;
  }
  if (skillId === 'software.foundations') {
    return <Code size={21} weight="duotone" />;
  }
  if (skillId === 'cloud.deployment') {
    return <Cloud size={21} weight="duotone" />;
  }
  if (skillId === 'systems.networking') {
    return <Network size={21} weight="duotone" />;
  }
  return <Pulse size={21} weight="duotone" />;
}

interface MentorCardProps {
  actionLabel: string;
  actionTo: string;
  actionVariant?: 'primary' | 'secondary';
  diagnosis: string;
  gapLabel: string;
  gapSkill: string;
  label: string;
  recommendation: string;
  recommendationLabel: string;
  sourceLabel: string;
}

export function MentorCard({
  actionLabel,
  actionTo,
  actionVariant = 'primary',
  diagnosis,
  gapLabel,
  gapSkill,
  label,
  recommendation,
  recommendationLabel,
  sourceLabel,
}: MentorCardProps) {
  return (
    <aside className="growth-card mentor-card" aria-label={label}>
      <div className="growth-card__heading">
        <h2>{label}</h2>
        <span className="mentor-card__source">{sourceLabel}</span>
      </div>
      <div className="mentor-card__insight">
        <p className="mentor-card__diagnosis">{diagnosis}</p>
        <dl className="mentor-card__facts">
          <div>
            <dt>{gapLabel}</dt>
            <dd>{gapSkill}</dd>
          </div>
          <div>
            <dt>{recommendationLabel}</dt>
            <dd>{recommendation}</dd>
          </div>
        </dl>
      </div>
      <Link
        className={`button button--${actionVariant} mentor-card__action`}
        to={actionTo}
      >
        <Target aria-hidden="true" size={18} weight="fill" />
        {actionLabel}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </aside>
  );
}

interface ChallengeCardProps {
  actionLabel: string;
  completedLabel: string;
  description: string;
  difficultyLabel: string;
  emptyActionLabel: string;
  emptyDescription: string;
  emptyTo: string;
  estimatedTimeLabel: string;
  primary: ChallengeSignal | undefined;
  browseLabel: string;
  browseTo: string;
  secondaryLabel: string;
  secondary: readonly ChallengeSignal[];
  skillsLabel: string;
  title: string;
}

export function ChallengeCard({
  actionLabel,
  completedLabel,
  description,
  difficultyLabel,
  emptyActionLabel,
  emptyDescription,
  emptyTo,
  estimatedTimeLabel,
  primary,
  browseLabel,
  browseTo,
  secondaryLabel,
  secondary,
  skillsLabel,
  title,
}: ChallengeCardProps) {
  return (
    <section className="growth-card challenge-card" aria-label={title}>
      <div className="growth-card__heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Link className="growth-card__text-link" to={browseTo}>
          {browseLabel}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>

      {primary === undefined ? (
        <div className="challenge-card__empty">
          <p>{emptyDescription}</p>
          <Link className="button button--secondary" to={emptyTo}>
            {emptyActionLabel}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      ) : (
        <>
          <div className="challenge-card__primary">
            <div>
              <span className="challenge-card__status">
                {primary.completed ? completedLabel : primary.reason}
              </span>
              <h3>{primary.title}</h3>
              <dl>
                <div>
                  <dt>{difficultyLabel}</dt>
                  <dd>{primary.difficulty}</dd>
                </div>
                <div>
                  <dt>{estimatedTimeLabel}</dt>
                  <dd>{primary.estimatedTime}</dd>
                </div>
                <div>
                  <dt>{skillsLabel}</dt>
                  <dd>{primary.skills}</dd>
                </div>
              </dl>
            </div>
            <Link className="button button--secondary" to={primary.to}>
              {actionLabel}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>

          {secondary.length === 0 ? null : (
            <div className="challenge-card__secondary">
              <h3>{secondaryLabel}</h3>
              <ul>
                {secondary.map((item) => (
                  <li key={item.id}>
                    <Link to={item.to}>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.skills}</small>
                      </span>
                      <ArrowRight aria-hidden="true" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface EvidenceTimelineProps {
  empty: string;
  linkLabel: string;
  linkTo: string;
  reviewLabel: string;
  scoreLabel: string;
  signals: readonly EvidenceSignal[];
  title: string;
}

export function EvidenceTimeline({
  empty,
  linkLabel,
  linkTo,
  reviewLabel,
  scoreLabel,
  signals,
  title,
}: EvidenceTimelineProps) {
  return (
    <section className="growth-card evidence-timeline" aria-label={title}>
      <div className="growth-card__heading">
        <h2>{title}</h2>
        <Link className="growth-card__text-link" to={linkTo}>
          {linkLabel}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
      {signals.length === 0 ? (
        <p className="evidence-timeline__empty">{empty}</p>
      ) : (
        <ol>
          {signals.map((signal) => (
            <li key={signal.id}>
              <span
                className="evidence-timeline__marker"
                data-tone={signal.tone}
                aria-hidden="true"
              >
                {signal.tone === 'positive' ? (
                  <CheckCircle size={17} weight="fill" />
                ) : signal.tone === 'warning' ? (
                  <WarningCircle size={17} weight="fill" />
                ) : (
                  <XCircle size={17} weight="fill" />
                )}
              </span>
              <div>
                <strong>{signal.title}</strong>
                <span>
                  {signal.verdict} · {scoreLabel} {Math.round(signal.score)}
                </span>
                <time dateTime={signal.completedAtIso}>
                  {signal.completedAt}
                </time>
              </div>
              <Link to={signal.to}>{reviewLabel}</Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
