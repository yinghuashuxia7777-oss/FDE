import { scoreCase, type CaseScoreEntry } from '../../domain/scoring';

interface TrainingProgressProps {
  scoreEntries: readonly CaseScoreEntry[];
  visitedNodeIds: readonly string[];
}

export function TrainingProgress({
  scoreEntries,
  visitedNodeIds,
}: TrainingProgressProps) {
  const visitedCount = visitedNodeIds.length;
  const resolvedCount = Math.min(scoreEntries.length, visitedCount);
  const nativeMax = Math.max(visitedCount, 1);
  const score = Math.round(scoreCase(scoreEntries));

  return (
    <section
      className="training-progress"
      aria-label="Training progress summary"
    >
      <h3>Training progress</h3>
      <progress
        aria-label="Training progress"
        value={resolvedCount}
        max={nativeMax}
      />
      <p>
        {resolvedCount} of {visitedCount} decisions resolved
      </p>
      <p>Current score: {score}%</p>

      {visitedCount > 0 ? (
        <div>
          <strong>Visited decision path</strong>
          <ol aria-label="Visited decision path">
            {visitedNodeIds.map((nodeId, index) => (
              <li key={`${String(index)}-${nodeId}`}>{nodeId}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p>No decisions visited yet</p>
      )}
    </section>
  );
}
