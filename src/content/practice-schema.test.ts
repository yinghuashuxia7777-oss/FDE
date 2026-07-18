import type { LeafSkillDefinition } from '../domain/skills/types';
import type { SkillRubricDefinition } from '../domain/skills/rubric-types';
import type { PracticeDefinition } from '../domain/practices/types';
import { validatePracticeDefinition } from './knowledge-v2-validators';
import { PracticeDefinitionSchema } from './practice-schema';

const leafSkill: LeafSkillDefinition = {
  schemaVersion: 1,
  id: 'eng.runtime-debugging',
  name: 'Runtime debugging',
  description: 'Diagnose runtime failures from concrete evidence.',
  parentSkillId: 'software.foundations',
  capabilityLevel: 0,
  status: 'active',
  evidenceTypes: ['diagnosis'],
  activeRubricVersion: 1,
};

const rubric: SkillRubricDefinition = {
  schemaVersion: 1,
  id: 'rubric.eng.runtime-debugging',
  skillId: 'eng.runtime-debugging',
  version: 1,
  status: 'published',
  title: 'Runtime debugging evidence rubric',
  evidenceTypes: ['diagnosis'],
  criteria: [
    {
      criterionId: 'criterion.evidence-triage',
      description: 'Selects the next diagnostic step from observed evidence.',
      evidenceTypes: ['diagnosis'],
      weight: 1,
      critical: true,
    },
  ],
  thresholds: { learning: 1, competent: 70, proficient: 85 },
  metadata: {
    createdAt: '2026-07-17T00:00:00.000Z',
    reviewedAt: '2026-07-17T01:00:00.000Z',
    author: 'FDE Arena',
    reviewer: 'reviewer.one',
  },
};

function draftPractice(): PracticeDefinition {
  return {
    schemaVersion: 1,
    skillCatalogVersion: '0.1.0',
    rubricSetVersion: '0.1.0',
    id: 'practice.runtime-log-triage',
    version: 1,
    status: 'draft',
    title: 'Choose the next diagnostic signal',
    summary: 'Use one log fragment to choose a bounded next diagnostic action.',
    primaryConceptId: 'concept.log',
    foundationIds: ['foundation.log-basics'],
    primaryLeafSkillId: 'eng.runtime-debugging',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    action: {
      id: 'action.choose-next-signal',
      kind: 'diagnose',
      prompt: 'Select the next signal that would disambiguate the failure.',
      stimulus: [
        {
          id: 'stimulus.application-log',
          type: 'log',
          content: 'upstream request timed out after 3000ms',
        },
      ],
      responseContract: {
        type: 'single-choice',
        requiredFields: ['selectedOptionId', 'rationale'],
      },
      scored: true,
    },
    evaluation: {
      rubricRef: {
        rubricId: 'rubric.eng.runtime-debugging',
        skillId: 'eng.runtime-debugging',
        version: 1,
      },
      criterionIds: ['criterion.evidence-triage'],
      method: 'deterministic',
      answerContract: {
        expectedFields: {
          selectedOptionId: 'inspect-upstream-latency',
        },
        scoring: {
          mode: 'exact-match',
          passingScore: 100,
        },
      },
    },
    evidenceOutputContract: {
      artifactType: 'diagnosis',
      requiredFields: ['selectedOptionId', 'rationale'],
      eligibilityRule: 'The response must cite the supplied timeout evidence.',
      sourceReferencePolicy: 'required',
      criticalFailurePolicy:
        'Reject actions that mutate production before diagnosis.',
    },
    feedback: {
      correct:
        'The selected signal separates upstream latency from local failure.',
      partial: 'The direction is useful but the cited evidence is incomplete.',
      incorrect: 'The action does not distinguish the observed failure modes.',
      criticalFailure:
        'Production mutation before diagnosis is not eligible evidence.',
    },
    metadata: {
      createdAt: '2026-07-17T00:00:00.000Z',
      reviewedAt: null,
      author: 'FDE Arena',
      reviewer: null,
    },
  };
}

const context = {
  conceptIds: ['concept.log'],
  foundationIds: ['foundation.log-basics'],
  leafSkills: [leafSkill],
  rubrics: [rubric],
};

