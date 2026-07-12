import type {
  AbandonedAttemptRecord,
  AttemptRecord,
  AttemptRoundRecord,
  CompletedAttemptRecord,
  InProgressAttemptRecord,
} from './contracts';
import { resolveNextNode } from '../domain/cases/graph';
import type { CaseNode, FdeCase } from '../domain/cases/types';
import { evaluateNode } from '../domain/scoring';
import { compareRfc3339Timestamps } from '../storage/timestamps';

export class AttemptProgressionError extends Error {
  override readonly name = 'AttemptProgressionError';
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
  );
}

function isJsonPrefix(
  existing: readonly unknown[],
  incoming: readonly unknown[],
): boolean {
  return (
    existing.length <= incoming.length &&
    existing.every((value, index) => sameJson(value, incoming[index]))
  );
}

function isResolved(round: AttemptRoundRecord): boolean {
  return round.evaluation.isCorrect || round.revealed;
}

function foldedEffects(roundHistory: readonly AttemptRoundRecord[]): {
  criticalErrorIds: string[];
  consequences: AttemptRecord['consequences'];
} {
  const criticalErrorIds: string[] = [];
  const seenCritical = new Set<string>();
  const consequences: NonNullable<AttemptRecord['consequences']> = [];
  for (const round of roundHistory) {
    for (const criticalErrorId of round.evaluation.criticalErrorIds) {
      if (!seenCritical.has(criticalErrorId)) {
        seenCritical.add(criticalErrorId);
        criticalErrorIds.push(criticalErrorId);
      }
    }
    consequences.push(...round.evaluation.consequences);
  }
  return { criticalErrorIds, consequences };
}

function assertRoundPath(attempt: AttemptRecord): void {
  let visitIndex = 0;
  let expectedAttempt = 1;
  for (const round of attempt.roundHistory) {
    if (round.nodeId !== attempt.visitedNodeIds[visitIndex]) {
      throw new AttemptProgressionError(
        'Attempt round history must follow the visited path in order.',
      );
    }
    if (round.attemptNumber !== expectedAttempt) {
      throw new AttemptProgressionError(
        'Attempt round numbers must start at one and increase on the current visit.',
      );
    }
    const shouldReveal =
      !round.evaluation.isCorrect && round.attemptNumber === 3;
    if (round.revealed !== shouldReveal) {
      throw new AttemptProgressionError(
        'Only a third incorrect round can reveal and resolve a node.',
      );
    }
    if (isResolved(round)) {
      visitIndex += 1;
      expectedAttempt = 1;
    } else {
      expectedAttempt += 1;
    }
  }

  if (visitIndex > attempt.visitedNodeIds.length) {
    throw new AttemptProgressionError(
      'Attempt round history resolves more visits than the path contains.',
    );
  }
  if (
    attempt.status === 'completed' &&
    visitIndex !== attempt.visitedNodeIds.length
  ) {
    throw new AttemptProgressionError(
      'A completed attempt must resolve every visited node.',
    );
  }
  if (
    attempt.status === 'in-progress' &&
    visitIndex < attempt.visitedNodeIds.length - 1
  ) {
    throw new AttemptProgressionError(
      'An in-progress attempt cannot skip unresolved visited nodes.',
    );
  }
}

export function sameAttemptIdentity(
  left: AttemptRecord,
  right: AttemptRecord,
): boolean {
  return (
    left.id === right.id &&
    left.userId === right.userId &&
    left.caseId === right.caseId &&
    left.caseVersion === right.caseVersion
  );
}

export function assertAttemptIntrinsic(attempt: AttemptRecord): void {
  if (
    attempt.visitedNodeIds.length === 0 ||
    attempt.visitedNodeIds.some((nodeId) => nodeId.trim().length === 0)
  ) {
    throw new AttemptProgressionError(
      'An attempt visited path must contain non-empty node IDs.',
    );
  }
  if (
    attempt.status === 'in-progress' &&
    attempt.currentNodeId !== attempt.visitedNodeIds.at(-1)
  ) {
    throw new AttemptProgressionError(
      'An in-progress current node must equal the last visited node.',
    );
  }

  const effects = foldedEffects(attempt.roundHistory);
  if (!sameJson(attempt.criticalErrorIds, effects.criticalErrorIds)) {
    throw new AttemptProgressionError(
      'Attempt critical errors must exactly match complete round history.',
    );
  }
  if (!sameJson(attempt.consequences ?? [], effects.consequences ?? [])) {
    throw new AttemptProgressionError(
      'Attempt consequences must exactly match complete round history.',
    );
  }
  assertRoundPath(attempt);
}

