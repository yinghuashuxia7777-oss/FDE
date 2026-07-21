import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { PROJECT_ROOT } from './files';

interface SkillSeed {
  id: string;
  name: string;
  parent: string;
  level: number;
  evidence: string;
  concept: string;
  foundation: string;
  action: string;
}

const skills: SkillSeed[] = [
  [
    'eng.python-engineering',
    'Python Engineering',
    'software.foundations',
    0,
    'code-review',
    'concept.backend',
    'computer.software-program',
    'Review a Python service boundary and select the smallest safe correction.',
  ],
  [
    'eng.runtime-debugging',
    'Runtime Debugging',
    'systems.networking',
    0,
    'diagnosis',
    'concept.debugging',
    'computer.debugging-loop',
    'Choose the next runtime signal that separates the competing hypotheses.',
  ],
  [
    'eng.automated-testing',
    'Automated Testing',
    'software.foundations',
    0,
    'test-plan',
    'concept.eval',
    'ai.eval-dataset',
    'Design one deterministic regression test for the observed failure.',
  ],
  [
    'software.api-design',
    'API Design',
    'api.integration',
    1,
    'api-contract',
    'concept.interface-contract',
    'api.json-schema-contract',
    'Select a backward-compatible request and error contract.',
  ],
  [
    'software.backend-architecture',
    'Backend Architecture',
    'software.foundations',
    1,
    'architecture-decision',
    'concept.backend',
    'computer.frontend-backend',
    'Choose a service boundary and state the trade-off it protects.',
  ],
  [
    'software.distributed-reliability',
    'Distributed Reliability',
    'reliability.observability',
    1,
    'reliability-plan',
    'concept.timeout-retry',
    'api.timeout-budget',
    'Set a bounded timeout and retry policy for one call chain.',
  ],
  [
    'ai.llm-application',
    'LLM Application Engineering',
    'llm.applications',
    2,
    'feature-decision',
    'concept.llm',
    'ai.llm',
    'Choose the LLM feature boundary and a deterministic fallback.',
  ],
  [
    'ai.prompt-engineering',
    'Prompt Engineering',
    'llm.applications',
    2,
    'prompt-decision',
    'concept.prompt',
    'ai.prompt-instruction-hierarchy',
    'Reorder instructions and untrusted context to preserve the policy boundary.',
  ],
  [
    'ai.structured-output',
    'Structured Output',
    'llm.applications',
    2,
    'schema-contract',
    'concept.interface-contract',
    'ai.structured-output',
    'Define a schema-valid response and one recovery rule.',
  ],
  [
    'ai.model-selection',
    'Model Selection',
    'tuning.inference-deployment',
    2,
    'model-adr',
    'concept.trade-off',
    'ai.generation-randomness',
    'Choose a model using explicit quality, latency, and cost evidence.',
  ],
  [
    'ai.llm-evaluation',
    'LLM Evaluation',
    'agents.evaluation',
    2,
    'evaluation-report',
    'concept.eval',
    'ai.eval-metrics',
    'Select an independent evaluation set and a release threshold.',
  ],
  [
    'rag.retrieval',
    'RAG Retrieval',
    'rag.search',
    3,
    'retrieval-report',
    'concept.retriever',
    'ai.retrieval-top-k-threshold',
    'Tune retrieval using recall evidence without flooding context.',
  ],
  [
    'rag.chunking',
    'RAG Chunking',
    'rag.search',
    3,
    'chunking-decision',
    'concept.chunk',
    'ai.chunking-strategy',
    'Choose a chunk boundary that preserves the limiting condition.',
  ],
  [
    'rag.grounding',
    'RAG Grounding',
    'rag.search',
    3,
    'grounding-report',
    'concept.rag',
    'ai.rag-grounding-citations',
    'Match one generated claim to an exact source and version.',
  ],
  [
    'rag.evaluation',
    'RAG Evaluation',
    'rag.search',
    3,
    'rag-evaluation',
    'concept.eval',
    'ai.eval-dataset',
    'Separate retrieval failure from answer-generation failure.',
  ],
  [
    'agent.tool-calling',
    'Tool Calling',
    'agents.evaluation',
    4,
    'tool-decision',
    'concept.tool-function-calling',
    'agent.tool-calling',
    'Select the narrow tool and reject an unsafe side effect.',
  ],
  [
    'agent.tool-contracts',
    'Tool Contract',
    'agents.evaluation',
    4,
    'tool-contract',
    'concept.interface-contract',
    'ai.tool-schema',
    'Repair a tool schema while preserving caller compatibility.',
  ],
  [
    'agent.workflow-design',
    'Agent Workflow Design',
    'agents.evaluation',
    4,
    'workflow-design',
    'concept.agent',
    'ai.agent-loop',
    'Define one termination condition and one recovery branch.',
  ],
  [
    'agent.memory-lifecycle',
    'Agent Memory Lifecycle',
    'agents.evaluation',
    4,
    'memory-policy',
    'concept.memory',
    'ai.agent-loop',
    'Choose what state may be retained and when it must expire.',
  ],
  [
    'agent.evaluation',
    'Agent Evaluation',
    'agents.evaluation',
    4,
    'agent-evaluation',
    'concept.eval',
    'ai.eval-dataset',
    'Design a trajectory test that checks tool choice and outcome.',
  ],
  [
    'agent.safety',
    'Agent Safety',
    'security.governance',
    4,
    'safety-review',
    'concept.guardrails',
    'ai.tool-permission-timeout',
    'Place approval before the irreversible tool action.',
  ],
  [
    'prod.containerization',
    'Docker & Containerization',
    'cloud.deployment',
    5,
    'container-review',
    'concept.deployment',
    'computer.deployment-artifact',
    'Correct one container runtime or readiness boundary.',
  ],
  [
    'prod.deployment',
    'Deployment Engineering',
    'cloud.deployment',
    5,
    'release-plan',
    'concept.deployment',
    'fde.rollout-verification',
    'Define a canary signal and an explicit rollback trigger.',
  ],
  [
    'prod.observability',
    'Observability',
    'reliability.observability',
    5,
    'observability-plan',
    'concept.monitoring',
    'computer.log-correlation',
    'Choose logs, metrics, and correlation needed to prove the failure path.',
  ],
  [
    'prod.reliability',
    'Reliability Engineering',
    'reliability.observability',
    5,
    'reliability-plan',
    'concept.slo',
    'computer.health-readiness',
    'Set an SLO-aligned mitigation and verification step.',
  ],
  [
    'prod.security',
    'Security Engineering',
    'security.governance',
    5,
    'security-review',
    'concept.authorization',
    'api.token-authentication',
    'Apply least privilege and define a negative authorization test.',
  ],
  [
    'prod.cost-optimization',
    'AI Cost Optimization',
    'performance.scaling',
    5,
    'cost-analysis',
    'concept.trade-off',
    'ai.tokenization-budget',
    'Choose a cost change that preserves the quality gate.',
  ],
  [
    'software.system-design',
    'System Design',
    'software.foundations',
    1,
    'system-design',
    'concept.trade-off',
    'computer.frontend-backend',
    'Define the component boundary, failure mode, and verification path.',
  ],
  [
    'software.data-design',
    'Data & State Design',
    'data.engineering',
    1,
    'data-design',
    'concept.database',
    'computer.database',
    'Choose a state model and one consistency invariant.',
  ],
  [
    'ai.context-engineering',
    'Context Engineering',
    'llm.applications',
    2,
    'context-policy',
    'concept.llm-token',
    'ai.context-budgeting',
    'Select the minimum context and state what must be excluded.',
  ],
  [
    'rag.permission-filtering',
    'RAG Permission Filtering',
    'rag.search',
    3,
    'permission-test',
    'concept.authorization',
    'ai.metadata-filtering',
    'Define a fail-closed retrieval filter and a negative tenant test.',
  ],
  [
    'rag.freshness',
    'RAG Freshness & Versioning',
    'rag.search',
    3,
    'freshness-plan',
    'concept.rag',
    'ai.vector-indexing',
    'Set a freshness objective and an index rollback rule.',
  ],
  [
    'agent.state-management',
    'Agent State Management',
    'agents.evaluation',
    4,
    'state-model',
    'concept.memory',
    'ai.agent-loop',
    'Define checkpoint state and an idempotent resume boundary.',
  ],
  [
    'agent.approval-design',
    'Agent Approval Design',
    'security.governance',
    4,
    'approval-design',
    'concept.authorization',
    'ai.tool-permission-timeout',
    'Place approval before side effects and define timeout behavior.',
  ],
  [
    'prod.cloud-architecture',
    'Cloud Architecture',
    'cloud.deployment',
    5,
    'cloud-architecture',
    'concept.production-environment',
    'fde.production-readiness',
    'Choose a deployment boundary and one isolation control.',
  ],
  [
    'prod.release-verification',
    'Release Verification',
    'cloud.deployment',
    5,
    'release-evidence',
    'concept.rollback',
    'fde.rollout-verification',
    'Define canary evidence, a stop condition, and rollback proof.',
  ],
  [
    'fde.customer-discovery',
    'Customer Discovery',
    'customer.discovery',
    6,
    'discovery-brief',
    'concept.scoping',
    'fde.problem-scoping',
    'Separate the customer outcome, current workflow, constraint, and non-goal.',
  ],
  [
    'fde.requirement-discovery',
    'Requirement Discovery',
    'customer.discovery',
    6,
    'requirements-brief',
    'concept.requirement',
    'fde.requirement-evidence',
    'Turn one customer statement into a testable requirement.',
  ],
  [
    'fde.architecture-proposal',
    'Architecture Proposal',
    'customer.discovery',
    6,
    'architecture-proposal',
    'concept.trade-off',
    'fde.production-readiness',
    'Propose an architecture with one alternative and rollback boundary.',
  ],
  [
    'fde.customer-solution-design',
    'Customer Solution Design',
    'fde.adoption',
    6,
    'solution-brief',
    'concept.scoping',
    'fde.problem-scoping',
    'Define the customer outcome, non-goals, and acceptance evidence.',
  ],
].map(([id, name, parent, level, evidence, concept, foundation, action]) => ({
  id: String(id),
  name: String(name),
  parent: String(parent),
  level: Number(level),
  evidence: String(evidence),
  concept: String(concept),
  foundation: String(foundation),
  action: String(action),
}));

