import type { CaseNode } from './types';

export class CaseGraphDomainError extends Error {
  override readonly name = 'CaseGraphDomainError';
}

export function resolveNextNode(
  node: CaseNode,
  branchKey: string,
): string | null {
  const matchingBranches = node.branches.filter(
    (branch) => branch.key === branchKey,
  );

  if (matchingBranches.length === 0) {
    throw new CaseGraphDomainError(
      `Missing branch "${branchKey}" on node "${node.id}".`,
    );
  }
  if (matchingBranches.length > 1) {
    throw new CaseGraphDomainError(
      `Duplicate branch "${branchKey}" on node "${node.id}".`,
    );
  }

  return matchingBranches[0]!.nextNodeId;
}
