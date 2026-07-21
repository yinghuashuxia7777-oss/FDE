import { ArrowRight, ShieldCheck } from '@phosphor-icons/react';

import { useI18n } from '../../i18n';
import type { CapabilitySignal } from './capability-map-data';
import { CapabilityMapCard, type GrowthMissionStep } from './DashboardVisuals';

interface FirstLoopPreviewProps {
  previewSkillId: string | undefined;
  signals: readonly CapabilitySignal[];
  steps: readonly GrowthMissionStep[];
}

export function FirstLoopPreview({
  previewSkillId,
  signals,
  steps,
}: FirstLoopPreviewProps) {
  const { t } = useI18n();
  const previewSignal = signals.find(
    ({ skillId }) => skillId === previewSkillId,
  );
  const previewSignals = signals.map((signal) =>
    signal.skillId === previewSkillId
      ? {
          ...signal,
          evidence: t('dashboard.firstLoopPreview.pendingEvidence', {
            skill: signal.label,
          }),
          statusLabel: t('dashboard.firstLoopPreview.pendingStatus'),
        }
      : signal,
  );

  return (
    <section
      className="first-loop-preview"
      aria-labelledby="first-loop-preview-title"
    >
      <header className="first-loop-preview__hero">
        <div className="first-loop-preview__intro">
          <p className="eyebrow">{t('dashboard.firstLoopPreview.label')}</p>
          <h2 id="first-loop-preview-title">
            {t('dashboard.firstLoopPreview.title')}
          </h2>
          <p>{t('dashboard.firstLoopPreview.description')}</p>
        </div>
        <div
          className="first-loop-preview__result"
          aria-label={t('dashboard.firstLoopPreview.resultLabel')}
        >
          <span aria-hidden="true">+1</span>
          <strong>{t('dashboard.firstLoopPreview.resultLabel')}</strong>
          <small>
            {previewSignal?.label ??
              t('dashboard.firstLoopPreview.resultFallback')}
          </small>
        </div>
      </header>

      <div className="first-loop-preview__stack">
        <section
          className="first-loop-preview__workflow"
          aria-labelledby="first-loop-workflow-title"
        >
          <p className="eyebrow" id="first-loop-workflow-title">
            {t('dashboard.firstLoopPreview.workflowLabel')}
          </p>
          <ol>
            {steps.map((step, index) => (
              <li key={step.type}>
                <span className="first-loop-preview__step-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="first-loop-preview__step-copy">
                  <small>{step.label}</small>
                  <strong>{step.title}</strong>
                </span>
                {index === steps.length - 1 ? (
                  <ShieldCheck aria-hidden="true" size={20} />
                ) : (
                  <ArrowRight aria-hidden="true" size={18} />
                )}
              </li>
            ))}
          </ol>
        </section>

        <div className="first-loop-preview__map-layer">
          <CapabilityMapCard
            confidenceLabel={t('dashboard.capability.confidence')}
            coreEvidence={t('dashboard.firstLoopPreview.coreEvidence')}
            coreLabel={t('dashboard.capability.core')}
            levelLabel={t('dashboard.capability.level')}
            legendItems={[
              {
                label: t('dashboard.firstLoopPreview.legendPending'),
                mastery: 'learning',
              },
              {
                label: t('dashboard.capability.status.notVerified'),
                mastery: 'not-started',
              },
            ]}
            linkLabel={t('dashboard.capability.openGraph')}
            previewSkillId={previewSkillId}
            signals={previewSignals}
            sourceLabel={t('dashboard.firstLoopPreview.mapSource')}
            title={t('dashboard.firstLoopPreview.mapTitle')}
            viewLabel={t('dashboard.firstLoopPreview.viewLabel')}
          />
        </div>
      </div>

      <p className="first-loop-preview__note">
        {t('dashboard.firstLoopPreview.note')}
      </p>
    </section>
  );
}