const presentations: Record<string, string> = {
  'software.foundations': 'capability.software',
  'git.delivery': 'capability.delivery',
  'systems.networking': 'capability.operations',
  'api.integration': 'capability.integration',
  'data.engineering': 'capability.data-ai',
  'cloud.deployment': 'capability.delivery',
  'reliability.observability': 'capability.operations',
  'security.governance': 'capability.security',
  'performance.scaling': 'capability.operations',
  'llm.applications': 'capability.data-ai',
  'rag.search': 'capability.data-ai',
  'agents.evaluation': 'capability.data-ai',
  'tuning.inference-deployment': 'capability.delivery',
  'customer.discovery': 'capability.customer-outcomes',
  'fde.adoption': 'capability.customer-outcomes',
};

const cases = [
  [
    'python-config-precedence-001',
    1,
    'eng.runtime-debugging',
    ['eng.python-engineering'],
  ],
  [
    'linux-systemd-runtime-path-001',
    1,
    'eng.runtime-debugging',
    ['eng.python-engineering'],
  ],
  [
    'api-error-contract-version-drift-001',
    1,
    'software.api-design',
    ['eng.automated-testing'],
  ],
  [
    'api-timeout-budget-cascade-001',
    1,
    'software.distributed-reliability',
    ['prod.reliability'],
  ],
  [
    'api-webhook-idempotency-001',
    2,
    'software.backend-architecture',
    ['software.api-design', 'software.distributed-reliability'],
  ],
  [
    'llm-prompt-context-order-001',
    1,
    'ai.prompt-engineering',
    ['ai.llm-application'],
  ],
  [
    'llm-eval-dataset-leakage-001',
    1,
    'ai.llm-evaluation',
    ['eng.automated-testing'],
  ],
  [
    'llm-cost-routing-quality-regression-001',
    1,
    'prod.cost-optimization',
    ['ai.model-selection', 'ai.llm-evaluation'],
  ],
  ['rag-chunk-boundary-answer-loss-001', 1, 'rag.chunking', ['rag.retrieval']],
  ['rag-top-k-context-dilution-001', 1, 'rag.retrieval', ['rag.evaluation']],
  [
    'rag-permission-filter-gap-001',
    1,
    'prod.security',
    ['rag.retrieval', 'rag.evaluation'],
  ],
  [
    'multi-region-rag-consistency-001',
    2,
    'rag.grounding',
    ['prod.deployment', 'prod.reliability'],
  ],
  [
    'agent-tool-schema-enum-drift-001',
    1,
    'agent.tool-contracts',
    ['agent.tool-calling'],
  ],
  [
    'agent-tool-timeout-retry-001',
    1,
    'agent.workflow-design',
    ['agent.tool-calling', 'software.distributed-reliability'],
  ],
  [
    'agent-tool-output-prompt-injection-001',
    1,
    'agent.safety',
    ['agent.tool-calling'],
  ],
  [
    'agent-approval-boundary-bypass-001',
    1,
    'agent.safety',
    ['agent.workflow-design'],
  ],
  [
    'container-readiness-port-001',
    1,
    'prod.containerization',
    ['prod.deployment', 'prod.observability'],
  ],
  [
    'observability-correlation-id-001',
    1,
    'prod.observability',
    ['eng.runtime-debugging'],
  ],
  [
    'customer-success-criteria-001',
    1,
    'fde.requirement-discovery',
    ['fde.customer-solution-design'],
  ],
  [
    'customer-pilot-production-gap-001',
    2,
    'fde.customer-solution-design',
    ['fde.architecture-proposal', 'prod.deployment'],
  ],
  ['api-oauth-scope-mismatch-001', 1, 'software.api-design', ['prod.security']],
  [
    'api-pagination-first-page-only-001',
    1,
    'software.api-design',
    ['eng.automated-testing'],
  ],
  [
    'etl-schema-drift-null-field-001',
    1,
    'software.data-design',
    ['eng.automated-testing'],
  ],
  [
    'git-hotfix-wrong-branch-001',
    1,
    'eng.automated-testing',
    ['prod.release-verification'],
  ],
  [
    'zero-downtime-schema-migration-001',
    1,
    'software.system-design',
    ['software.data-design', 'prod.release-verification'],
  ],
  [
    'rag-hybrid-search-product-code-001',
    1,
    'rag.retrieval',
    ['rag.evaluation'],
  ],
  ['rag-stale-policy-cache-001', 1, 'rag.freshness', ['rag.grounding']],
  [
    'large-scale-rag-reindex-cutover-001',
    1,
    'rag.freshness',
    ['prod.release-verification', 'rag.evaluation'],
  ],
  [
    'inference-quantization-regression-001',
    1,
    'ai.model-selection',
    ['ai.llm-evaluation'],
  ],
  [
    'inference-gpu-oom-capacity-001',
    1,
    'ai.context-engineering',
    ['prod.cost-optimization', 'prod.reliability'],
  ],
  [
    'llm-streaming-backpressure-overload-001',
    1,
    'ai.llm-application',
    ['software.distributed-reliability'],
  ],
  [
    'enterprise-ai-fallback-guardrail-bypass-001',
    1,
    'ai.llm-application',
    ['agent.safety', 'ai.llm-evaluation'],
  ],
  [
    'customer-ai-workflow-adoption-collapse-001',
    1,
    'ai.llm-evaluation',
    ['fde.customer-solution-design'],
  ],
  [
    'multi-agent-delegation-loop-001',
    1,
    'agent.workflow-design',
    ['agent.state-management', 'agent.evaluation'],
  ],
  [
    'data-sync-cursor-checkpoint-gap-001',
    1,
    'agent.state-management',
    ['software.data-design'],
  ],
  [
    'third-party-retry-storm-001',
    1,
    'agent.evaluation',
    ['agent.workflow-design', 'software.distributed-reliability'],
  ],
  [
    'warehouse-late-arrival-watermark-001',
    1,
    'agent.memory-lifecycle',
    ['software.data-design'],
  ],
  [
    'api-rate-limit-retry-after-001',
    1,
    'agent.tool-calling',
    ['software.distributed-reliability'],
  ],
  [
    'docker-loopback-bind-unreachable-001',
    1,
    'prod.containerization',
    ['prod.cloud-architecture'],
  ],
  [
    'docker-runtime-dependency-missing-001',
    1,
    'prod.containerization',
    ['eng.python-engineering'],
  ],
  ['dns-private-endpoint-001', 1, 'prod.cloud-architecture', ['prod.security']],
  [
    'frontend-build-env-endpoint-001',
    1,
    'prod.deployment',
    ['prod.release-verification'],
  ],
  [
    'https-custom-domain-hostname-mismatch-001',
    1,
    'prod.security',
    ['prod.cloud-architecture'],
  ],
  [
    'k8s-secret-rotation-rollout-001',
    1,
    'prod.release-verification',
    ['prod.security'],
  ],
  ['security-log-pii-exposure-001', 1, 'prod.security', ['prod.observability']],
  [
    'third-party-egress-allowlist-001',
    1,
    'prod.cloud-architecture',
    ['prod.security'],
  ],
  [
    'fde-pilot-scope-control-001',
    1,
    'fde.customer-discovery',
    ['fde.requirement-discovery'],
  ],
  [
    'git-merge-conflict-config-regression-001',
    1,
    'fde.architecture-proposal',
    ['prod.release-verification'],
  ],
  [
    'http-unsupported-media-type-001',
    1,
    'fde.customer-solution-design',
    ['software.api-design'],
  ],
  [
    'linux-service-config-permission-001',
    1,
    'agent.approval-design',
    ['prod.security'],
  ],
] as const;

