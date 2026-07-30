import { useI18n } from '../../i18n';

export function DeliveryEnglishUnavailablePage() {
  const { t } = useI18n();

  return (
    <section
      className="product-page delivery-page delivery-page--unavailable"
      aria-labelledby="page-title"
    >
      <h1 id="page-title" tabIndex={-1}>
        {t('delivery.unavailable')}
      </h1>
    </section>
  );
}
