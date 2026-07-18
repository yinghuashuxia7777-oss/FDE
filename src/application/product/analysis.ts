import { resolveNextNode } from '../../domain/cases/graph';
import type {
  CaseNode,
  FdeCase,
  NodeSubmission,
} from '../../domain/cases/types';
import { evaluateNode } from '../../domain/scoring';
import { scoreNode } from '../../domain/scoring/score-node';
import type {
  AttemptRoundRecord,
  CompletedAttemptRecord,
} from '../../repositories/contracts';

export { compareRfc3339Timestamps } from '../../storage/timestamps';

export interface AttemptVisit {
  ordinal: number;
  nodeId: string;
  rounds: AttemptRoundRecord[];
}

export function groupAttemptVisits(
  attempt: CompletedAttemptRecord,
): AttemptVisit[] {
  let roundIndex = 0;
  return attempt.visitedNodeIds.map((nodeId, visitIndex) => {
    const rounds: AttemptRoundRecord[] = [];
    while (roundIndex < attempt.roundHistory.length) {
      const round = attempt.roundHistory[roundIndex];
      if (round?.nodeId !== nodeId) break;
      rounds.push(round);
      roundIndex += 1;
      if (round.evaluation.isCorrect || round.revealed) break;
    }
    return { ordinal: visitIndex + 1, nodeId, rounds };
  });
}

export function visitGroupingWarning(
  attempt: CompletedAttemptRecord,
  visits: readonly AttemptVisit[],
): string | undefined {
  const consumed = visits.reduce((sum, visit) => sum + visit.rounds.length, 0);
  if (consumed !== attempt.roundHistory.length) {
    return 'Some historical rounds could not be assigned to their recorded visit ordinal.';
  }
  if (
    visits.some(
      ({ rounds }) =>
        rounds.length === 0 ||
        !rounds.some((round) => round.evaluation.isCorrect || round.revealed),
    )
  ) {
    return 'At least one recorded visit has no resolved round.';
  }
  return undefined;
}

export function correctSubmissionForNode(node: CaseNode): NodeSubmission {
  switch (node.type) {
    case 'multiple-choice':
      return {
        type: 'choice',
        selectedOptionIds: [...node.answer.correctOptionIds],
      };
    case 'ordering':
      return {
        type: 'ordering',
        orderedOptionIds: [...node.answer.orderedOptionIds],
      };
    case 'matching':
      return { type: 'matching', pairs: { ...node.answer.pairs } };
    case 'evidence-conclusion':
      return {
        type: 'evidence-conclusion',
        conclusionId: node.answer.conclusionId,
        evidenceIds: [...node.answer.evidenceIds],
      };
    default:
      return {
        type: 'choice',
        selectedOptionIds: [node.answer.correctOptionId],
      };
  }
}

export interface RecommendedPath {
  nodeIds: string[];
  stopped:
    'terminal' | 'cycle' | 'hop-limit' | 'missing-node' | 'invalid-branch';
}

