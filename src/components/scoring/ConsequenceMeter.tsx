import { WarningCircle } from '@phosphor-icons/react';

import type { ConsequenceDelta } from '../../domain/cases/types';
import { useI18n } from '../../i18n';

interface ConsequenceMeterProps {
  consequences: readonly ConsequenceDelta[];
  criticalErrorIds: readonly string[];
}

type ConsequenceMetric = 'timeDelta' | 'costDelta' | 'trustDelta' | 'riskDelta';

const metricLabels: readonly {
  key: ConsequenceMetric;
  labelKey: string;
}[] = [
  { key: 'timeDelta', labelKey: 'training.consequence.time' },
  { key: 'costDelta', labelKey: 'training.consequence.cost' },
  { key: 'trustDelta', labelKey: 'training.consequence.trust' },
  { key: 'riskDelta', labelKey: 'training.consequence.risk' },
];

function sumMetric(
  consequences: readonly ConsequenceDelta[],
  metric: ConsequenceMetric,
): number {
  return consequences.reduce(
    (total, consequence) => total + (consequence[metric] ?? 0),
    0,
  );
}

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${String(value)}`;
  }
  if (value < 0) {
    return `−${String(Math.abs(value))}`;
  }
  return '0';
}

export function ConsequenceMeter({
  consequences,
  criticalErrorIds,
}: ConsequenceMeterProps) {
  const { t } = useI18n();
  const messages = consequences
    .map((consequence) => consequence.message)
    .filter((message): message is string => message !== undefined);
  const criticalCount = criticalErrorIds.length;

  return (
    <section
      className="consequence-meter"
      aria-label={t('training.consequence.summary')}
    >
      <h3>{t('training.consequence.summary')}</h3>
      <dl aria-label={t('training.consequence.accumulatedChanges')}>
        {metricLabels.map(({ key, labelKey }) => (
          <div key={key} data-consequence-metric={key}>
            <dt>{t(labelKey)}</dt>
            <dd>{formatDelta(sumMetric(consequences, key))}</dd>
          </div>
        ))}
      </dl>

      {criticalCount > 0 ? (
        <div
          data-critical-risk
          role="alert"
          aria-label={t('training.consequence.criticalRisk')}
        >
          <WarningCircle aria-hidden="true" size={20} />
          <div>
            <strong>{t('training.consequence.criticalRisk')}</strong>
            <p>
              {t(
                criticalCount === 1
                  ? 'training.consequence.criticalErrorOne'
                  : 'training.consequence.criticalErrorMany',
                { count: criticalCount },
              )}
            </p>
          </div>
        </div>
      ) : (
        <p>{t('training.consequence.noCriticalRisk')}</p>
      )}

      {messages.length > 0 ? (
        <div>
          <strong>{t('training.consequence.observedImpact')}</strong>
          <ul aria-label={t('training.consequence.messages')}>
            {messages.map((message, index) => (
              <li key={`${String(index)}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>{t('training.consequence.noMessages')}</p>
      )}
    </section>
  );
}
