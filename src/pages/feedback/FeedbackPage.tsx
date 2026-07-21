import {
  CheckCircle,
  ChatCircleText,
  DownloadSimple,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import {
  feedbackStore,
  serializeFeedbackExport,
  type FeedbackCategory,
} from '../../application/practice/beta-sidecar';
import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';

export function FeedbackPage() {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const messageValue = form.get('message');
    const message = typeof messageValue === 'string' ? messageValue.trim() : '';
    if (message === '') return;
    const categoryValue = form.get('category');
    const category =
      typeof categoryValue === 'string'
        ? (categoryValue as FeedbackCategory)
        : 'product-feedback';
    feedbackStore.write([
      {
        id: `feedback:${Date.now().toString()}`,
        category,
        message,
        contextPath: window.location.hash.replace(/^#/, '') || '/',
        createdAt: new Date().toISOString(),
      },
      ...feedbackStore.read(),
    ]);
    event.currentTarget.reset();
    setSaved(true);
  };
  const exportFeedback = () => {
    const exportedAt = new Date().toISOString();
    const blob = new Blob(
      [serializeFeedbackExport(feedbackStore.read(), exportedAt)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href = url;
    download.download = `ai-growth-os-feedback-${exportedAt.slice(0, 10)}.json`;
    download.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="product-page beta-detail" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('feedback.eyebrow')}
        title={t('feedback.title')}
        description={t('feedback.description')}
      />
      <article className="growth-card beta-action-card">
        <div className="growth-card__heading">
          <h2>{t('feedback.prompt')}</h2>
          <ChatCircleText aria-hidden="true" size={22} />
        </div>
        <form onSubmit={submit}>
          <label htmlFor="feedback-category">{t('feedback.category')}</label>
          <select id="feedback-category" name="category">
            <option value="product-feedback">
              {t('feedback.category.product')}
            </option>
            <option value="content-issue">
              {t('feedback.category.content')}
            </option>
            <option value="difficulty">
              {t('feedback.category.difficulty')}
            </option>
          </select>
          <label htmlFor="feedback-message">{t('feedback.message')}</label>
          <textarea id="feedback-message" name="message" required rows={6} />
          <div className="button-row">
            <button className="button button--primary" type="submit">
              {t('feedback.submit')}
            </button>
            <button
              className="button button--secondary"
              onClick={exportFeedback}
              type="button"
            >
              <DownloadSimple aria-hidden="true" size={18} />
              {t('feedback.export')}
            </button>
          </div>
        </form>
        {saved ? (
          <p role="status">
            <CheckCircle aria-hidden="true" size={18} /> {t('feedback.saved')}
          </p>
        ) : null}
      </article>
    </section>
  );
}
