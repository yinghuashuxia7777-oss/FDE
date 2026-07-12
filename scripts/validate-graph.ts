import type {
  CaseNode,
  FdeCase,
  NodeSubmission,
} from '../src/domain/cases/types';
import { evaluateNode } from '../src/domain/scoring/evaluate-node';

import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import { validateContentSources } from './validate-content';

export interface ContentIssue {
  file: string;
  path: (string | number)[];
  code: string;
  message: string;
}

type GraphCase = Pick<FdeCase, 'id' | 'nodes' | 'startNodeId'>;

function representativeSubmissions(node: CaseNode): NodeSubmission[] {
  switch (node.type) {
    case 'multiple-choice':
      return [
        ...node.options.map(({ id }) => ({
          type: 'choice' as const,
          selectedOptionIds: [id],
        })),
        {
          type: 'choice',
          selectedOptionIds: node.answer.correctOptionIds,
        },
      ];
    case 'ordering': {
      const canonicalOrder = node.answer.orderedOptionIds;
      const submissions: NodeSubmission[] = [
        { type: 'ordering', orderedOptionIds: canonicalOrder },
      ];
      if (canonicalOrder.length > 1) {
        const alternateOrder = [...canonicalOrder];
        [alternateOrder[0], alternateOrder[1]] = [
          alternateOrder[1],
          alternateOrder[0],
        ];
        submissions.push({
          type: 'ordering',
          orderedOptionIds: alternateOrder,
        });
      }
      return submissions;
    }
    case 'matching': {
      const canonicalPairs = node.answer.pairs;
      const submissions: NodeSubmission[] = [
        { type: 'matching', pairs: canonicalPairs },
      ];
      const entries = Object.entries(canonicalPairs);
      if (entries.length > 1) {
        submissions.push({
          type: 'matching',
          pairs: Object.fromEntries(entries.slice(0, -1)),
        });
      }
      return submissions;
    }
    case 'evidence-conclusion': {
      const evidenceSets = [
        node.answer.evidenceIds,
        ...node.evidence.map(({ id }) => [id]),
      ];
      return node.options.flatMap(({ id: conclusionId }) =>
        evidenceSets.map((evidenceIds) => ({
          type: 'evidence-conclusion' as const,
          conclusionId,
          evidenceIds,
        })),
      );
    }
    default:
      return node.options.map(({ id }) => ({
        type: 'choice',
        selectedOptionIds: [id],
      }));
  }
}

function evaluatorResultBranchKeys(node: CaseNode): Set<string> {
  return new Set(
    representativeSubmissions(node).map(
      (submission) => evaluateNode(node, submission).branchKey,
    ),
  );
}

function compareIssues(left: ContentIssue, right: ContentIssue): number {
  return (
    left.file.localeCompare(right.file) ||
    left.path.join('.').localeCompare(right.path.join('.')) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

function stronglyConnectedComponents(
  nodeIds: ReadonlySet<string>,
  edges: ReadonlyMap<string, readonly string[]>,
): string[][] {
  let nextIndex = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (nodeId: string) => {
    indexes.set(nodeId, nextIndex);
    lowLinks.set(nodeId, nextIndex);
    nextIndex += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const targetId of edges.get(nodeId) ?? []) {
      if (!nodeIds.has(targetId)) continue;
      if (!indexes.has(targetId)) {
        visit(targetId);
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId)!, lowLinks.get(targetId)!),
        );
      } else if (onStack.has(targetId)) {
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId)!, indexes.get(targetId)!),
        );
      }
    }

    if (lowLinks.get(nodeId) !== indexes.get(nodeId)) return;
    const component: string[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === nodeId) break;
    }
    components.push(component.sort());
  };

  [...nodeIds].sort().forEach((nodeId) => {
    if (!indexes.has(nodeId)) visit(nodeId);
  });
  return components;
}

