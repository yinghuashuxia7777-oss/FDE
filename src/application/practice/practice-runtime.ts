export interface PracticeRuntimeRule {
  practiceId: string;
  minimumLength: number;
  requiredKeywords?: readonly string[];
  requiredKeywordGroups?: readonly (readonly string[])[];
  passingKeywordCount: number;
}

export interface PracticeEvaluationResult {
  outcome: 'passed' | 'needs-revision';
  score: number;
  missingKeywords: string[];
  matchedKeywordCount: number;
}

export function evaluatePracticeResponse(
  response: string,
  rule: PracticeRuntimeRule,
): PracticeEvaluationResult {
  const normalized = response.trim().toLocaleLowerCase();
  const groups =
    rule.requiredKeywordGroups ??
    (rule.requiredKeywords ?? []).map((keyword) => [keyword]);
  const matched = groups.filter((group) =>
    group.some((keyword) => normalized.includes(keyword.toLocaleLowerCase())),
  );
  const missingKeywords = groups
    .filter((group) => !matched.includes(group))
    .map((group) => group[0] ?? '')
    .filter(Boolean);
  const passed =
    normalized.length >= rule.minimumLength &&
    matched.length >= rule.passingKeywordCount;
  return {
    outcome: passed ? 'passed' : 'needs-revision',
    score: passed ? 100 : 0,
    missingKeywords,
    matchedKeywordCount: matched.length,
  };
}
