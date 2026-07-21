import type { CompletedAttemptRecord } from '../../repositories/contracts';
import {
  projectMvpLeafEvidence,
  type MvpCaseAttribution,
  type MvpLeafSkill,
} from './mvp-capability-projection';

const attempt = {
  id: 'attempt-1',
  caseId: 'case-1',
  caseVersion: 1,
  status: 'completed',
  score: 82,
  verdict: 'pass',
  completedAt: '2026-07-18T00:00:00.000Z',
} as CompletedAttemptRecord;

const skills: MvpLeafSkill[] = [
  { id: 'ai.prompt-engineering', name: 'Prompt Engineering' },
  { id: 'ai.llm-application', name: 'LLM Application' },
];

const attributions: MvpCaseAttribution[] = [
  {
    caseId: 'case-1',
    caseVersion: 1,
    leafSkillId: 'ai.prompt-engineering',
    role: 'primary',
    evidenceType: 'prompt-decision',
  },
  {
    caseId: 'case-1',
    caseVersion: 1,
    leafSkillId: 'ai.llm-application',
    role: 'secondary',
    evidenceType: 'prompt-decision',
  },
];

describe('MVP capability projection', () => {
  it('projects completed mapped Cases without averaging or writing Mastery', () => {
    const projected = projectMvpLeafEvidence([attempt], attributions, skills);
    expect(projected).toEqual([
      expect.objectContaining({
        skillId: 'ai.prompt-engineering',
        score: 82,
        primaryEvidenceCount: 1,
        supportingEvidenceCount: 0,
      }),
      expect.objectContaining({
        skillId: 'ai.llm-application',
        score: undefined,
        primaryEvidenceCount: 0,
        supportingEvidenceCount: 1,
      }),
    ]);
  });

  it('deduplicates duplicate authored mappings by Attempt and Leaf', () => {
    const projected = projectMvpLeafEvidence(
      [attempt],
      [...attributions, attributions[0]!],
      skills,
    );
    expect(projected[0]?.primaryEvidenceCount).toBe(1);
  });

  it('ignores unmapped Case versions', () => {
    expect(
      projectMvpLeafEvidence(
        [{ ...attempt, caseVersion: 2 }],
        attributions,
        skills,
      ),
    ).toEqual([]);
  });
});
