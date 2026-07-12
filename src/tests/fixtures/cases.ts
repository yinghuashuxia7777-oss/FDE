import type { FdeCase } from '../../domain/cases/types';

export function createMinimalValidCase(): FdeCase {
  return {
    id: 'case-minimal',
    slug: 'minimal-diagnostic-case',
    title: 'Minimal diagnostic case',
    summary: 'Choose the fact-supported next action.',
    level: 'beginner',
    status: 'draft',
    estimatedMinutes: 5,
    domains: ['diagnostics'],
    skills: ['evidence-assessment'],
    lifecycleStages: ['investigation'],
    technicalLayers: ['application'],
    environments: ['test'],
    riskTypes: ['operational'],
    behaviorPatterns: ['evidence-first'],
    scenario: {
      customerProfile: 'A fictional local-only customer.',
      background: 'A deployment check reported an unexpected result.',
      initialIncident: 'The service health check is failing.',
      constraints: ['Use only the supplied evidence.'],
      confirmedFacts: ['The health check returned a failure.'],
    },
    startNodeId: 'node-1',
    nodes: [
      {
        id: 'node-1',
        type: 'single-choice',
        title: 'Select the next action',
        prompt: 'What should you do first?',
        skillWeights: {
          'evidence-assessment': 1,
        },
        evidence: [
          {
            id: 'evidence-1',
            type: 'text',
            title: 'Health check',
            content: 'The health check returned HTTP 503.',
          },
        ],
        options: [
          {
            id: 'option-a',
            label: 'Inspect the failing dependency',
            explanation: 'This follows the available evidence.',
          },
          {
            id: 'option-b',
            label: 'Change unrelated configuration',
            explanation: 'This is not supported by the evidence.',
            errorType: 'unsupported-action',
          },
        ],
        answer: {
          correctOptionId: 'option-a',
        },
        feedback: {
          firstWrong: 'Re-check what the evidence directly establishes.',
          secondWrong: 'Prioritize the failing dependency.',
          revealedAnswer: 'Inspect the dependency identified by the check.',
        },
        scoring: {
          firstTry: 100,
          secondTry: 60,
          thirdTry: 30,
          weight: 1,
          criticalErrorOptionIds: ['option-b'],
        },
        consequences: [
          {
            optionId: 'option-b',
            timeDelta: 5,
            riskDelta: 1,
            message: 'The unsupported change delays diagnosis.',
          },
        ],
        branches: [
          {
            key: 'correct',
            nextNodeId: null,
          },
          {
            key: 'critical',
            nextNodeId: null,
          },
        ],
      },
    ],
    debrief: {
      summary: 'Prefer the action supported by the strongest evidence.',
      rootCause: 'The failing dependency caused the health check failure.',
      correctApproach: ['Inspect the dependency identified by the evidence.'],
      keyLessons: ['Separate confirmed facts from assumptions.'],
      interviewerPerspective: 'The response should prioritize evidence.',
      customerRiskPerspective: 'Unsupported changes increase recovery risk.',
      remediation: ['Inspect the failing dependency.'],
      verification: ['Repeat the health check after remediation.'],
      knowledgePoints: ['Evidence-led diagnosis'],
    },
    metadata: {
      version: 1,
      sourceType: 'synthetic',
      createdAt: '2026-07-13T00:00:00.000Z',
      author: 'FDE Arena',
    },
  };
}

export type CaseFixture = ReturnType<typeof createMinimalValidCase>;

export const minimalValidCase = createMinimalValidCase();

export function buildInvalidCase(
  mutate: (draft: CaseFixture) => void,
): CaseFixture {
  const draft = createMinimalValidCase();
  mutate(draft);
  return draft;
}
