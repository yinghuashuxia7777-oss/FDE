import type { ContentManifest, CoveragePlan, DomainDefinition, SkillDefinition } from '../content/contracts';
import type { FdeCase } from '../domain/cases/types';
import manifestJson from '../../content/manifests/content-manifest.json';
import coverageJson from '../../content/coverage/coverage-plan.json';
import domain0 from '../../content/domains/agents-evals.json';
import domain1 from '../../content/domains/api-integration.json';
import domain2 from '../../content/domains/cloud-deployment.json';
import domain3 from '../../content/domains/customer-discovery.json';
import domain4 from '../../content/domains/data-engineering.json';
import domain5 from '../../content/domains/fde-adoption.json';
import domain6 from '../../content/domains/fine-tuning-inference.json';
import domain7 from '../../content/domains/git-delivery.json';
import domain8 from '../../content/domains/llm-applications.json';
import domain9 from '../../content/domains/performance-scale.json';
import domain10 from '../../content/domains/rag-search.json';
import domain11 from '../../content/domains/reliability.json';
import domain12 from '../../content/domains/security-governance.json';
import domain13 from '../../content/domains/software-foundations.json';
import domain14 from '../../content/domains/systems-networking.json';
import skill0 from '../../content/skills/agents.evaluation.json';
import skill1 from '../../content/skills/api.integration.json';
import skill2 from '../../content/skills/cloud.deployment.json';
import skill3 from '../../content/skills/customer.discovery.json';
import skill4 from '../../content/skills/data.engineering.json';
import skill5 from '../../content/skills/fde.adoption.json';
import skill6 from '../../content/skills/git.delivery.json';
import skill7 from '../../content/skills/llm.applications.json';
import skill8 from '../../content/skills/performance.scaling.json';
import skill9 from '../../content/skills/rag.search.json';
import skill10 from '../../content/skills/reliability.observability.json';
import skill11 from '../../content/skills/security.governance.json';
import skill12 from '../../content/skills/software.foundations.json';
import skill13 from '../../content/skills/systems.networking.json';
import skill14 from '../../content/skills/tuning.inference-deployment.json';

export interface ContentIndexEntry {
  readonly caseId: string;
  readonly version: number;
  readonly schemaVersion: number;
  readonly status: FdeCase['status'];
  readonly path: string;
  readonly contentHash: string;
  readonly load: () => Promise<{ default: FdeCase }>;
}

