import type { ConceptKnowledge } from '../domain/concepts/types';

export interface ConceptIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly technicalTerm: string;
  readonly category: ConceptKnowledge['category'];
  readonly order: number;
  readonly path: string;
  readonly load: () => Promise<{ default: ConceptKnowledge }>;
}

export const conceptIndex: readonly ConceptIndexEntry[] = [
  {
    id: 'concept.api',
    title: 'API：系统之间的可验证协作边界',
    technicalTerm: 'API',
    category: 'api-backend',
    order: 1,
    path: 'content/concepts/api-backend/01-api.json',
    load: () =>
      import('../../content/concepts/api-backend/01-api.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.request-response',
    title: '请求与响应：一次调用的输入与结果',
    technicalTerm: 'Request / Response',
    category: 'api-backend',
    order: 2,
    path: 'content/concepts/api-backend/02-request-response.json',
    load: () =>
      import('../../content/concepts/api-backend/02-request-response.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.authentication',
    title: '认证：确认调用方是谁',
    technicalTerm: 'Authentication',
    category: 'api-backend',
    order: 3,
    path: 'content/concepts/api-backend/03-authentication.json',
    load: () =>
      import('../../content/concepts/api-backend/03-authentication.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.authorization',
    title: '授权：限制可执行动作与审批边界',
    technicalTerm: 'Authorization / Approval Token',
    category: 'api-backend',
    order: 4,
    path: 'content/concepts/api-backend/04-authorization.json',
    load: () =>
      import('../../content/concepts/api-backend/04-authorization.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.authentication-token',
    title: '认证令牌：携带身份与访问声明',
    technicalTerm: 'Authentication Token',
    category: 'api-backend',
    order: 5,
    path: 'content/concepts/api-backend/05-authentication-token.json',
    load: () =>
      import('../../content/concepts/api-backend/05-authentication-token.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.api-key',
    title: 'API Key：机器调用的静态凭据',
    technicalTerm: 'API Key',
    category: 'api-backend',
    order: 6,
    path: 'content/concepts/api-backend/06-api-key.json',
    load: () =>
      import('../../content/concepts/api-backend/06-api-key.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.oauth',
    title: 'OAuth：委托授权与令牌签发流程',
    technicalTerm: 'OAuth',
    category: 'api-backend',
    order: 7,
    path: 'content/concepts/api-backend/07-oauth.json',
    load: () =>
      import('../../content/concepts/api-backend/07-oauth.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.webhook',
    title: 'Webhook：由事件触发的反向 API 调用',
    technicalTerm: 'Webhook',
    category: 'api-backend',
    order: 8,
    path: 'content/concepts/api-backend/08-webhook.json',
    load: () =>
      import('../../content/concepts/api-backend/08-webhook.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.timeout-retry',
    title: '超时与重试：在不确定结果下安全恢复',
    technicalTerm: 'Timeout / Retry',
    category: 'api-backend',
    order: 9,
    path: 'content/concepts/api-backend/09-timeout-retry.json',
    load: () =>
      import('../../content/concepts/api-backend/09-timeout-retry.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.rate-limit',
    title: '限流：在共享容量内控制调用速率',
    technicalTerm: 'Rate Limit',
    category: 'api-backend',
    order: 10,
    path: 'content/concepts/api-backend/10-rate-limit.json',
    load: () =>
      import('../../content/concepts/api-backend/10-rate-limit.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.idempotency',
    title: '幂等性：重复请求不重复产生副作用',
    technicalTerm: 'Idempotency',
    category: 'api-backend',
    order: 11,
    path: 'content/concepts/api-backend/11-idempotency.json',
    load: () =>
      import('../../content/concepts/api-backend/11-idempotency.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.interface-contract',
    title: '接口契约：稳定定义输入、输出与错误',
    technicalTerm: 'Interface Contract',
    category: 'api-backend',
    order: 12,
    path: 'content/concepts/api-backend/12-interface-contract.json',
    load: () =>
      import('../../content/concepts/api-backend/12-interface-contract.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.frontend',
    title: '前端：用户交互与客户端状态边界',
    technicalTerm: 'Frontend',
    category: 'system',
    order: 13,
    path: 'content/concepts/system/13-frontend.json',
    load: () =>
      import('../../content/concepts/system/13-frontend.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.backend',
    title: '后端：承载业务规则与数据访问的服务侧',
    technicalTerm: 'Backend',
    category: 'system',
    order: 14,
    path: 'content/concepts/system/14-backend.json',
    load: () =>
      import('../../content/concepts/system/14-backend.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.service',
    title: '服务：持续接收并处理请求的运行单元',
    technicalTerm: 'Service',
    category: 'system',
    order: 15,
    path: 'content/concepts/system/15-service.json',
    load: () =>
      import('../../content/concepts/system/15-service.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.database',
    title: '数据库：持久化状态与一致性约束',
    technicalTerm: 'Database',
    category: 'system',
    order: 16,
    path: 'content/concepts/system/16-database.json',
    load: () =>
      import('../../content/concepts/system/16-database.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.cache',
    title: '缓存：用可失效副本换取读取速度',
    technicalTerm: 'Cache',
    category: 'system',
    order: 17,
    path: 'content/concepts/system/17-cache.json',
    load: () =>
      import('../../content/concepts/system/17-cache.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.queue',
    title: '队列：解耦生产者与异步消费者',
    technicalTerm: 'Queue',
    category: 'system',
    order: 18,
    path: 'content/concepts/system/18-queue.json',
    load: () =>
      import('../../content/concepts/system/18-queue.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.log',
    title: '日志：记录可关联且受治理的运行证据',
    technicalTerm: 'Log',
    category: 'system',
    order: 19,
    path: 'content/concepts/system/19-log.json',
    load: () =>
      import('../../content/concepts/system/19-log.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.monitoring',
    title: '监控：用指标与健康信号观察系统状态',
    technicalTerm: 'Monitoring',
    category: 'system',
    order: 20,
    path: 'content/concepts/system/20-monitoring.json',
    load: () =>
      import('../../content/concepts/system/20-monitoring.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.incident',
    title: '事故：生产影响下的受控响应过程',
    technicalTerm: 'Incident',
    category: 'system',
    order: 21,
    path: 'content/concepts/system/21-incident.json',
    load: () =>
      import('../../content/concepts/system/21-incident.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.root-cause',
    title: '根因：解释故障为何能够发生',
    technicalTerm: 'Root Cause',
    category: 'system',
    order: 22,
    path: 'content/concepts/system/22-root-cause.json',
    load: () =>
      import('../../content/concepts/system/22-root-cause.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.rollback',
    title: '回滚：在验证失败时恢复已知安全状态',
    technicalTerm: 'Rollback',
    category: 'system',
    order: 23,
    path: 'content/concepts/system/23-rollback.json',
    load: () =>
      import('../../content/concepts/system/23-rollback.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.deployment',
    title: '部署：把可追踪制品安全交付到运行环境',
    technicalTerm: 'Deployment',
    category: 'system',
    order: 24,
    path: 'content/concepts/system/24-deployment.json',
    load: () =>
      import('../../content/concepts/system/24-deployment.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.production-environment',
    title: '生产环境：承载真实流量与风险的运行边界',
    technicalTerm: 'Production Environment',
    category: 'system',
    order: 25,
    path: 'content/concepts/system/25-production-environment.json',
    load: () =>
      import('../../content/concepts/system/25-production-environment.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.llm',
    title: '大语言模型：基于上下文生成下一个 Token',
    technicalTerm: 'LLM',
    category: 'ai',
    order: 26,
    path: 'content/concepts/ai/26-llm.json',
    load: () =>
      import('../../content/concepts/ai/26-llm.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.llm-token',
    title: 'LLM Token：模型计量与处理文本的基本片段',
    technicalTerm: 'LLM Token',
    category: 'ai',
    order: 27,
    path: 'content/concepts/ai/27-llm-token.json',
    load: () =>
      import('../../content/concepts/ai/27-llm-token.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.prompt',
    title: '提示词：组织目标、规则、上下文与证据',
    technicalTerm: 'Prompt',
    category: 'ai',
    order: 28,
    path: 'content/concepts/ai/28-prompt.json',
    load: () =>
      import('../../content/concepts/ai/28-prompt.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.embedding',
    title: '嵌入：把内容映射到可比较的向量',
    technicalTerm: 'Embedding',
    category: 'ai',
    order: 29,
    path: 'content/concepts/ai/29-embedding.json',
    load: () =>
      import('../../content/concepts/ai/29-embedding.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.vector-database',
    title: '向量数据库：存储、索引并过滤向量表示',
    technicalTerm: 'Vector Database',
    category: 'ai',
    order: 30,
    path: 'content/concepts/ai/30-vector-database.json',
    load: () =>
      import('../../content/concepts/ai/30-vector-database.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.rag',
    title: 'RAG：先检索证据，再基于证据生成',
    technicalTerm: 'RAG',
    category: 'ai',
    order: 31,
    path: 'content/concepts/ai/31-rag.json',
    load: () =>
      import('../../content/concepts/ai/31-rag.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.chunk',
    title: '切块：把文档拆成可检索且保留语义的片段',
    technicalTerm: 'Chunk',
    category: 'ai',
    order: 32,
    path: 'content/concepts/ai/32-chunk.json',
    load: () =>
      import('../../content/concepts/ai/32-chunk.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.metadata',
    title: '元数据：描述来源、权限、版本与过滤条件',
    technicalTerm: 'Metadata',
    category: 'ai',
    order: 33,
    path: 'content/concepts/ai/33-metadata.json',
    load: () =>
      import('../../content/concepts/ai/33-metadata.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.retriever',
    title: '检索器：从候选库召回相关证据',
    technicalTerm: 'Retriever',
    category: 'ai',
    order: 34,
    path: 'content/concepts/ai/34-retriever.json',
    load: () =>
      import('../../content/concepts/ai/34-retriever.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.rerank',
    title: '重排：对召回候选进行二次精排',
    technicalTerm: 'Rerank',
    category: 'ai',
    order: 35,
    path: 'content/concepts/ai/35-rerank.json',
    load: () =>
      import('../../content/concepts/ai/35-rerank.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.agent',
    title: 'Agent：编排状态、决策与工具执行',
    technicalTerm: 'Agent / Agent Orchestrator',
    category: 'ai',
    order: 36,
    path: 'content/concepts/ai/36-agent.json',
    load: () =>
      import('../../content/concepts/ai/36-agent.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.tool-function-calling',
    title: '工具调用：把模型意图连接到窄接口',
    technicalTerm: 'Tool Calling / Function Calling',
    category: 'ai',
    order: 37,
    path: 'content/concepts/ai/37-tool-function-calling.json',
    load: () =>
      import('../../content/concepts/ai/37-tool-function-calling.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.memory',
    title: '记忆：跨步骤保留并受控取回相关状态',
    technicalTerm: 'Memory',
    category: 'ai',
    order: 38,
    path: 'content/concepts/ai/38-memory.json',
    load: () =>
      import('../../content/concepts/ai/38-memory.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.guardrails',
    title: '护栏：用分层控制限制模型与工具风险',
    technicalTerm: 'Guardrails',
    category: 'ai',
    order: 39,
    path: 'content/concepts/ai/39-guardrails.json',
    load: () =>
      import('../../content/concepts/ai/39-guardrails.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.eval',
    title: '评估：用独立数据与指标测量真实能力',
    technicalTerm: 'Eval',
    category: 'ai',
    order: 40,
    path: 'content/concepts/ai/40-eval.json',
    load: () =>
      import('../../content/concepts/ai/40-eval.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.scoping',
    title: '范围界定：明确问题、边界与非目标',
    technicalTerm: 'Scoping',
    category: 'fde',
    order: 41,
    path: 'content/concepts/fde/41-scoping.json',
    load: () =>
      import('../../content/concepts/fde/41-scoping.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.requirement',
    title: '需求：把用户目标转成可追溯约束',
    technicalTerm: 'Requirement',
    category: 'fde',
    order: 42,
    path: 'content/concepts/fde/42-requirement.json',
    load: () =>
      import('../../content/concepts/fde/42-requirement.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.poc',
    title: '概念验证：用最小实验回答关键未知',
    technicalTerm: 'PoC',
    category: 'fde',
    order: 43,
    path: 'content/concepts/fde/43-poc.json',
    load: () =>
      import('../../content/concepts/fde/43-poc.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.mvp',
    title: '最小可行产品：验证端到端价值的最小闭环',
    technicalTerm: 'MVP',
    category: 'fde',
    order: 44,
    path: 'content/concepts/fde/44-mvp.json',
    load: () =>
      import('../../content/concepts/fde/44-mvp.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.slo',
    title: 'SLO：团队承诺追求的服务目标',
    technicalTerm: 'SLO',
    category: 'fde',
    order: 45,
    path: 'content/concepts/fde/45-slo.json',
    load: () =>
      import('../../content/concepts/fde/45-slo.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.sla',
    title: 'SLA：面向客户约定的服务承诺',
    technicalTerm: 'SLA',
    category: 'fde',
    order: 46,
    path: 'content/concepts/fde/46-sla.json',
    load: () =>
      import('../../content/concepts/fde/46-sla.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.trade-off',
    title: '权衡：在约束下显式交换成本、质量与风险',
    technicalTerm: 'Trade-off',
    category: 'fde',
    order: 47,
    path: 'content/concepts/fde/47-trade-off.json',
    load: () =>
      import('../../content/concepts/fde/47-trade-off.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.evidence',
    title: '证据：支持决策的可核验事实',
    technicalTerm: 'Evidence',
    category: 'fde',
    order: 48,
    path: 'content/concepts/fde/48-evidence.json',
    load: () =>
      import('../../content/concepts/fde/48-evidence.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.debugging',
    title: '调试：用证据循环缩小故障范围',
    technicalTerm: 'Debugging',
    category: 'fde',
    order: 49,
    path: 'content/concepts/fde/49-debugging.json',
    load: () =>
      import('../../content/concepts/fde/49-debugging.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
  {
    id: 'concept.customer-communication',
    title: '客户沟通：分开事实、影响、行动与未知',
    technicalTerm: 'Customer Communication',
    category: 'fde',
    order: 50,
    path: 'content/concepts/fde/50-customer-communication.json',
    load: () =>
      import('../../content/concepts/fde/50-customer-communication.json') as Promise<{
        default: ConceptKnowledge;
      }>,
  },
];
