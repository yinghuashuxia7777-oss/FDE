import { useState } from 'react';
import { Link } from 'react-router-dom';

import { fdeDeliveryStore } from '../../application/delivery/fde-delivery-sidecar';
import {
  bundledFdeDeliverySource,
  type FdeDeliverySource,
} from '../../content/fde-delivery-source';
import type {
  DeliveryStageId,
  FdeDeliveryRecord,
  FdeDeliveryStore,
} from '../../domain/delivery/types';
import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';
import { DeliveryEnglishUnavailablePage } from './DeliveryEnglishUnavailablePage';

interface DeliveryWorkspacePageProps {
  templateId: string;
  deliverySource?: FdeDeliverySource;
  deliveryStore?: FdeDeliveryStore;
}

export function DeliveryWorkspacePage({
  templateId,
  deliverySource = bundledFdeDeliverySource,
  deliveryStore = fdeDeliveryStore,
}: DeliveryWorkspacePageProps) {
  const { language } = useI18n();
  if (language === 'en-US') return <DeliveryEnglishUnavailablePage />;

  const template = deliverySource.findById(templateId);
  if (template === undefined) return <DeliveryMissingTemplate />;

  return (
    <ChineseDeliveryWorkspacePage
      deliveryStore={deliveryStore}
      template={template}
    />
  );
}

function DeliveryMissingTemplate() {
  const { t } = useI18n();

  return (
    <section
      className="product-page delivery-page delivery-page--missing"
      aria-labelledby="page-title"
    >
      <PageHeader
        eyebrow={t('delivery.workspace.eyebrow')}
        title={t('delivery.missing.title')}
        description={t('delivery.missing.description')}
      />
      <Link className="button button--primary" to="/delivery">
        {t('delivery.missing.action')}
      </Link>
    </section>
  );
}

function ChineseDeliveryWorkspacePage({
  deliveryStore,
  template,
}: {
  deliveryStore: FdeDeliveryStore;
  template: NonNullable<ReturnType<FdeDeliverySource['findById']>>;
}) {
  const { t } = useI18n();
  const [record, setRecord] = useState<FdeDeliveryRecord>(() =>
    deliveryStore.load(template.id),
  );

  const persist = (nextRecord: FdeDeliveryRecord) => {
    setRecord(nextRecord);
    deliveryStore.save(nextRecord);
  };

  const updateArtifact = (stageId: DeliveryStageId, value: string) => {
    persist({
      ...record,
      artifacts: { ...record.artifacts, [stageId]: value },
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleStage = (stageId: DeliveryStageId) => {
    const isComplete = record.completedStageIds.includes(stageId);
    persist({
      ...record,
      completedStageIds: isComplete
        ? record.completedStageIds.filter((id) => id !== stageId)
        : [...record.completedStageIds, stageId],
      updatedAt: new Date().toISOString(),
    });
  };

  const reset = () => {
    if (!window.confirm(t('delivery.reset.confirm'))) return;
    deliveryStore.reset(template.id);
    setRecord(deliveryStore.load(template.id));
  };

  return (
    <section
      className="product-page delivery-page delivery-workspace"
      aria-labelledby="page-title"
    >
      <PageHeader
        eyebrow={t('delivery.workspace.eyebrow')}
        title={template.title}
        description={template.summary}
      />
      <div className="section-heading delivery-workspace__controls">
        <div>
          <p>{t('delivery.localNotice')}</p>
          <p>{t('delivery.completionBoundary')}</p>
          <strong>
            {t('delivery.progress', {
              completed: record.completedStageIds.length,
              total: template.stages.length,
            })}
          </strong>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={reset}
        >
          {t('delivery.reset.action')}
        </button>
      </div>

      <nav
        className="panel delivery-stage-rail"
        aria-label={t('delivery.stageRail.label')}
      >
        <ol>
          {template.stages.map((stage, index) => (
            <li key={stage.id}>
              <Link to={{ hash: `delivery-stage-${stage.id}` }}>
                {t('delivery.stageRail.item', {
                  number: index + 1,
                  title: stage.title,
                })}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="product-stack delivery-artifacts">
        {template.stages.map((stage, index) => {
          const isComplete = record.completedStageIds.includes(stage.id);
          return (
            <article
              className="panel product-stack delivery-stage"
              data-complete={isComplete || undefined}
              data-testid="delivery-stage"
              id={`delivery-stage-${stage.id}`}
              key={stage.id}
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {t('delivery.stage.label', { number: index + 1 })}
                  </p>
                  <h2>{stage.title}</h2>
                </div>
                <span>
                  {t(
                    isComplete
                      ? 'delivery.stage.completed'
                      : 'delivery.stage.incomplete',
                  )}
                </span>
              </div>
              <section>
                <h3>{t('delivery.stage.prompt')}</h3>
                <p>{stage.prompt}</p>
              </section>
              <section>
                <h3>{t('delivery.stage.proof')}</h3>
                <p>{stage.whatThisProves}</p>
              </section>
              <label htmlFor={`delivery-artifact-${stage.id}`}>
                <strong>{stage.artifactLabel}</strong>
              </label>
              <textarea
                id={`delivery-artifact-${stage.id}`}
                onChange={(event) =>
                  updateArtifact(stage.id, event.target.value)
                }
                placeholder={t('delivery.artifact.placeholder')}
                rows={8}
                value={record.artifacts[stage.id] ?? ''}
              />
              <button
                aria-label={t(
                  isComplete
                    ? 'delivery.stage.markIncomplete'
                    : 'delivery.stage.markComplete',
                  { title: stage.title },
                )}
                aria-pressed={isComplete}
                className="button button--secondary"
                onClick={() => toggleStage(stage.id)}
                type="button"
              >
                {t(
                  isComplete
                    ? 'delivery.stage.markIncomplete'
                    : 'delivery.stage.markComplete',
                  { title: stage.title },
                )}
              </button>
              <section aria-label={t('delivery.related.label')}>
                <h3>{t('delivery.related.title')}</h3>
                <ul className="foundation-related-list">
                  {stage.relatedLinks.map((link) => (
                    <li key={`${link.kind}:${link.href}`}>
                      <Link to={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          );
        })}
      </div>

      <p className="panel delivery-attribution">
        {t('delivery.attribution.prefix')}{' '}
        <a href={template.attributionUrl} rel="noreferrer" target="_blank">
          {t('delivery.attribution.link')}
        </a>
      </p>
      <Link className="button button--ghost" to="/delivery">
        {t('delivery.workspace.back')}
      </Link>
    </section>
  );
}
