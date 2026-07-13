import type { FdeCase } from '../domain/cases/types';

export type DuplicateIdKind = 'case' | 'node' | 'option' | 'evidence';

export interface CaseSource {
  file: string;
  case: FdeCase;
}

export interface DuplicateIdIssue {
  kind: DuplicateIdKind;
  id: string;
  files: string[];
  message: string;
}

interface IdOccurrence {
  id: string;
  file: string;
  caseId: string;
}

export function detectDuplicateIds(
  sources: readonly CaseSource[],
): DuplicateIdIssue[] {
  const occurrences: Record<DuplicateIdKind, IdOccurrence[]> = {
    case: [],
    node: [],
    option: [],
    evidence: [],
  };

  for (const source of sources) {
    const caseId = source.case.id;
    occurrences.case.push({
      id: `${caseId}@${source.case.metadata.version}`,
      file: source.file,
      caseId,
    });
    for (const node of source.case.nodes) {
      occurrences.node.push({ id: node.id, file: source.file, caseId });
      node.options.forEach(({ id }) => {
        occurrences.option.push({ id, file: source.file, caseId });
      });
      node.evidence.forEach(({ id }) => {
        occurrences.evidence.push({ id, file: source.file, caseId });
      });
    }
  }

  const issues: DuplicateIdIssue[] = [];
  (Object.keys(occurrences) as DuplicateIdKind[]).forEach((kind) => {
    const occurrencesById = new Map<string, IdOccurrence[]>();
    occurrences[kind].forEach((occurrence) => {
      const matching = occurrencesById.get(occurrence.id) ?? [];
      matching.push(occurrence);
      occurrencesById.set(occurrence.id, matching);
    });
    occurrencesById.forEach((matching, id) => {
      const files = [...new Set(matching.map(({ file }) => file))].sort();
      const ownerCaseIds = new Set(matching.map(({ caseId }) => caseId));
      const duplicated =
        kind === 'case' ? files.length > 1 : ownerCaseIds.size > 1;
      if (!duplicated) return;
      issues.push({
        kind,
        id,
        files,
        message: `Duplicate ${kind} ID ${id} appears in ${files.join(', ')}.`,
      });
    });
  });

  return issues.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.id.localeCompare(right.id) ||
      left.files.join('\0').localeCompare(right.files.join('\0')),
  );
}