export const bundledContentManifest = manifestJson as unknown as ContentManifest;
export const bundledCoveragePlan = coverageJson as unknown as CoveragePlan;
export const bundledDomains = [
  domain0,
  domain1,
  domain2,
  domain3,
  domain4,
  domain5,
  domain6,
  domain7,
  domain8,
  domain9,
  domain10,
  domain11,
  domain12,
  domain13,
  domain14,
] as unknown as readonly DomainDefinition[];
export const bundledSkills = [
  skill0,
  skill1,
  skill2,
  skill3,
  skill4,
  skill5,
  skill6,
  skill7,
  skill8,
  skill9,
  skill10,
  skill11,
  skill12,
  skill13,
  skill14,
] as unknown as readonly SkillDefinition[];
export const contentIndex: readonly ContentIndexEntry[] = [
  {
    caseId: 'agent-approval-boundary-bypass-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/advanced/agent-approval-boundary-bypass-001.v1.json',
    contentHash: 'sha256:f9b976b549b333237f6c45ddd5e437717bd121b5ce2976334c40c82f8c35edc4',
    load: () => import('../../content/cases/advanced/agent-approval-boundary-bypass-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'agent-tool-timeout-retry-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/agent-tool-timeout-retry-001.v1.json',
    contentHash: 'sha256:f21b96ae93a79adc0e5064cef0fba9a7d012580d4b0c07501042e85d89cf4407',
    load: () => import('../../content/cases/intermediate/agent-tool-timeout-retry-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'api-oauth-scope-mismatch-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/api-oauth-scope-mismatch-001.v1.json',
    contentHash: 'sha256:504a493a2136d457d06c1bbdd0dba57cafec00bab4019808903cf2230163450b',
    load: () => import('../../content/cases/beginner/api-oauth-scope-mismatch-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'api-webhook-idempotency-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/api-webhook-idempotency-001.v1.json',
    contentHash: 'sha256:76eba25f2c7750e0ddfe831f6f012ee9de2bb09defb0f49f25c64f1be074ecf2',
    load: () => import('../../content/cases/intermediate/api-webhook-idempotency-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'api-webhook-idempotency-001',
    version: 2,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/api-webhook-idempotency-001.v2.json',
    contentHash: 'sha256:8165bafcf339a20f75fc6ea82378078c8d19d12a2de5524131af3979a7d88930',
    load: () => import('../../content/cases/intermediate/api-webhook-idempotency-001.v2.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'container-readiness-port-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/container-readiness-port-001.v1.json',
    contentHash: 'sha256:ac94104afac3686338d588d740ffa24892eb1e4416764419d704eb809d13004c',
    load: () => import('../../content/cases/beginner/container-readiness-port-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'customer-pilot-production-gap-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/customer-pilot-production-gap-001.v1.json',
    contentHash: 'sha256:07428ee54b8c8dae5997b627739e3f21427be0e7ba218d31618d35a635bdf994',
    load: () => import('../../content/cases/intermediate/customer-pilot-production-gap-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'customer-pilot-production-gap-001',
    version: 2,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/customer-pilot-production-gap-001.v2.json',
    contentHash: 'sha256:df8d9b7c360181c11bb100f7d0772c2fd96fdda08ddb26d6aeaeaf5737e3ecc8',
    load: () => import('../../content/cases/intermediate/customer-pilot-production-gap-001.v2.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'customer-success-criteria-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/customer-success-criteria-001.v1.json',
    contentHash: 'sha256:f98666382fa5909c0293ae40cab4560e9ce8ac9cbb361061cb1999dfe6f72d80',
    load: () => import('../../content/cases/beginner/customer-success-criteria-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'dns-private-endpoint-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/dns-private-endpoint-001.v1.json',
    contentHash: 'sha256:e4a8c656f56bccdfd70d3d4259b05f172743c0ee510138f4549609baef846166',
    load: () => import('../../content/cases/beginner/dns-private-endpoint-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'etl-schema-drift-null-field-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/etl-schema-drift-null-field-001.v1.json',
    contentHash: 'sha256:b724d59b2008d3446dd311d93eb174dfeca1d652f093632989137611c97facd7',
    load: () => import('../../content/cases/beginner/etl-schema-drift-null-field-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'fde-pilot-scope-control-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/fde-pilot-scope-control-001.v1.json',
    contentHash: 'sha256:75ade06089fec6ec6ae076a6299913a0458ce199ce78131200199ad08250097a',
    load: () => import('../../content/cases/beginner/fde-pilot-scope-control-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'git-hotfix-wrong-branch-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/git-hotfix-wrong-branch-001.v1.json',
    contentHash: 'sha256:7729a505a48ed90ca8afcdd838fc5c83bc7aa00dcdd91f9d1766115f0a3e5231',
    load: () => import('../../content/cases/beginner/git-hotfix-wrong-branch-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'inference-gpu-oom-capacity-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/advanced/inference-gpu-oom-capacity-001.v1.json',
    contentHash: 'sha256:258811ad0366a6e51868b67aa2eab54189fdfd81364640066e5911fa833834e5',
    load: () => import('../../content/cases/advanced/inference-gpu-oom-capacity-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'inference-quantization-regression-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/inference-quantization-regression-001.v1.json',
    contentHash: 'sha256:b6ca124e9e51ef9f52aa091334caa8b0d20d41aa04ecefd699c5d080d94ee95d',
    load: () => import('../../content/cases/intermediate/inference-quantization-regression-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'k8s-secret-rotation-rollout-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/k8s-secret-rotation-rollout-001.v1.json',
    contentHash: 'sha256:b6d1349886a56f1d4d326bc16ca96924bf1f4ee2a5f77aa26abe6b27f61234d5',
    load: () => import('../../content/cases/intermediate/k8s-secret-rotation-rollout-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'llm-eval-dataset-leakage-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/llm-eval-dataset-leakage-001.v1.json',
    contentHash: 'sha256:430ff60f1ec462436eb576ff7528de0639335a80aa322a9a40f7e06865a77cba',
    load: () => import('../../content/cases/intermediate/llm-eval-dataset-leakage-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'llm-prompt-context-order-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/llm-prompt-context-order-001.v1.json',
    contentHash: 'sha256:e2b96e30f7606c3ba83355ea5e737f171108756950ce4df68617bce81022c7ca',
    load: () => import('../../content/cases/beginner/llm-prompt-context-order-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'multi-region-rag-consistency-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/advanced/multi-region-rag-consistency-001.v1.json',
    contentHash: 'sha256:5a15f7da3c761f62906b9a515f15924b56a081b0d1595eee6b0dd479b5c192d9',
    load: () => import('../../content/cases/advanced/multi-region-rag-consistency-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'multi-region-rag-consistency-001',
    version: 2,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/advanced/multi-region-rag-consistency-001.v2.json',
    contentHash: 'sha256:b850ce817933b84e5269a9d4189c1730808828f0bd18a0d2c4e77fbdb32e1811',
    load: () => import('../../content/cases/advanced/multi-region-rag-consistency-001.v2.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'observability-correlation-id-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/observability-correlation-id-001.v1.json',
    contentHash: 'sha256:210fa716a17a001a521a1aa0d5b435da70fc0d9db7d1857cc57df4884a6d87a9',
    load: () => import('../../content/cases/beginner/observability-correlation-id-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'python-config-precedence-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/python-config-precedence-001.v1.json',
    contentHash: 'sha256:a8d4469b02da80c8c07c5526f8f4e1478d3745a86edd56cd376cbd3690769b92',
    load: () => import('../../content/cases/beginner/python-config-precedence-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'rag-permission-filter-gap-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/rag-permission-filter-gap-001.v1.json',
    contentHash: 'sha256:b011e298d96a8b12817f9fb1e716a5fdb673e435d4f98cc79e1122663d98a843',
    load: () => import('../../content/cases/intermediate/rag-permission-filter-gap-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'rag-stale-policy-cache-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/rag-stale-policy-cache-001.v1.json',
    contentHash: 'sha256:09c32c11fa1c0edd21033df212513358c3a1bed1ae988955688f028ff644d49d',
    load: () => import('../../content/cases/beginner/rag-stale-policy-cache-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'security-log-pii-exposure-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/beginner/security-log-pii-exposure-001.v1.json',
    contentHash: 'sha256:7cbf406d0cb087ed55a6695ce6b8353dccb0cd89ae705d964b0c1ee89541e9d7',
    load: () => import('../../content/cases/beginner/security-log-pii-exposure-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'warehouse-late-arrival-watermark-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/intermediate/warehouse-late-arrival-watermark-001.v1.json',
    contentHash: 'sha256:cbdbb102708d633438ad970c320b6dd80810476f7552e4d1df46e1345df66473',
    load: () => import('../../content/cases/intermediate/warehouse-late-arrival-watermark-001.v1.json') as Promise<{ default: FdeCase }>,
  },
  {
    caseId: 'zero-downtime-schema-migration-001',
    version: 1,
    schemaVersion: 1,
    status: 'published',
    path: 'content/cases/advanced/zero-downtime-schema-migration-001.v1.json',
    contentHash: 'sha256:22736f8d902df18337537f5b169c193fc8ce289aa16209e7217cfae25709f1ae',
    load: () => import('../../content/cases/advanced/zero-downtime-schema-migration-001.v1.json') as Promise<{ default: FdeCase }>,
  },
];
