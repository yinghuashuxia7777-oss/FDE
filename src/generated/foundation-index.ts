import type {
  FoundationKnowledge,
  FoundationTrack,
} from '../domain/foundation/types';

export interface FoundationIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly track: FoundationTrack;
  readonly order: number;
  readonly estimatedMinutes: number;
  readonly path: string;
  readonly load: () => Promise<{ default: FoundationKnowledge }>;
}

export const foundationIndex: readonly FoundationIndexEntry[] = [
  {
    id: 'computer.software-program',
    title: '软件与程序：从代码到运行行为',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 1,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/01-software-program.json',
    load: () =>
      import('../../content/foundation/computer-basics/01-software-program.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.frontend-backend',
    title: '前端与后端：界面、规则和数据的边界',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 2,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/02-frontend-backend.json',
    load: () =>
      import('../../content/foundation/computer-basics/02-frontend-backend.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.service',
    title: '服务：持续接收请求的运行单元',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 3,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/03-service.json',
    load: () =>
      import('../../content/foundation/computer-basics/03-service.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.data',
    title: '数据：带有语义与质量约束的事实',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 4,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/04-data.json',
    load: () =>
      import('../../content/foundation/computer-basics/04-data.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.database',
    title: '数据库：持久化状态与一致性规则',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 5,
    estimatedMinutes: 8,
    path: 'content/foundation/computer-basics/05-database.json',
    load: () =>
      import('../../content/foundation/computer-basics/05-database.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'api-basic',
    title: 'API：系统之间可验证的协作契约',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 6,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/06-api.json',
    load: () =>
      import('../../content/foundation/computer-basics/06-api.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.server',
    title: '服务器：承载工作负载的计算环境',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 7,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/07-server.json',
    load: () =>
      import('../../content/foundation/computer-basics/07-server.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.request-response',
    title: '请求与响应：一次交互的证据闭环',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 8,
    estimatedMinutes: 7,
    path: 'content/foundation/computer-basics/08-request-response.json',
    load: () =>
      import('../../content/foundation/computer-basics/08-request-response.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.logs',
    title: '日志：可关联且受治理的运行证据',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 9,
    estimatedMinutes: 8,
    path: 'content/foundation/computer-basics/09-logs.json',
    load: () =>
      import('../../content/foundation/computer-basics/09-logs.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'computer.configuration-environment',
    title: '配置与环境：代码之外的运行输入',
    domain: 'computer-basics',
    track: 'computer-basics',
    order: 10,
    estimatedMinutes: 8,
    path: 'content/foundation/computer-basics/10-configuration-environment.json',
    load: () =>
      import('../../content/foundation/computer-basics/10-configuration-environment.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'network.ip-address',
    title: 'IP 地址：网络中的可路由位置',
    domain: 'network',
    track: 'network-api',
    order: 11,
    estimatedMinutes: 7,
    path: 'content/foundation/network/11-ip-address.json',
    load: () =>
      import('../../content/foundation/network/11-ip-address.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'network.dns',
    title: 'DNS：把稳定名称解析为当前地址',
    domain: 'network',
    track: 'network-api',
    order: 12,
    estimatedMinutes: 8,
    path: 'content/foundation/network/12-dns.json',
    load: () =>
      import('../../content/foundation/network/12-dns.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'network.port',
    title: '端口：一台主机上的服务入口',
    domain: 'network',
    track: 'network-api',
    order: 13,
    estimatedMinutes: 7,
    path: 'content/foundation/network/13-port.json',
    load: () =>
      import('../../content/foundation/network/13-port.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'network.tcp',
    title: 'TCP：可靠字节流与连接状态',
    domain: 'network',
    track: 'network-api',
    order: 14,
    estimatedMinutes: 8,
    path: 'content/foundation/network/14-tcp.json',
    load: () =>
      import('../../content/foundation/network/14-tcp.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'http-request-basic',
    title: 'HTTP 请求：方法、地址、头部与正文',
    domain: 'network',
    track: 'network-api',
    order: 15,
    estimatedMinutes: 8,
    path: 'content/foundation/network/15-http-request.json',
    load: () =>
      import('../../content/foundation/network/15-http-request.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'network.http-status',
    title: 'HTTP 状态码：结果类别而非完整根因',
    domain: 'network',
    track: 'network-api',
    order: 16,
    estimatedMinutes: 7,
    path: 'content/foundation/network/16-http-status.json',
    load: () =>
      import('../../content/foundation/network/16-http-status.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'network.https-tls',
    title: 'HTTPS 与 TLS：传输加密和端点身份',
    domain: 'network',
    track: 'network-api',
    order: 17,
    estimatedMinutes: 9,
    path: 'content/foundation/network/17-https-tls.json',
    load: () =>
      import('../../content/foundation/network/17-https-tls.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'api.token-authentication',
    title: 'API 令牌：身份、权限与最小暴露',
    domain: 'api',
    track: 'network-api',
    order: 18,
    estimatedMinutes: 9,
    path: 'content/foundation/api/18-token-authentication.json',
    load: () =>
      import('../../content/foundation/api/18-token-authentication.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'api.timeout-retry',
    title: '超时与重试：不确定结果下的受控恢复',
    domain: 'api',
    track: 'network-api',
    order: 19,
    estimatedMinutes: 10,
    path: 'content/foundation/api/19-timeout-retry.json',
    load: () =>
      import('../../content/foundation/api/19-timeout-retry.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'api.webhook-idempotency',
    title: 'Webhook 与幂等：安全接收重复事件',
    domain: 'api',
    track: 'network-api',
    order: 20,
    estimatedMinutes: 10,
    path: 'content/foundation/api/20-webhook-idempotency.json',
    load: () =>
      import('../../content/foundation/api/20-webhook-idempotency.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.llm',
    title: '大语言模型：基于上下文生成下一个 Token',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 21,
    estimatedMinutes: 9,
    path: 'content/foundation/ai-basics/21-llm.json',
    load: () =>
      import('../../content/foundation/ai-basics/21-llm.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.token',
    title: 'Token：模型处理文本的基本片段',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 22,
    estimatedMinutes: 8,
    path: 'content/foundation/ai-basics/22-token.json',
    load: () =>
      import('../../content/foundation/ai-basics/22-token.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.context-window',
    title: '上下文窗口：一次推理可见的信息预算',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 23,
    estimatedMinutes: 9,
    path: 'content/foundation/ai-basics/23-context-window.json',
    load: () =>
      import('../../content/foundation/ai-basics/23-context-window.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.prompt',
    title: 'Prompt：把目标、边界和证据组织成输入',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 24,
    estimatedMinutes: 9,
    path: 'content/foundation/ai-basics/24-prompt.json',
    load: () =>
      import('../../content/foundation/ai-basics/24-prompt.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.embedding',
    title: 'Embedding：把内容映射到可比较的向量',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 25,
    estimatedMinutes: 9,
    path: 'content/foundation/ai-basics/25-embedding.json',
    load: () =>
      import('../../content/foundation/ai-basics/25-embedding.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.vector-database',
    title: '向量数据库：语义检索的索引与过滤层',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 26,
    estimatedMinutes: 10,
    path: 'content/foundation/ai-basics/26-vector-database.json',
    load: () =>
      import('../../content/foundation/ai-basics/26-vector-database.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'rag-basic',
    title: 'RAG：先检索证据，再基于证据生成',
    domain: 'rag',
    track: 'ai-basics',
    order: 27,
    estimatedMinutes: 10,
    path: 'content/foundation/rag/27-retrieval-augmented-generation.json',
    load: () =>
      import('../../content/foundation/rag/27-retrieval-augmented-generation.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'agent-basic',
    title: 'Agent：在约束下规划并调用工具',
    domain: 'agent',
    track: 'ai-basics',
    order: 28,
    estimatedMinutes: 10,
    path: 'content/foundation/agent/28-agent.json',
    load: () =>
      import('../../content/foundation/agent/28-agent.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'agent.tool-calling',
    title: '工具调用：把模型意图连接到确定性操作',
    domain: 'agent',
    track: 'ai-basics',
    order: 29,
    estimatedMinutes: 10,
    path: 'content/foundation/agent/29-tool-calling.json',
    load: () =>
      import('../../content/foundation/agent/29-tool-calling.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
  {
    id: 'ai.evaluation-guardrails',
    title: '评估与护栏：测量质量并限制风险',
    domain: 'ai-basics',
    track: 'ai-basics',
    order: 30,
    estimatedMinutes: 11,
    path: 'content/foundation/ai-basics/30-evaluation-guardrails.json',
    load: () =>
      import('../../content/foundation/ai-basics/30-evaluation-guardrails.json') as Promise<{
        default: FoundationKnowledge;
      }>,
  },
];