export function buildRecommendedPath(
  content: FdeCase,
  maxHops = Math.max(1, content.nodes.length + 1),
): RecommendedPath {
  const nodes = new Map(content.nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const nodeIds: string[] = [];
  let currentId: string | null = content.startNodeId;
  for (let hop = 0; hop < maxHops; hop += 1) {
    if (currentId === null) return { nodeIds, stopped: 'terminal' };
    if (seen.has(currentId)) return { nodeIds, stopped: 'cycle' };
    const node = nodes.get(currentId);
    if (node === undefined) return { nodeIds, stopped: 'missing-node' };
    seen.add(currentId);
    nodeIds.push(currentId);
    try {
      const evaluation = evaluateNode(node, correctSubmissionForNode(node));
      currentId = resolveNextNode(node, evaluation.branchKey);
    } catch {
      return { nodeIds, stopped: 'invalid-branch' };
    }
  }
  return { nodeIds, stopped: 'hop-limit' };
}

function optionLabel(node: CaseNode | undefined, optionId: string) {
  if (node === undefined) return optionId;
  return (
    node.options.find(({ id }) => id === optionId)?.label ??
    `Unknown option (${optionId})`
  );
}

export function describeSubmission(
  submission: NodeSubmission,
  node?: CaseNode,
): string {
  switch (submission.type) {
    case 'choice':
      return submission.selectedOptionIds
        .map((id) => optionLabel(node, id))
        .join(', ');
    case 'ordering':
      return submission.orderedOptionIds
        .map((id) => optionLabel(node, id))
        .join(' → ');
    case 'matching':
      return Object.entries(submission.pairs)
        .map(
          ([left, right]) =>
            `${optionLabel(node, left)} → ${optionLabel(node, right)}`,
        )
        .join('; ');
    case 'evidence-conclusion': {
      const evidence = submission.evidenceIds.map((id) => {
        if (node === undefined) return id;
        const item = node.evidence.find((candidate) => candidate.id === id);
        if (item === undefined) return `Unknown evidence (${id})`;
        return item.title ?? `${item.type} evidence (${id})`;
      });
      return `${optionLabel(node, submission.conclusionId)}; evidence: ${evidence.join(', ')}`;
    }
  }
}

export function submissionOptionExplanations(
  submission: NodeSubmission,
  node: CaseNode,
) {
  const optionIds =
    submission.type === 'choice'
      ? submission.selectedOptionIds
      : submission.type === 'ordering'
        ? submission.orderedOptionIds
        : submission.type === 'matching'
          ? Object.entries(submission.pairs).flat()
          : [submission.conclusionId];
  return [...new Set(optionIds)].map((id) => {
    const option = node.options.find((candidate) => candidate.id === id);
    return {
      id,
      label: option?.label ?? `Unknown option (${id})`,
      explanation:
        option?.explanation ??
        'No authored explanation exists for this unknown option identifier.',
    };
  });
}

export interface TrustedAttempt {
  attempt: CompletedAttemptRecord;
  caseContent: FdeCase;
}

export const CAPABILITY_DIMENSIONS = [
  { id: 'evidence', label: 'Evidence judgment' },
  { id: 'priority', label: 'Priority judgment' },
  { id: 'risk', label: 'Risk awareness' },
  { id: 'architecture', label: 'Architecture tradeoffs' },
  { id: 'communication', label: 'Customer communication' },
] as const;

export interface CapabilityDimension {
  id: (typeof CAPABILITY_DIMENSIONS)[number]['id'];
  label: string;
  samples: number;
  score: number | undefined;
  basis: string;
}

function dimensionsForVisit(node: CaseNode) {
  const signals =
    `${Object.keys(node.skillWeights).join(' ')} ${node.options.flatMap(({ errorType }) => errorType ?? []).join(' ')}`.toLocaleLowerCase();
  const dimensions = new Set<CapabilityDimension['id']>();
  if (
    [
      'evidence-conclusion',
      'log-analysis',
      'diff-review',
      'configuration-review',
    ].includes(node.type) ||
    /evidence|diagnos|observab|verify/.test(signals)
  )
    dimensions.add('evidence');
  if (
    node.type === 'ordering' ||
    node.type === 'command-choice' ||
    /priorit|triage|sequence/.test(signals)
  )
    dimensions.add('priority');
  if (
    (node.scoring.criticalErrorOptionIds?.length ?? 0) > 0 ||
    (node.type === 'ordering' &&
      (node.answer.hazardousOptionIds?.length ?? 0) > 0) ||
    /risk|security|privacy|compliance/.test(signals)
  )
    dimensions.add('risk');
  if (
    node.type === 'architecture-tradeoff' ||
    /architect|system-design|scalab/.test(signals)
  )
    dimensions.add('architecture');
  if (
    node.type === 'customer-response' ||
    /customer|communicat|discovery|requirement/.test(signals)
  )
    dimensions.add('communication');
  return dimensions;
}

export function scoreVisit(
  node: CaseNode,
  rounds: readonly AttemptRoundRecord[],
): { score: number; criticalCapped: boolean } {
  const earned = rounds.reduce(
    (sum, round) =>
      sum +
      scoreNode(node, round.evaluation, round.attemptNumber, round.revealed),
    0,
  );
  const rawScore =
    node.scoring.weight === 0
      ? 0
      : Math.min(100, (earned / node.scoring.weight) * 100);
  const criticalCapped = rounds.some(
    ({ evaluation }) => evaluation.criticalErrorIds.length > 0,
  );
  return {
    score: criticalCapped ? Math.min(40, rawScore) : rawScore,
    criticalCapped,
  };
}

export function calculateCapabilityDimensions(
  trustedAttempts: readonly TrustedAttempt[],
): CapabilityDimension[] {
  const samples = new Map<CapabilityDimension['id'], number[]>();
  for (const { attempt, caseContent } of trustedAttempts) {
    const nodes = new Map(caseContent.nodes.map((node) => [node.id, node]));
    for (const visit of groupAttemptVisits(attempt)) {
      const node = nodes.get(visit.nodeId);
      if (node === undefined) continue;
      const { score: visitScore } = scoreVisit(node, visit.rounds);
      for (const dimension of dimensionsForVisit(node)) {
        const values = samples.get(dimension) ?? [];
        values.push(visitScore);
        samples.set(dimension, values);
      }
    }
  }
  return CAPABILITY_DIMENSIONS.map(({ id, label }) => {
    const values = samples.get(id) ?? [];
    return {
      id,
      label,
      samples: values.length,
      score:
        values.length === 0
          ? undefined
          : values.reduce((sum, value) => sum + value, 0) / values.length,
      basis:
        'Average visit score from authored node scoring where trusted node type, skill weights, or authored option error types map to this dimension; critical visits are capped at 40.',
    };
  });
}

export function calculateLevelPassRates(
  trustedAttempts: readonly TrustedAttempt[],
) {
  return (['beginner', 'intermediate', 'advanced'] as const).map((level) => {
    const attempts = trustedAttempts.filter(
      ({ caseContent }) => caseContent.level === level,
    );
    const passed = attempts.filter(
      ({ attempt }) =>
        attempt.verdict === 'excellent' || attempt.verdict === 'pass',
    ).length;
    return {
      level,
      passed,
      samples: attempts.length,
      rate:
        attempts.length === 0 ? undefined : (passed / attempts.length) * 100,
    };
  });
}
