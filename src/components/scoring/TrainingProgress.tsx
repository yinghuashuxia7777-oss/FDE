import { scoreCase, type CaseScoreEntry } from '../../domain/scoring';
import { useI18n } from '../../i18n';

interface TrainingProgressProps {
  scoreEntries: readonly CaseScoreEntry[];
  visitedNodeIds: readonly string[];
}

export function TrainingProgress({
  scoreEntries,
  visitedNodeIds,
}: TrainingProgressProps) {
  const { t } = useI18n();
  const visitedCount = visitedNodeIds.length;
  const resolvedCount = Math.min(scoreEntries.length, visitedCount);
  const nativeMax = Math.max(visitedCount, 1);
  const score = Math.round(scoreCase(scoreEntries));

  return (
    <section
      className="training-progress"
      aria-label={t('training.progress.summary')}
    >
      <h3>{t('training.progress.title')}</h3>
      <progress
        aria-label={t('training.progress.title')}
        value={resolvedCount}
        max={nativeMax}
      />
      <p>
        {t('training.progress.resolved', {
          resolved: resolvedCount,
          visited: visitedCount,
        })}
      </p>
      <p>{t('training.progress.currentScore', { score })}</p>

      {visitedCount > 0 ? (
        <div>
          <strong>{t('training.progress.visitedPath')}</strong>
          <ol aria-label={t('training.progress.visitedPath')}>
            {visitedNodeIds.map((nodeId, index) => (
              <li key={`${String(index)}-${nodeId}`}>{nodeId}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p>{t('training.progress.noDecisions')}</p>
      )}
    </section>
  );
}