describe('PracticeDefinitionSchema', () => {
  it('accepts one concept, one leaf skill, and exactly one scored action', () => {
    expect(PracticeDefinitionSchema.safeParse(draftPractice()).success).toBe(
      true,
    );
  });

  it('rejects multiple primary concepts at the schema boundary', () => {
    const practice = draftPractice() as unknown as Record<string, unknown>;
    practice.primaryConceptId = ['concept.log', 'concept.debugging'];

    expect(PracticeDefinitionSchema.safeParse(practice).success).toBe(false);
  });

  it('rejects an action that is not the single scored action', () => {
    const practice = structuredClone(draftPractice()) as unknown as {
      action: { scored: boolean };
    };
    practice.action.scored = false;

    expect(PracticeDefinitionSchema.safeParse(practice).success).toBe(false);
  });

  it('rejects authored runtime outcomes', () => {
    const practice = structuredClone(draftPractice()) as unknown as Record<
      string,
      unknown
    >;
    practice.outcome = 'correct';

    expect(PracticeDefinitionSchema.safeParse(practice).success).toBe(false);
  });

  it('rejects a deterministic evaluation without an authored answer contract', () => {
    const practice = structuredClone(draftPractice()) as unknown as {
      evaluation: { answerContract?: unknown };
    };
    delete practice.evaluation.answerContract;

    expect(PracticeDefinitionSchema.safeParse(practice).success).toBe(false);
  });

  it('allows a reviewed evaluation to omit deterministic answer data', () => {
    const practice = structuredClone(draftPractice()) as unknown as {
      evaluation: {
        method: 'deterministic' | 'reviewed';
        answerContract?: unknown;
      };
    };
    practice.evaluation.method = 'reviewed';
    delete practice.evaluation.answerContract;

    expect(PracticeDefinitionSchema.safeParse(practice).success).toBe(true);
  });
});

describe('validatePracticeDefinition', () => {
  it('accepts a draft practice with resolved authored references', () => {
    expect(validatePracticeDefinition(draftPractice(), context)).toEqual([]);
  });

  it('rejects a missing primary leaf skill', () => {
    expect(
      validatePracticeDefinition(draftPractice(), {
        ...context,
        leafSkills: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_leaf_skill',
          path: ['primaryLeafSkillId'],
        }),
      ]),
    );
  });

  it('rejects unresolved concept, foundation, and rubric references', () => {
    expect(
      validatePracticeDefinition(draftPractice(), {
        ...context,
        conceptIds: [],
        foundationIds: [],
        rubrics: [],
      }).map(({ code }) => code),
    ).toEqual(
      expect.arrayContaining([
        'missing_concept',
        'missing_foundation',
        'missing_rubric',
      ]),
    );
  });

  it('rejects rubric identity or evidence output mismatches', () => {
    const practice = draftPractice();
    practice.evaluation.rubricRef.skillId = 'eng.other-skill';
    practice.evidenceOutputContract.artifactType = 'architecture-review';

    expect(
      validatePracticeDefinition(practice, context).map(({ code }) => code),
    ).toEqual(
      expect.arrayContaining([
        'rubric_skill_mismatch',
        'incompatible_evidence_type',
      ]),
    );
  });

  it('rejects an ambiguous rubric ID version independent of array order', () => {
    const conflictingRubric = {
      ...structuredClone(rubric),
      skillId: 'prod.release-verification',
    };
    const first = validatePracticeDefinition(draftPractice(), {
      ...context,
      rubrics: [conflictingRubric, rubric],
    });
    const second = validatePracticeDefinition(draftPractice(), {
      ...context,
      rubrics: [rubric, conflictingRubric],
    });

    expect(first).toEqual(second);
    expect(first.map(({ code }) => code)).toContain(
      'ambiguous_rubric_reference',
    );
  });

  it('rejects evidence output fields that the action cannot return', () => {
    const practice = draftPractice();
    practice.action.responseContract.requiredFields = ['selectedOptionId'];

    expect(validatePracticeDefinition(practice, context)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'evidence_field_not_in_response_contract',
          path: ['evidenceOutputContract', 'requiredFields', 1],
        }),
      ]),
    );
  });
});
