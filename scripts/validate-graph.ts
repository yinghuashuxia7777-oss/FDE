import type { FdeCase } from '../src/domain/cases/types';

import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentSources,
  resolveSafeProjectPath,
} from './files';
import { validateContentSources } from './validate-content';

export interface ContentIssue {
  file: string;
  path: (string | number)[];
  code: string;
  message: string;
}

type GraphCase = Pick<FdeCase, 'id' | 'nodes' | 'startNodeId'>;

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
      targets.push(branch.nextNodeId);
      if (!nodesById.has(branch.nextNodeId)) {
        issues.push({
          file,
          path: ['nodes', nodeIndex, 'branches', branchIndex, 'nextNodeId'],
          code: 'missing_branch_target',
          message: `Branch target does not exist: ${branch.nextNodeId}.`,
        });
      }
    });
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
        reachable.has(node.id) &&
        node.branches.some(({ nextNodeId }) => nextNodeId === null),
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
    );
    const validation = validateContentSources(
      sources,
      options.limit === undefined ? {} : { limit: options.limit },
    );
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
    process.stdout.write(
      emitJsonReport(report, { dryRun: options.dryRun, output }),
    );
    return issues.length === 0 ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runValidateGraphCli(process.argv.slice(2));
}