function nodeById(
  nodes: ReadonlyMap<string, CaseNode>,
  nodeId: string,
): CaseNode {
  const node = nodes.get(nodeId);
  if (node === undefined) {
    throw new AttemptProgressionError(
      `Attempt references node "${nodeId}" outside its immutable case version.`,
    );
  }
  return node;
}

export function assertAttemptMatchesCase(
  attempt: AttemptRecord,
  caseContent: FdeCase,
): void {
  if (
    attempt.caseId !== caseContent.id ||
    attempt.caseVersion !== caseContent.metadata.version
  ) {
    throw new AttemptProgressionError(
      'Attempt case ID and version must match the immutable case content.',
    );
  }

  const nodes = new Map<string, CaseNode>();
  for (const node of caseContent.nodes) {
    if (nodes.has(node.id)) {
      throw new AttemptProgressionError(
        `Immutable case version contains duplicate node "${node.id}".`,
      );
    }
    nodes.set(node.id, node);
  }
  if (attempt.visitedNodeIds[0] !== caseContent.startNodeId) {
    throw new AttemptProgressionError(
      'Attempt path must start at the immutable case start node.',
    );
  }
  for (const nodeId of attempt.visitedNodeIds) {
    nodeById(nodes, nodeId);
  }
  if (attempt.currentNodeId !== null) {
    nodeById(nodes, attempt.currentNodeId);
  }
  for (const round of attempt.roundHistory) {
    nodeById(nodes, round.nodeId);
  }

  let visitOrdinal = 0;
  let visitRounds: AttemptRoundRecord[] = [];
  let finalResolvedTarget: string | null | undefined;
  for (const round of attempt.roundHistory) {
    const expectedNodeId = attempt.visitedNodeIds[visitOrdinal];
    if (round.nodeId !== expectedNodeId) {
      throw new AttemptProgressionError(
        'Attempt rounds must remain continuous within each visited node ordinal.',
      );
    }
    const node = nodeById(nodes, round.nodeId);
    let expectedEvaluation;
    try {
      expectedEvaluation = evaluateNode(node, round.submission);
    } catch (error) {
      throw new AttemptProgressionError(
        `Attempt submission cannot be evaluated for node "${node.id}": ${error instanceof Error ? error.message : 'unknown evaluation error'}`,
      );
    }
    if (!sameJson(expectedEvaluation, round.evaluation)) {
      throw new AttemptProgressionError(
        `Stored evaluation for node "${node.id}" does not match its submission.`,
      );
    }

    visitRounds.push(round);
    if (!isResolved(round)) {
      continue;
    }
    const branchKey = visitRounds.some(
      (entry) => entry.evaluation.criticalErrorIds.length > 0,
    )
      ? 'critical'
      : expectedEvaluation.branchKey;
    try {
      finalResolvedTarget = resolveNextNode(node, branchKey);
    } catch (error) {
      throw new AttemptProgressionError(
        `Attempt branch cannot be resolved for node "${node.id}": ${error instanceof Error ? error.message : 'unknown branch error'}`,
      );
    }

    const nextVisitedNodeId = attempt.visitedNodeIds[visitOrdinal + 1];
    if (nextVisitedNodeId !== undefined) {
      if (finalResolvedTarget === null) {
        throw new AttemptProgressionError(
          `Terminal node "${node.id}" cannot advance the attempt path.`,
        );
      }
      if (nextVisitedNodeId !== finalResolvedTarget) {
        throw new AttemptProgressionError(
          `Attempt path does not follow the resolved branch from node "${node.id}".`,
        );
      }
    }
    visitOrdinal += 1;
    visitRounds = [];
  }

  if (
    attempt.status === 'completed' &&
    (attempt.roundHistory.length === 0 ||
      !isResolved(attempt.roundHistory.at(-1)!) ||
      finalResolvedTarget !== null)
  ) {
    throw new AttemptProgressionError(
      'A completed attempt must end on a resolved terminal branch.',
    );
  }
}

export function assertFreshCheckpoint(attempt: InProgressAttemptRecord): void {
  assertAttemptIntrinsic(attempt);
  if (
    attempt.visitedNodeIds.length !== 1 ||
    attempt.roundHistory.length !== 0 ||
    attempt.criticalErrorIds.length !== 0 ||
    (attempt.consequences?.length ?? 0) !== 0
  ) {
    throw new AttemptProgressionError(
      'A new checkpoint must start at one node with empty history and effects.',
    );
  }
}

function assertSameSession(
  existing: AttemptRecord,
  incoming: AttemptRecord,
): void {
  if (!sameAttemptIdentity(existing, incoming)) {
    throw new AttemptProgressionError(
      'Attempt progression requires the same ID, user, case, and version.',
    );
  }
  if (existing.startedAt !== incoming.startedAt) {
    throw new AttemptProgressionError(
      'Attempt progression cannot change startedAt.',
    );
  }
}

