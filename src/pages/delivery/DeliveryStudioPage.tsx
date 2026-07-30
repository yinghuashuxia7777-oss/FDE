import { Link } from 'react-router-dom';

import { fdeDeliveryStore } from '../../application/delivery/fde-delivery-sidecar';
import {
  bundledFdeDeliverySource,
  type FdeDeliverySource,
} from '../../content/fde-delivery-source';
import type { FdeDeliveryStore } from '../../domain/delivery/types';
import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';
import { DeliveryEnglishUnavailablePage } from './DeliveryEnglishUnavailablePage';

interface DeliveryStudioPageProps {
  deliverySource?: FdeDeliverySource;
  deliveryStore?: FdeDeliveryStore;
}

export function DeliveryStudioPage({
  deliverySource = bundledFdeDeliverySource,
  deliveryStore = fdeDeliveryStore,
}: DeliveryStudioPageProps) {
  const { language } = useI18n();
  if (language === 'en-US') return <DeliveryEnglishUnavailablePage />;

  return (
    <ChineseDeliveryStudioPage
      deliverySource={deliverySource}
      deliveryStore={deliveryStore}
    />
  );
}

function ChineseDeliveryStudioPage({
  deliverySource,
  deliveryStore,
}: Required<DeliveryStudioPageProps>) {
  const { t } = useI18n();
  const templates = deliverySource.loadAll();

  return (
    <section
      className="product-page delivery-page delivery-studio"
      aria-labelledby="page-title"
    >
      <PageHeader
        eyebrow={t('delivery.studio.eyebrow')}
        title={t('delivery.studio.title')}
        description={t('delivery.studio.description')}
      />
      <p className="panel delivery-local-notice">{t('delivery.localNotice')}</p>
      <div className="beta-card-grid delivery-template-grid">
        {templates.map((template) => {
          const record = deliveryStore.load(template.id);
          return (
            <article
              className="growth-card beta-content-card delivery-template"
              data-testid="delivery-template"
              key={template.id}
            >
              <h2>{template.title}</h2>
              <p>{template.summary}</p>
              <p>
                {t('delivery.progress', {
                  completed: record.completedStageIds.length,
                  total: template.stages.length,
                })}
              </p>
              <ol className="delivery-template__stages">
                {template.stages.map((stage) => (
                  <li
                    data-complete={
                      record.completedStageIds.includes(stage.id) || undefined
                    }
                    key={stage.id}
                  >
                    {stage.title}
                  </li>
                ))}
              </ol>
              <Link to={`/delivery/${template.id}`}>
                {t('delivery.studio.open', { title: template.title })}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
