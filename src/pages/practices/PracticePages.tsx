import {
  ArrowRight,
  CheckCircle,
  Flask,
  WarningCircle,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  evaluatePracticeResponse,
  usePracticeEvidence,
} from '../../application/practice';
import { mvpLeafSkills } from '../../content/mvp-capability-content';
import {
  findMvpPractice,
  findMvpPracticeRule,
  mvpPractices,
} from '../../content/mvp-practice-source';
import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';

const skillNames = new Map(mvpLeafSkills.map(({ id, name }) => [id, name]));

export function PracticeListPage() {
  const { t } = useI18n();
  const { evidence } = usePracticeEvidence();
  const completed = new Set(evidence.map(({ practiceId }) => practiceId));
  return (
    <section className="product-page beta-library" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('practice.eyebrow')}
        title={t('practice.title')}
        description={t('practice.description')}
      />
      <div className="beta-card-grid">
        {mvpPractices.map((practice) => (
          <article className="growth-card beta-content-card" key={practice.id}>
            <div className="beta-content-card__meta">
              <span>{t(`product.common.level.${practice.difficulty}`)}</span>
              <span>
                {t('product.common.minutesShort', {
                  minutes: practice.estimatedMinutes,
                })}
              </span>
              {completed.has(practice.id) ? (
                <span>{t('practice.completed')}</span>
              ) : null}
            </div>
            <h2>{practice.title}</h2>
            <p>{practice.summary}</p>
            <dl>
              <div>
                <dt>{t('practice.skill')}</dt>
                <dd>
                  {skillNames.get(practice.primaryLeafSkillId) ??
                    practice.primaryLeafSkillId}
                </dd>
              </div>
              <div>
                <dt>{t('practice.concept')}</dt>
                <dd>{practice.primaryConceptId}</dd>
              </div>
            </dl>
            <Link to={`/practices/${practice.id}`}>
              {t('practice.open')}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PracticeDetailPage({ practiceId }: { practiceId: string }) {
  const { t } = useI18n();
  const { evidence, recordEvidence } = usePracticeEvidence();
  const practice = findMvpPractice(practiceId);
  const rule = findMvpPracticeRule(practiceId);
  const [response, setResponse] = useState('');
  const [result, setResult] =
    useState<ReturnType<typeof evaluatePracticeResponse>>();
  if (practice === undefined || rule === undefined) {
    return (
      <section className="product-page">
        <PageHeader
          eyebrow={t('practice.eyebrow')}
          title={t('practice.notFound')}
          description={t('practice.notFoundDescription')}
        />
      </section>
    );
  }
  const previous = evidence.find((item) => item.practiceId === practice.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const evaluation = evaluatePracticeResponse(response, rule);
    setResult(evaluation);
    if (evaluation.outcome === 'passed') {
      recordEvidence({
        id: `practice-evidence:${practice.id}:${Date.now().toString()}`,
        practiceId: practice.id,
        leafSkillId: practice.primaryLeafSkillId,
        completedAt: new Date().toISOString(),
        evaluationResult: { outcome: 'passed', score: evaluation.score },
        evidenceOutput: {
          artifactType: practice.evidenceOutputContract.artifactType,
          response: response.trim(),
        },
        provenance: 'local-practice',
      });
    }
  };
  return (
    <section className="product-page beta-detail" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('practice.eyebrow')}
        title={practice.title}
        description={practice.summary}
      />
      <div className="beta-detail-grid">
        <article className="growth-card beta-action-card">
          <div className="growth-card__heading">
            <div>
              <h2>{t('practice.action')}</h2>
              <p>{practice.action.prompt}</p>
            </div>
            <Flask aria-hidden="true" size={22} />
          </div>
          <div className="beta-stimulus">
            <strong>{t('practice.constraints')}</strong>
            <p>{practice.action.stimulus[0]?.content}</p>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="practice-response">{t('practice.response')}</label>
            <textarea
              id="practice-response"
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              rows={8}
              placeholder={t('practice.responsePlaceholder')}
            />
            <button className="button button--primary" type="submit">
              {t('practice.submit')}
            </button>
          </form>
          {result === undefined ? null : (
            <div
              className="beta-evaluation"
              data-outcome={result.outcome}
              role="status"
            >
              {result.outcome === 'passed' ? (
                <CheckCircle aria-hidden="true" size={22} />
              ) : (
                <WarningCircle aria-hidden="true" size={22} />
              )}
              <div>
                <strong>
                  {t(
                    result.outcome === 'passed'
                      ? 'practice.passed'
                      : 'practice.revise',
                  )}
                </strong>
                <p>
                  {t(
                    result.outcome === 'passed'
                      ? 'practice.passedDescription'
                      : 'practice.reviseDescription',
                  )}
                </p>
              </div>
            </div>
          )}
        </article>
        <aside className="growth-card beta-context-card">
          <h2>{t('practice.expectedOutput')}</h2>
          <dl>
            <div>
              <dt>{t('practice.skill')}</dt>
              <dd>
                {skillNames.get(practice.primaryLeafSkillId) ??
                  practice.primaryLeafSkillId}
              </dd>
            </div>
            <div>
              <dt>{t('practice.concept')}</dt>
              <dd>{practice.primaryConceptId}</dd>
            </div>
            <div>
              <dt>{t('practice.outputType')}</dt>
              <dd>{practice.evidenceOutputContract.artifactType}</dd>
            </div>
            <div>
              <dt>{t('practice.evidenceState')}</dt>
              <dd>
                {previous === undefined
                  ? t('practice.notCompleted')
                  : t('practice.completed')}
              </dd>
            </div>
          </dl>
          <p>{practice.evidenceOutputContract.eligibilityRule}</p>
          <Link to="/cases">
            {t('practice.continueCases')}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </aside>
      </div>
    </section>
  );
}