export function assertCheckpointProgression(
  existing: InProgressAttemptRecord,
  incoming: InProgressAttemptRecord,
): void {
  assertAttemptIntrinsic(existing);
  assertAttemptIntrinsic(incoming);
  assertSameSession(existing, incoming);
  if (compareRfc3339Timestamps(incoming.updatedAt, existing.updatedAt) < 0) {
    throw new AttemptProgressionError(
      'Attempt checkpoint updatedAt cannot move backward.',
    );
  }

  const samePath = sameJson(existing.visitedNodeIds, incoming.visitedNodeIds);
  if (samePath) {
    if (!isJsonPrefix(existing.roundHistory, incoming.roundHistory)) {
      throw new AttemptProgressionError(
        'Attempt checkpoint history must move forward on the current path.',
      );
    }
    return;
  }

  const advancesOneNode =
    incoming.visitedNodeIds.length === existing.visitedNodeIds.length + 1 &&
    isJsonPrefix(existing.visitedNodeIds, incoming.visitedNodeIds);
  const lastRound = existing.roundHistory.at(-1);
  const finalRoundIsResolved =
    lastRound?.nodeId === existing.currentNodeId && isResolved(lastRound);
  if (
    !advancesOneNode ||
    !sameJson(existing.roundHistory, incoming.roundHistory) ||
    !finalRoundIsResolved
  ) {
    throw new AttemptProgressionError(
      'A branch path may advance exactly one node only after a resolved final round.',
    );
  }
}

export function assertAbandonmentProgression(
  existing: InProgressAttemptRecord,
  incoming: AbandonedAttemptRecord,
): void {
  assertAttemptIntrinsic(existing);
  assertAttemptIntrinsic(incoming);
  assertSameSession(existing, incoming);
  if (
    !sameJson(existing.roundHistory, incoming.roundHistory) ||
    !sameJson(existing.visitedNodeIds, incoming.visitedNodeIds) ||
    !sameJson(existing.criticalErrorIds, incoming.criticalErrorIds) ||
    !sameJson(existing.consequences ?? [], incoming.consequences ?? []) ||
    (incoming.currentNodeId !== null &&
      incoming.currentNodeId !== existing.currentNodeId) ||
    compareRfc3339Timestamps(incoming.updatedAt, existing.updatedAt) < 0
  ) {
    throw new AttemptProgressionError(
      'Abandonment must preserve the latest checkpoint session payload.',
    );
  }
}

export function assertCompletionProgression(
  checkpoint: InProgressAttemptRecord,
  completion: CompletedAttemptRecord,
): void {
  assertAttemptIntrinsic(checkpoint);
  assertAttemptIntrinsic(completion);
  assertSameSession(checkpoint, completion);
  const lastRound = checkpoint.roundHistory.at(-1);
  const completionMovesForward =
    compareRfc3339Timestamps(completion.completedAt, checkpoint.updatedAt) >=
      0 &&
    compareRfc3339Timestamps(completion.updatedAt, checkpoint.updatedAt) >= 0;
  if (
    lastRound === undefined ||
    !isResolved(lastRound) ||
    !completionMovesForward ||
    !sameJson(checkpoint.roundHistory, completion.roundHistory) ||
    !sameJson(checkpoint.visitedNodeIds, completion.visitedNodeIds) ||
    !sameJson(checkpoint.criticalErrorIds, completion.criticalErrorIds) ||
    !sameJson(checkpoint.consequences ?? [], completion.consequences ?? [])
  ) {
    throw new AttemptProgressionError(
      'Completion must exactly match and follow the latest resolved in-progress checkpoint.',
    );
  }
}

function completedCore(attempt: CompletedAttemptRecord): unknown {
  return {
    id: attempt.id,
    userId: attempt.userId,
    caseId: attempt.caseId,
    caseVersion: attempt.caseVersion,
    startedAt: attempt.startedAt,
    status: attempt.status,
    currentNodeId: attempt.currentNodeId,
    score: attempt.score,
    verdict: attempt.verdict,
    criticalErrorIds: attempt.criticalErrorIds,
    visitedNodeIds: attempt.visitedNodeIds,
    roundHistory: attempt.roundHistory,
    consequences: attempt.consequences ?? [],
  };
}

export function assertCompletedRetry(
  existing: CompletedAttemptRecord,
  incoming: CompletedAttemptRecord,
): void {
  assertAttemptIntrinsic(existing);
  assertAttemptIntrinsic(incoming);
  assertSameSession(existing, incoming);
  if (!sameJson(completedCore(existing), completedCore(incoming))) {
    throw new AttemptProgressionError(
      'Completed attempt ID conflicts with a different core session payload.',
    );
  }
}
