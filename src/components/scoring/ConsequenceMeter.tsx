import { WarningCircle } from '@phosphor-icons/react';

import type { ConsequenceDelta } from '../../domain/cases/types';

interface ConsequenceMeterProps {
  consequences: readonly ConsequenceDelta[];
  criticalErrorIds: readonly string[];
}

type ConsequenceMetric = 'timeDelta' | 'costDelta' | 'trustDelta' | 'riskDelta';

const metricLabels: readonly {
  key: ConsequenceMetric;
  label: string;
}[] = [
  { key: 'timeDelta', label: 'Time' },
  { key: 'costDelta', label: 'Cost' },
  { key: 'trustDelta', label: 'Trust' },
  { key: 'riskDelta', label: 'Risk' },
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
  const messages = consequences
    .map((consequence) => consequence.message)
    .filter((message): message is string => message !== undefined);
  const criticalCount = criticalErrorIds.length;

  return (
    <section className="consequence-meter" aria-label="Consequence summary">
      <h3>Consequence summary</h3>
      <dl aria-label="Accumulated consequence changes">
        {metricLabels.map(({ key, label }) => (
          <div key={key} data-consequence-metric={key}>
            <dt>{label}</dt>
            <dd>{formatDelta(sumMetric(consequences, key))}</dd>
          </div>
        ))}
      </dl>

      {criticalCount > 0 ? (
        <div data-critical-risk role="alert" aria-label="Critical risk">
          <WarningCircle aria-hidden="true" size={20} />
          <div>
            <strong>Critical risk</strong>
            <p>
              {criticalCount}{' '}
              {criticalCount === 1
                ? 'critical error recorded'
                : 'critical errors recorded'}
            </p>
          </div>
        </div>
      ) : (
        <p>No critical risk recorded.</p>
      )}

      {messages.length > 0 ? (
        <div>
          <strong>Observed impact</strong>
          <ul aria-label="Consequence messages">
            {messages.map((message, index) => (
              <li key={`${String(index)}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No consequence messages recorded.</p>
      )}
    </section>
  );
}