function write(relativePath: string, value: unknown, dryRun: boolean): void {
  if (dryRun) return;
  const path = resolve(PROJECT_ROOT, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function buildMvpContent(
  options: { dryRun?: boolean; limit?: number; output?: string } = {},
) {
  const selected = skills.slice(0, options.limit ?? skills.length);
  const leaves = selected.map((skill) => ({
    schemaVersion: 1,
    id: skill.id,
    name: skill.name,
    description: `${skill.name} demonstrated through a bounded, reviewable engineering artifact.`,
    parentSkillId: skill.parent,
    capabilityLevel: skill.level,
    status: 'reviewed',
    evidenceTypes: [skill.evidence],
    activeRubricVersion: 1,
  }));
  const rollups = selected.map((skill) => ({
    id: `edge.${skill.id}.rollup`,
    type: 'rolls-up-to',
    leafSkillId: skill.id,
    legacySkillId: skill.parent,
    canonical: true,
  }));
  const presentEdges = Object.entries(presentations).map(
    ([legacySkillId, presentationSkillId]) => ({
      id: `edge.${legacySkillId}.presents`,
      type: 'presents-as',
      legacySkillId,
      presentationSkillId,
      canonical: true,
    }),
  );
  const presentationNodes = [...new Set(Object.values(presentations))].map(
    (id) => ({
      id,
      name: id.split('.').at(-1)!,
      description: 'MVP capability presentation group.',
    }),
  );
  write(
    options.output ?? 'content/skill-graph/v2/releases/0.2.0/catalog.json',
    {
      schemaVersion: 1,
      catalogVersion: '0.2.0',
      status: 'reviewed',
      expectedLeafCount: 40,
      presentationNodes,
      leaves,
      edges: [...rollups, ...presentEdges],
    },
    !!options.dryRun,
  );

  const rubrics = selected.map((skill) => ({
    schemaVersion: 1,
    id: `rubric.${skill.id}`,
    skillId: skill.id,
    version: 1,
    status: 'draft',
    title: `${skill.name} MVP rubric`,
    evidenceTypes: [skill.evidence],
    criteria: [
      {
        criterionId: `criterion.${skill.id}.decision`,
        description: `Produces a bounded ${skill.evidence} supported by the supplied evidence.`,
        evidenceTypes: [skill.evidence],
        weight: 1,
        critical: true,
      },
    ],
    thresholds: { learning: 1, competent: 70, proficient: 85 },
    metadata: {
      createdAt: '2026-07-18T00:00:00.000Z',
      reviewedAt: null,
      author: 'FDE Arena MVP',
      reviewer: null,
    },
  }));
  write(
    'content/skill-rubrics/v1/mvp-0.2.0.json',
    {
      schemaVersion: 1,
      rubricSetVersion: '0.2.0',
      skillCatalogVersion: '0.2.0',
      status: 'draft',
      rubrics,
    },
    !!options.dryRun,
  );

  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const entries = cases.flatMap(([caseId, caseVersion, primary, secondary]) =>
    [primary, ...secondary].map((leafSkillId, index) => {
      const skill = byId.get(leafSkillId)!;
      return {
        caseId,
        caseVersion,
        nodeId: `${caseId}-node-01`,
        leafSkillId,
        rubricVersion: 1,
        role: index === 0 ? 'primary' : 'secondary',
        evidenceType: skill.evidence,
        rationale:
          index === 0
            ? `The first scored node directly exercises ${skill.name}.`
            : `The node provides supporting evidence for ${skill.name}.`,
        reviewer: 'mvp.content-review',
      };
    }),
  );
  write(
    'content/skill-attribution/mvp/map.v1.json',
    {
      schemaVersion: 1,
      skillCatalogVersion: '0.2.0',
      rubricSetVersion: '0.2.0',
      mapId: 'attribution.mvp-core',
      mapVersion: 1,
      status: 'draft',
      entries,
    },
    !!options.dryRun,
  );

  selected.forEach((skill, index) =>
    write(
      `content/practices/mvp/${String(index + 1).padStart(2, '0')}-${skill.id}.json`,
      {
        schemaVersion: 1,
        skillCatalogVersion: '0.2.0',
        rubricSetVersion: '0.2.0',
        id: `practice.${skill.id}`,
        version: 1,
        status: 'draft',
        title: `${skill.name} Focused Practice`,
        summary: `A focused transfer activity for ${skill.name}.`,
        primaryConceptId: skill.concept,
        foundationIds: [skill.foundation],
        primaryLeafSkillId: skill.id,
        difficulty:
          skill.level <= 1
            ? 'beginner'
            : skill.level <= 4
              ? 'intermediate'
              : 'advanced',
        estimatedMinutes: 5,
        action: {
          id: `action.${skill.id}`,
          kind: skill.evidence.includes('diagnosis')
            ? 'diagnose'
            : skill.evidence.includes('evaluation') ||
                skill.evidence.includes('review')
              ? 'evaluate'
              : 'decision',
          prompt: skill.action,
          stimulus: [
            {
              id: `stimulus.${skill.id}`,
              type: 'scenario',
              content:
                'Use the supplied constraints and evidence. Do not assume facts that are not present.',
            },
          ],
          responseContract: {
            type: 'text',
            requiredFields: ['decision', 'rationale'],
          },
          scored: true,
        },
        evaluation: {
          rubricRef: {
            rubricId: `rubric.${skill.id}`,
            skillId: skill.id,
            version: 1,
          },
          criterionIds: [`criterion.${skill.id}.decision`],
          method: 'reviewed',
        },
        evidenceOutputContract: {
          artifactType: skill.evidence,
          requiredFields: ['decision', 'rationale'],
          eligibilityRule:
            'The decision must cite the supplied evidence and stay within the requested scope.',
          sourceReferencePolicy: 'required',
          criticalFailurePolicy:
            'Reject unsafe actions, invented facts, or irreversible changes without a rollback boundary.',
        },
        feedback: {
          correct: 'The decision is bounded, evidence-led, and verifiable.',
          partial:
            'The direction is useful but one evidence or verification link is missing.',
          incorrect:
            'The response does not address the scored engineering action.',
          criticalFailure:
            'The response crosses a safety or authorization boundary.',
        },
        metadata: {
          createdAt: '2026-07-18T00:00:00.000Z',
          reviewedAt: null,
          author: 'FDE Arena MVP',
          reviewer: null,
        },
      },
      !!options.dryRun,
    ),
  );

  write(
    'content/practice-runtime/mvp/rules.json',
    {
      schemaVersion: 1,
      rules: selected.map((skill) => ({
        practiceId: `practice.${skill.id}`,
        minimumLength: 40,
        requiredKeywordGroups: [
          ['evidence', '证据'],
          ['verify', 'verification', '验证'],
        ],
        passingKeywordCount: 2,
      })),
    },
    !!options.dryRun,
  );

  write(
    'content/portfolio/beta-case-coverage.json',
    {
      schemaVersion: 1,
      categories: {
        software: [
          'python-config-precedence-001',
          'linux-systemd-runtime-path-001',
          'api-error-contract-version-drift-001',
          'api-timeout-budget-cascade-001',
          'api-webhook-idempotency-001',
          'api-oauth-scope-mismatch-001',
          'api-pagination-first-page-only-001',
          'etl-schema-drift-null-field-001',
          'git-hotfix-wrong-branch-001',
          'zero-downtime-schema-migration-001',
        ],
        aiApplication: [
          'llm-prompt-context-order-001',
          'llm-eval-dataset-leakage-001',
          'llm-cost-routing-quality-regression-001',
          'rag-chunk-boundary-answer-loss-001',
          'rag-top-k-context-dilution-001',
          'rag-permission-filter-gap-001',
          'multi-region-rag-consistency-001',
          'rag-hybrid-search-product-code-001',
          'rag-stale-policy-cache-001',
          'large-scale-rag-reindex-cutover-001',
          'inference-quantization-regression-001',
          'inference-gpu-oom-capacity-001',
          'llm-streaming-backpressure-overload-001',
          'enterprise-ai-fallback-guardrail-bypass-001',
          'customer-ai-workflow-adoption-collapse-001',
        ],
        agent: [
          'agent-tool-schema-enum-drift-001',
          'agent-tool-timeout-retry-001',
          'agent-tool-output-prompt-injection-001',
          'agent-approval-boundary-bypass-001',
          'multi-agent-delegation-loop-001',
          'data-sync-cursor-checkpoint-gap-001',
          'third-party-retry-storm-001',
          'warehouse-late-arrival-watermark-001',
          'api-rate-limit-retry-after-001',
          'linux-service-config-permission-001',
        ],
        production: [
          'container-readiness-port-001',
          'observability-correlation-id-001',
          'docker-loopback-bind-unreachable-001',
          'docker-runtime-dependency-missing-001',
          'dns-private-endpoint-001',
          'frontend-build-env-endpoint-001',
          'https-custom-domain-hostname-mismatch-001',
          'k8s-secret-rotation-rollout-001',
          'security-log-pii-exposure-001',
          'third-party-egress-allowlist-001',
        ],
        fde: [
          'customer-success-criteria-001',
          'customer-pilot-production-gap-001',
          'fde-pilot-scope-control-001',
          'git-merge-conflict-config-regression-001',
          'http-unsupported-media-type-001',
        ],
      },
    },
    !!options.dryRun,
  );

  write(
    'content/projects/mvp/catalog.json',
    {
      schemaVersion: 1,
      status: 'draft',
      projects: [
        {
          id: 'project.enterprise-rag-assistant',
          title: 'Enterprise RAG Assistant',
          summary:
            'Design, evaluate, and release a permission-aware RAG assistant.',
          requiredLeafSkillIds: [
            'rag.retrieval',
            'rag.evaluation',
            'prod.deployment',
          ],
          deliverables: [
            'retrieval-evaluation-report',
            'permission-test',
            'release-plan',
          ],
        },
        {
          id: 'project.agent-workflow-system',
          title: 'Agent Workflow System',
          summary: 'Design a governed tool-using Agent workflow.',
          requiredLeafSkillIds: [
            'agent.tool-calling',
            'agent.memory-lifecycle',
            'agent.safety',
          ],
          deliverables: ['tool-contract', 'workflow-design', 'safety-review'],
        },
        {
          id: 'project.ai-customer-solution',
          title: 'AI Customer Solution',
          summary:
            'Turn a customer problem into an evidence-backed delivery proposal.',
          requiredLeafSkillIds: [
            'fde.requirement-discovery',
            'fde.architecture-proposal',
            'fde.customer-solution-design',
          ],
          deliverables: [
            'requirements-brief',
            'architecture-proposal',
            'acceptance-plan',
          ],
        },
      ],
    },
    !!options.dryRun,
  );
  return {
    leafSkills: selected.length,
    practices: selected.length,
    caseMappings: cases.length,
    projects: 3,
  };
}

if (process.argv[1]?.endsWith('build-mvp-capability-content.ts')) {
  const dryRun = process.argv.includes('--dry-run');
  const limitAt = process.argv.indexOf('--limit');
  const limit = limitAt >= 0 ? Number(process.argv[limitAt + 1]) : undefined;
  console.log(JSON.stringify(buildMvpContent({ dryRun, limit }), null, 2));
}