export function validateCaseGraph(
  candidate: GraphCase,
  file = candidate.id,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const nodesById = new Map(candidate.nodes.map((node) => [node.id, node]));
  const nodeIndexes = new Map(
    candidate.nodes.map((node, index) => [node.id, index]),
  );
  const edges = new Map<string, string[]>();
  const executableTerminalNodeIds = new Set<string>();

  candidate.nodes.forEach((node, nodeIndex) => {
    const targets: string[] = [];
    const branchKeys = new Set<string>();
    if (node.branches.length === 0) {
      issues.push({
        file,
        path: ['nodes', nodeIndex, 'branches'],
        code: 'missing_branch',
        message: `Node ${node.id} has no branch.`,
      });
    }
    node.branches.forEach((branch, branchIndex) => {
      if (branch.key.trim() === '') {
        issues.push({
          file,
          path: ['nodes', nodeIndex, 'branches', branchIndex, 'key'],
          code: 'missing_branch_key',
          message: `Node ${node.id} has a branch without a key.`,
        });
      } else if (branchKeys.has(branch.key)) {
        issues.push({
          file,
          path: ['nodes', nodeIndex, 'branches', branchIndex, 'key'],
          code: 'duplicate_branch_key',
          message: `Node ${node.id} repeats branch key ${branch.key}.`,
        });
      }
      if (branch.key.trim() !== '') branchKeys.add(branch.key);
      if (branch.nextNodeId === null) return;
      if (!nodesById.has(branch.nextNodeId)) {
        issues.push({
          file,
          path: ['nodes', nodeIndex, 'branches', branchIndex, 'nextNodeId'],
          code: 'missing_branch_target',
          message: `Branch target does not exist: ${branch.nextNodeId}.`,
        });
      }
    });

    const resultBranchKeys = evaluatorResultBranchKeys(node);
    resultBranchKeys.forEach((resultKey) => {
      if (branchKeys.has(resultKey)) return;
      issues.push({
        file,
        path: ['nodes', nodeIndex, 'branches'],
        code: 'missing_result_branch',
        message: `Node ${node.id} is missing evaluator result branch ${resultKey}.`,
      });
    });
    node.branches.forEach((branch, branchIndex) => {
      if (branch.key.trim() === '' || resultBranchKeys.has(branch.key)) return;
      issues.push({
        file,
        path: ['nodes', nodeIndex, 'branches', branchIndex, 'key'],
        code: 'unsupported_branch_key',
        message: `Evaluator for node ${node.id} cannot produce branch key ${branch.key}.`,
      });
    });

    node.branches.forEach((branch) => {
      if (!resultBranchKeys.has(branch.key)) return;
      if (branch.nextNodeId === null) {
        executableTerminalNodeIds.add(node.id);
      } else {
        targets.push(branch.nextNodeId);
      }
    });

    if (node.type === 'ordering' || node.type === 'matching') {
      if ((node.scoring.criticalErrorOptionIds?.length ?? 0) > 0) {
        issues.push({
          file,
          path: ['nodes', nodeIndex, 'scoring', 'criticalErrorOptionIds'],
          code: 'unsupported_critical_error_config',
          message: `${node.type} evaluator does not consume critical error options on node ${node.id}.`,
        });
      }
      if ((node.consequences?.length ?? 0) > 0) {
        issues.push({
          file,
          path: ['nodes', nodeIndex, 'consequences'],
          code: 'unsupported_consequence_config',
          message: `${node.type} evaluator does not consume consequences on node ${node.id}.`,
        });
      }
    }
    edges.set(node.id, targets);
  });

  const reachable = new Set<string>();
  const visitReachable = (nodeId: string) => {
    if (reachable.has(nodeId) || !nodesById.has(nodeId)) return;
    reachable.add(nodeId);
    for (const targetId of edges.get(nodeId) ?? []) visitReachable(targetId);
  };
  visitReachable(candidate.startNodeId);

  candidate.nodes.forEach((node, nodeIndex) => {
    if (!reachable.has(node.id)) {
      issues.push({
        file,
        path: ['nodes', nodeIndex, 'id'],
        code: 'unreachable_node',
        message: `Node ${node.id} is unreachable from ${candidate.startNodeId}.`,
      });
    }
  });

  const reverseEdges = new Map<string, string[]>();
  for (const [sourceId, targets] of edges) {
    for (const targetId of targets) {
      if (!nodesById.has(targetId)) continue;
      const sources = reverseEdges.get(targetId) ?? [];
      sources.push(sourceId);
      reverseEdges.set(targetId, sources);
    }
  }
  const canReachTerminal = new Set<string>();
  const terminalNodes = candidate.nodes
    .filter(
      (node) =>
        reachable.has(node.id) && executableTerminalNodeIds.has(node.id),
    )
    .map(({ id }) => id);
  const markTerminalPath = (nodeId: string) => {
    if (canReachTerminal.has(nodeId)) return;
    canReachTerminal.add(nodeId);
    for (const sourceId of reverseEdges.get(nodeId) ?? []) {
      if (reachable.has(sourceId)) markTerminalPath(sourceId);
    }
  };
  terminalNodes.forEach(markTerminalPath);

  if (terminalNodes.length === 0) {
    issues.push({
      file,
      path: [],
      code: 'no_terminal',
      message: `Case ${candidate.id} has no reachable terminal branch.`,
    });
  }
  for (const nodeId of [...reachable].sort()) {
    if (canReachTerminal.has(nodeId)) continue;
    issues.push({
      file,
      path: ['nodes', nodeIndexes.get(nodeId)!, 'branches'],
      code: 'no_terminal_path',
      message: `Reachable node ${nodeId} cannot reach a terminal.`,
    });
  }

  for (const component of stronglyConnectedComponents(reachable, edges)) {
    const isCycle =
      component.length > 1 ||
      (edges.get(component[0]) ?? []).includes(component[0]);
    if (!isCycle || component.some((nodeId) => canReachTerminal.has(nodeId))) {
      continue;
    }
    issues.push({
      file,
      path: ['nodes'],
      code: 'closed_cycle',
      message: `Closed cycle cannot reach a terminal: ${component.join(', ')}.`,
    });
  }

  return issues.sort(compareIssues);
}

export function runValidateGraphCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
    });
    const sources = readContentSources(
      PROJECT_ROOT,
      options.input ?? 'content/cases',
      options.limit === undefined ? {} : { limit: options.limit },
    );
    const validation = validateContentSources(sources);
    const issues = [
      ...validation.issues,
      ...validation.cases.flatMap(({ file, case: candidate }) =>
        validateCaseGraph(candidate, file),
      ),
    ].sort(compareIssues);
    const report = {
      ok: issues.length === 0,
      casesChecked: validation.cases.length,
      issues,
    };
    const output =
      options.output === undefined
        ? undefined
        : resolveSafeProjectPath(PROJECT_ROOT, options.output);
    writeCliReport(
      emitJsonReport(report, { dryRun: options.dryRun, output }),
      report.ok,
    );
    return issues.length === 0 ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateGraphCli(process.argv.slice(2));
}
