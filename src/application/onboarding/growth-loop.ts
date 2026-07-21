export interface GrowthJourneyStage {
  id:
    | 'engineering-foundation'
    | 'ai-application'
    | 'agent-engineering'
    | 'production-ai'
    | 'fde-delivery';
  skillIds: readonly string[];
  practiceId: string;
  caseId: string;
  projectId: string;
}

export interface StarterJourneyDay {
  day: number;
  foundationId: string;
  practiceId: string;
  caseId: string;
  evidenceSkillId: string;
  projectId?: string;
}

export const growthJourneyStages: readonly GrowthJourneyStage[] = [
  {
    id: 'engineering-foundation',
    skillIds: ['eng.runtime-debugging', 'software.api-design'],
    practiceId: 'practice.eng.runtime-debugging',
    caseId: 'python-config-precedence-001',
    projectId: 'project.ai-customer-solution',
  },
  {
    id: 'ai-application',
    skillIds: ['ai.llm-application', 'rag.retrieval'],
    practiceId: 'practice.rag.retrieval',
    caseId: 'rag-top-k-context-dilution-001',
    projectId: 'project.enterprise-rag-assistant',
  },
  {
    id: 'agent-engineering',
    skillIds: ['agent.tool-calling', 'agent.safety'],
    practiceId: 'practice.agent.tool-calling',
    caseId: 'agent-tool-output-prompt-injection-001',
    projectId: 'project.agent-workflow-system',
  },
  {
    id: 'production-ai',
    skillIds: ['prod.deployment', 'prod.observability'],
    practiceId: 'practice.prod.release-verification',
    caseId: 'container-readiness-port-001',
    projectId: 'project.enterprise-rag-assistant',
  },
  {
    id: 'fde-delivery',
    skillIds: ['fde.requirement-discovery', 'fde.customer-solution-design'],
    practiceId: 'practice.fde.requirement-discovery',
    caseId: 'customer-pilot-production-gap-001',
    projectId: 'project.ai-customer-solution',
  },
];

export const starterJourneyDays: readonly StarterJourneyDay[] = [
  {
    day: 1,
    foundationId: 'api.timeout-retry',
    practiceId: 'practice.software.distributed-reliability',
    caseId: 'api-timeout-budget-cascade-001',
    evidenceSkillId: 'software.distributed-reliability',
  },
  {
    day: 2,
    foundationId: 'ai.llm',
    practiceId: 'practice.ai.llm-application',
    caseId: 'llm-streaming-backpressure-overload-001',
    evidenceSkillId: 'ai.llm-application',
  },
  {
    day: 3,
    foundationId: 'rag-basic',
    practiceId: 'practice.rag.retrieval',
    caseId: 'rag-top-k-context-dilution-001',
    evidenceSkillId: 'rag.retrieval',
  },
  {
    day: 4,
    foundationId: 'agent.tool-calling',
    practiceId: 'practice.agent.tool-calling',
    caseId: 'api-rate-limit-retry-after-001',
    evidenceSkillId: 'agent.tool-calling',
  },
  {
    day: 5,
    foundationId: 'ai.evaluation-guardrails',
    practiceId: 'practice.ai.llm-evaluation',
    caseId: 'llm-eval-dataset-leakage-001',
    evidenceSkillId: 'ai.llm-evaluation',
  },
  {
    day: 6,
    foundationId: 'fde.production-readiness',
    practiceId: 'practice.prod.release-verification',
    caseId: 'k8s-secret-rotation-rollout-001',
    evidenceSkillId: 'prod.release-verification',
  },
  {
    day: 7,
    foundationId: 'fde.poc-production-gap',
    practiceId: 'practice.fde.customer-solution-design',
    caseId: 'customer-pilot-production-gap-001',
    evidenceSkillId: 'fde.customer-solution-design',
    projectId: 'project.ai-customer-solution',
  },
];

export function buildDailyGrowthMission(input: {
  completedCaseIds: readonly string[];
  completedPracticeIds: readonly string[];
  completedProjectIds: readonly string[];
}): StarterJourneyDay | undefined {
  const cases = new Set(input.completedCaseIds);
  const practices = new Set(input.completedPracticeIds);
  const projects = new Set(input.completedProjectIds);
  return starterJourneyDays.find(
    (item) =>
      !practices.has(item.practiceId) ||
      !cases.has(item.caseId) ||
      (item.projectId !== undefined && !projects.has(item.projectId)),
  );
}
