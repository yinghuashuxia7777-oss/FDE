# AI Growth OS Knowledge Architecture Review

> 面向 Production AI Engineer / FDE 成长路线的当前课程体系审查
> 审查日期：2026-07-17
> 审查性质：当前工作树只读快照；本报告不代表对内容或代码的修改

## Executive Summary

当前知识系统已经形成完整的四层引用闭环：

```text
100 Foundation
      ↓ relatedFoundation / skills
50 Concept ───────────────→ 15 Skill / 15 Domain
      ↓ relatedCases                 ↓ case.skills / node.skillWeights
50 active Case（53 个版本文件）──────┘
```

当前体系的主要优点不是“知识点多”，而是 Foundation、Concept、Skill、Case
之间已经可以相互解析：100 个 Foundation、15 个 Skill 和 50 个当前案件均无孤立项，
每个当前案件同时至少被一个 Foundation 和一个 Concept 引用。

但它目前更像一套“广覆盖、事故驱动的生产排障题库”，还不是完整的 Production AI
Engineer 课程路线。最重要的结构性问题是：

1. Foundation 已细化到 100 个知识点，但 Skill 仍是 15 个“一 Domain 一 Skill”的大桶，
   无法分别评估 Prompt、Agent Engineering、RAG ingestion、Evaluation、Inference Serving
   等子能力。
2. Foundation 只有 beginner 44、intermediate 56，advanced 为 0；Concept 没有难度、
   先修关系或直接 Skill 标签。
3. 50 个当前案件中，`operate` 44、`deploy` 24、`incident-response` 19，明显偏向
   已发生故障后的诊断与恢复；绿地设计、编码实现、端到端 PoC、客户发现与采用不足。
4. Programming、Linux、Docker、Cloud、Database、Fine-tuning 六个 Foundation
   物理目录仍为空壳；相关知识散落在 `computer-basics` 或单个 AI 条目中。
5. Coverage 计划目标为 362 个案件，当前默认活动案件为 50 个，完成度约 13.8%，
   仍有 312 个规划缺口。`coverage-report.json` 的 `passed: true` 只代表没有 error 级
   校验问题，不代表课程覆盖已经完成。

---

## Audit Scope and Counting Rules

### Authoritative sources

- Foundation：`content/foundation/**/*.json`
- Concept：`content/concepts/**/*.json`
- Domain：`content/domains/*.json`
- Skill：`content/skills/*.json`
- Case：`content/cases/{beginner,intermediate,advanced}/*.vN.json`
- 当前活动 Case 版本：`content/manifests/content-config.json.activeCases`
- Coverage 计划：`content/coverage/coverage-plan.json`
- Coverage 报告：`content/manifests/coverage-report.json`
- Schema：`content/schemas/{foundation,concept,domain,skill,fde-case,coverage}.schema.json`

### Counting rules

- “当前 Case 数”按 `content-config.json.activeCases` 中的 `(caseId, version)` 统计，
  每个稳定 `caseId` 只计算一次，并要求对应版本为 `published`。
- 当前有 53 个 Case 版本文件、50 个稳定 Case ID；三个 Case 保留 v1 历史版本，
  默认内容包选择 v2。
- Domain / Skill 是多标签关系。一个案件可以给多个 Domain / Skill 各贡献 1，
  所以各行 Case 数不能横向相加得到 50。
- Foundation 通过 `skills[]` 直接关联 Skill；Concept 没有 `skills` 字段，报告中的
  Concept→Skill 数量由 `relatedFoundation[].skills[]` 与 `relatedCases[].skills[]`
  合并推导，因此也是多对多口径。
- 当前工作树原本已有未提交内容。本报告描述的是审查时的磁盘快照，不等同于 Git HEAD。

---

# 1. Knowledge Tree

## 1.1 Current physical architecture

```text
AI Engineering Knowledge System
│
├── Foundation Knowledge · 100
│   ├── Track: computer-basics · 30
│   │   ├── Domain: computer-basics · 20
│   │   └── Domain: fde-methodology · 10
│   ├── Track: network-api · 40
│   │   ├── Domain: network · 17
│   │   └── Domain: api · 23
│   └── Track: ai-basics · 30
│       ├── Domain: ai-basics · 13
│       ├── Domain: rag · 8
│       └── Domain: agent · 9
│
├── Concept Bridge · 50
│   ├── api-backend · 12
│   ├── system · 13
│   ├── ai · 15
│   └── fde · 10
│
├── Capability Taxonomy
│   ├── DomainDefinition · 15 active
│   └── SkillDefinition · 15 active
│       └── 当前严格一对一；无父子、先修或 typed edge
│
└── Case Portfolio
    ├── Beginner · 22
    ├── Intermediate · 18
    └── Advanced · 10
```

当前三个 Foundation track 并不等价于 Production AI Engineer 的真实学习阶段：
`fde-methodology` 被放入 `computer-basics`，RAG 与 Agent 被统一放入 `ai-basics`。
因此后续设计成长路线时，应优先参考下方 7 个实际 Foundation domain，而不是只看三个 track。

## 1.2 Foundation catalog — 100 / 100

### Computer Basics — 20

1. `computer.software-program` — 软件与程序：从代码到运行行为
2. `computer.frontend-backend` — 前端与后端：界面、规则和数据的边界
3. `computer.service` — 服务：持续接收请求的运行单元
4. `computer.data` — 数据：带有语义与质量约束的事实
5. `computer.database` — 数据库：持久化状态与一致性规则
6. `api-basic` — API：系统之间可验证的协作契约
7. `computer.server` — 服务器：承载工作负载的计算环境
8. `computer.request-response` — 请求与响应：一次交互的证据闭环
9. `computer.logs` — 日志：可关联且受治理的运行证据
10. `computer.configuration-environment` — 配置与环境：代码之外的运行输入
11. `computer.process-lifecycle` — 进程生命周期：从启动到安全退出
12. `computer.filesystem-paths` — 文件系统路径：定位程序实际读取的文件
13. `computer.file-permissions` — 文件权限：谁能读取、写入与执行
14. `computer.runtime-dependencies` — 运行时依赖：程序启动之外的必要条件
15. `computer.port-binding` — 端口绑定：进程在哪里接收连接
16. `computer.environment-precedence` — 环境配置优先级：确定最终生效值
17. `computer.deployment-artifact` — 部署制品：把源代码变成可追踪交付物
18. `computer.health-readiness` — 健康与就绪：区分存活、启动和接流量条件
19. `computer.debugging-loop` — 调试闭环：用证据缩小问题范围
20. `computer.log-correlation` — 日志关联：还原一次请求的跨服务路径

### Network — 17

1. `network.ip-address` — IP 地址：网络中的可路由位置
2. `network.dns` — DNS：把稳定名称解析为当前地址
3. `network.port` — 端口：一台主机上的服务入口
4. `network.tcp` — TCP：可靠字节流与连接状态
5. `http-request-basic` — HTTP 请求：方法、地址、头部与正文
6. `network.http-status` — HTTP 状态码：结果类别而非完整根因
7. `network.https-tls` — HTTPS 与 TLS：传输加密和端点身份
8. `http.method-semantics` — HTTP 方法语义：把业务意图放在正确动作里
9. `http.url-query` — URL 与查询参数：准确定位资源和筛选条件
10. `http.request-headers` — 请求头：传递身份、协商与诊断上下文
11. `http.request-body-content-type` — 请求正文与 Content-Type：让字节按预期解释
12. `http.response-headers` — 响应头：读取服务给出的处理线索
13. `http.status-success` — 成功状态码：区分完成、创建与已接收
14. `http.status-client-error` — 客户端错误状态码：按语义修正请求
15. `http.status-server-error` — 服务端错误状态码：识别故障边界与重试条件
16. `https.certificate-chain` — 证书链：从服务证书建立可信路径
17. `https.hostname-time-validation` — 主机名与时间校验：证书有效还要匹配目标

### API — 23

1. `api.token-authentication` — API 令牌：身份、权限与最小暴露
2. `api.timeout-retry` — 超时与重试：不确定结果下的受控恢复
3. `api.webhook-idempotency` — Webhook 与幂等：安全接收重复事件
4. `api.api-key-auth` — API Key 认证：识别调用方并控制凭据暴露
5. `api.bearer-token` — Bearer Token：持有即代表调用权限
6. `api.oauth-roles` — OAuth 角色：分清授权流程中的参与者
7. `api.oauth-authorization-code` — 授权码流程：从用户同意到安全换取令牌
8. `api.oauth-scope-audience` — OAuth Scope 与 Audience：权限和目标缺一不可
9. `api.token-expiry-refresh` — 令牌过期与刷新：安全延续访问会话
10. `api.webhook-delivery` — Webhook 投递：用快速确认面对重复与乱序
11. `api.webhook-signature` — Webhook 签名：验证来源并抵御重放
12. `api.retry-backoff-jitter` — 重试退避与抖动：避免恢复流量同步冲击
13. `api.timeout-budget` — 超时预算：让整条调用链共享明确期限
14. `api.rate-limit` — API 限流：在共享容量内安排调用
15. `api.json-types-null` — JSON 类型与 null：区分缺失、空值和真实类型
16. `api.json-schema-contract` — JSON Schema 契约：让数据边界可验证
17. `api.rest-resources` — REST 资源：围绕稳定对象组织接口
18. `api.pagination` — 分页：完整遍历持续变化的数据集
19. `api.filter-sort` — 过滤与排序：让服务端查询可预测且安全
20. `api.idempotency-key` — 幂等键：让同一业务意图可安全重放
21. `api.cors-origin` — CORS 与 Origin：浏览器跨域访问边界
22. `api.correlation-id` — Correlation ID：贯穿调用链关联证据
23. `api.versioned-error-contract` — 版本化错误契约：让失败也能稳定集成

### AI Basics — 13

1. `ai.llm` — 大语言模型：基于上下文生成下一个 Token
2. `ai.token` — Token：模型处理文本的基本片段
3. `ai.context-window` — 上下文窗口：一次推理可见的信息预算
4. `ai.prompt` — Prompt：把目标、边界和证据组织成输入
5. `ai.embedding` — Embedding：把内容映射到可比较的向量
6. `ai.vector-database` — 向量数据库：语义检索的索引与过滤层
7. `ai.evaluation-guardrails` — 评估与护栏：测量质量并限制风险
8. `ai.tokenization-budget` — 分词预算：用实际 Token 约束请求成本
9. `ai.context-budgeting` — 上下文预算：按优先级分配可见信息
10. `ai.prompt-instruction-hierarchy` — 提示指令层级：分开规则、任务与不可信数据
11. `ai.structured-output` — 结构化输出：把生成结果变成可验证契约
12. `ai.generation-randomness` — 生成随机性：让评估覆盖输出波动
13. `ai.fine-tuning-serving-fit` — 微调与服务适配：把训练收益带到线上

### RAG — 8

1. `rag-basic` — RAG：先检索证据，再基于证据生成
2. `ai.embedding-similarity` — 嵌入相似度：把召回分数与可信度分开
3. `ai.vector-indexing` — 向量索引：治理版本、传播与删除状态
4. `ai.chunking-strategy` — 切块策略：保留语义、来源与授权边界
5. `ai.metadata-filtering` — 元数据过滤：在召回前强制范围与权限
6. `ai.retrieval-top-k-threshold` — 召回数量与阈值：平衡漏检和上下文噪声
7. `ai.hybrid-search-reranking` — 混合检索与重排：召回互补候选再精排
8. `ai.rag-grounding-citations` — RAG 依据与引用：让结论可核验可追踪

### Agent and Evaluation — 9

1. `agent-basic` — Agent：在约束下规划并调用工具
2. `agent.tool-calling` — 工具调用：把模型意图连接到确定性操作
3. `ai.agent-loop` — Agent 循环：让每一步状态与副作用可控
4. `ai.tool-schema` — 工具模式：把可调用动作定义成窄契约
5. `ai.tool-permission-timeout` — 工具权限与超时：控制授权和未知结果
6. `ai.eval-dataset` — 评估数据集：建立独立且可追溯的能力样本
7. `ai.eval-metrics` — 评估指标：用分层门槛约束真实风险
8. `ai.hallucination-detection` — 幻觉检测：核对主张、证据与来源版本
9. `ai.guardrails` — 护栏：用分层控制限制模型与工具风险

### FDE Methodology — 10

1. `fde.problem-scoping` — 问题界定：先确定真正要解决的边界
2. `fde.requirement-evidence` — 需求证据：把意见转成可追溯约束
3. `fde.success-criteria` — 成功标准：在实施前约定如何判定结果
4. `fde.evidence-first-debugging` — 证据优先调试：先缩小问题再改变系统
5. `fde.root-cause-analysis` — 根因分析：解释故障为何能够发生
6. `fde.poc-hypothesis` — 概念验证：用最小实验回答关键未知
7. `fde.poc-production-gap` — 试点到生产：识别被演示环境隐藏的差距
8. `fde.production-readiness` — 生产就绪：用证据通过发布门禁
9. `fde.customer-communication` — 客户沟通：分开事实、影响、行动与未知
10. `fde.rollout-verification` — 发布验证：用分阶段证据确认改变有效

Foundation 总学习时长约 939 分钟（15.7 小时）。Level 分布为 beginner 44、
intermediate 56、advanced 0。

## 1.3 Concept catalog — 50 / 50

### API and Backend — 12

1. `concept.api` — API：系统之间的可验证协作边界
2. `concept.request-response` — 请求与响应：一次调用的输入与结果
3. `concept.authentication` — 认证：确认调用方是谁
4. `concept.authorization` — 授权：限制可执行动作与审批边界
5. `concept.authentication-token` — 认证令牌：携带身份与访问声明
6. `concept.api-key` — API Key：机器调用的静态凭据
7. `concept.oauth` — OAuth：委托授权与令牌签发流程
8. `concept.webhook` — Webhook：由事件触发的反向 API 调用
9. `concept.timeout-retry` — 超时与重试：在不确定结果下安全恢复
10. `concept.rate-limit` — 限流：在共享容量内控制调用速率
11. `concept.idempotency` — 幂等性：重复请求不重复产生副作用
12. `concept.interface-contract` — 接口契约：稳定定义输入、输出与错误

### Systems — 13

1. `concept.frontend` — 前端：用户交互与客户端状态边界
2. `concept.backend` — 后端：承载业务规则与数据访问的服务侧
3. `concept.service` — 服务：持续接收并处理请求的运行单元
4. `concept.database` — 数据库：持久化状态与一致性约束
5. `concept.cache` — 缓存：用可失效副本换取读取速度
6. `concept.queue` — 队列：解耦生产者与异步消费者
7. `concept.log` — 日志：记录可关联且受治理的运行证据
8. `concept.monitoring` — 监控：用指标与健康信号观察系统状态
9. `concept.incident` — 事故：生产影响下的受控响应过程
10. `concept.root-cause` — 根因：解释故障为何能够发生
11. `concept.rollback` — 回滚：在验证失败时恢复已知安全状态
12. `concept.deployment` — 部署：把可追踪制品安全交付到运行环境
13. `concept.production-environment` — 生产环境：承载真实流量与风险的运行边界

### AI — 15

1. `concept.llm` — 大语言模型：基于上下文生成下一个 Token
2. `concept.llm-token` — LLM Token：模型计量与处理文本的基本片段
3. `concept.prompt` — 提示词：组织目标、规则、上下文与证据
4. `concept.embedding` — 嵌入：把内容映射到可比较的向量
5. `concept.vector-database` — 向量数据库：存储、索引并过滤向量表示
6. `concept.rag` — RAG：先检索证据，再基于证据生成
7. `concept.chunk` — 切块：把文档拆成可检索且保留语义的片段
8. `concept.metadata` — 元数据：描述来源、权限、版本与过滤条件
9. `concept.retriever` — 检索器：从候选库召回相关证据
10. `concept.rerank` — 重排：对召回候选进行二次精排
11. `concept.agent` — Agent：编排状态、决策与工具执行
12. `concept.tool-function-calling` — 工具调用：把模型意图连接到窄接口
13. `concept.memory` — 记忆：跨步骤保留并受控取回相关状态
14. `concept.guardrails` — 护栏：用分层控制限制模型与工具风险
15. `concept.eval` — 评估：用独立数据与指标测量真实能力

### FDE — 10

1. `concept.scoping` — 范围界定：明确问题、边界与非目标
2. `concept.requirement` — 需求：把用户目标转成可追溯约束
3. `concept.poc` — 概念验证：用最小实验回答关键未知
4. `concept.mvp` — 最小可行产品：验证端到端价值的最小闭环
5. `concept.slo` — SLO：团队承诺追求的服务目标
6. `concept.sla` — SLA：面向客户约定的服务承诺
7. `concept.trade-off` — 权衡：在约束下显式交换成本、质量与风险
8. `concept.evidence` — 证据：支持决策的可核验事实
9. `concept.debugging` — 调试：用证据循环缩小故障范围
10. `concept.customer-communication` — 客户沟通：分开事实、影响、行动与未知

Concept 引用全部 100 个 Foundation 和全部 50 个当前 Case，但 50 个 Concept
都没有直接 `skills[]` 或 `domainId`，只能通过 Foundation / Case 间接映射到能力。

## 1.4 Active Case catalog — 50 / 50

### Beginner — 22

1. `api-oauth-scope-mismatch-001` — OAuth 令牌缺少新接口要求的范围
2. `api-pagination-first-page-only-001` — 同步任务只读取 API 第一页
3. `api-rate-limit-retry-after-001` — 批量调用忽略 Retry-After 持续触发限流
4. `container-readiness-port-001` — 容器健康但 Readiness 探针端口错误
5. `customer-success-criteria-001` — 客户试点缺少可判定的成功标准
6. `dns-private-endpoint-001` — 工作负载解析到私有服务的公网地址
7. `docker-loopback-bind-unreachable-001` — 容器只监听回环地址导致外部不可达
8. `docker-runtime-dependency-missing-001` — Docker 多阶段构建遗漏运行依赖
9. `etl-schema-drift-null-field-001` — 上游字段变为可空后 ETL 失败
10. `fde-pilot-scope-control-001` — 试点中途出现范围扩张
11. `frontend-build-env-endpoint-001` — 前端制品写入了错误 API 地址
12. `git-hotfix-wrong-branch-001` — 紧急修复提交到了错误分支
13. `git-merge-conflict-config-regression-001` — Git 合并冲突保留了旧配置键
14. `http-unsupported-media-type-001` — API 因 Content-Type 不匹配返回 415
15. `https-custom-domain-hostname-mismatch-001` — 自定义域名出现 TLS 主机名错误
16. `linux-service-config-permission-001` — Linux 服务账户无权读取配置
17. `linux-systemd-runtime-path-001` — 命令行可运行但 systemd 找不到依赖
18. `llm-prompt-context-order-001` — 提示上下文顺序削弱了响应约束
19. `observability-correlation-id-001` — 跨服务请求缺少关联标识
20. `python-config-precedence-001` — Python 服务读取了意外的超时配置
21. `rag-stale-policy-cache-001` — 政策更新后助手仍返回旧规则
22. `security-log-pii-exposure-001` — 诊断日志意外记录个人信息

### Intermediate — 18

1. `agent-tool-output-prompt-injection-001` — Agent 把工具返回内容当成了指令
2. `agent-tool-schema-enum-drift-001` — Agent 工具枚举契约漂移
3. `agent-tool-timeout-retry-001` — Agent 工具超时触发重复写入
4. `api-error-contract-version-drift-001` — 错误响应升级后被客户端误判为可重试故障
5. `api-timeout-budget-cascade-001` — 不一致的超时预算放大下游调用
6. `api-webhook-idempotency-001` — Webhook 重投造成重复履约
7. `customer-pilot-production-gap-001` — 客户试点成功掩盖生产差距
8. `data-sync-cursor-checkpoint-gap-001` — 游标先于数据提交导致同步缺口
9. `inference-quantization-regression-001` — 量化推理发布出现质量回退
10. `k8s-secret-rotation-rollout-001` — Kubernetes 密钥轮换未触发安全发布
11. `llm-eval-dataset-leakage-001` — LLM 评估集被提示样例污染
12. `rag-chunk-boundary-answer-loss-001` — 固定切块边界截断了关键限制条件
13. `rag-hybrid-search-product-code-001` — 向量检索遗漏精确产品编码
14. `rag-permission-filter-gap-001` — RAG 权限过滤在网关迁移后缺失
15. `rag-top-k-context-dilution-001` — 过大的 top-k 引入冲突旧版本
16. `third-party-egress-allowlist-001` — 第三方地址轮换后出站连接被拒绝
17. `third-party-retry-storm-001` — 第三方恢复期被同步重试再次压垮
18. `warehouse-late-arrival-watermark-001` — 迟到事件越过数仓水位线

### Advanced — 10

1. `agent-approval-boundary-bypass-001` — Agent 在审批前执行高风险工具
2. `customer-ai-workflow-adoption-collapse-001` — 技术验收通过但客户周采用率跌破 10%
3. `enterprise-ai-fallback-guardrail-bypass-001` — 企业 AI 降级链路绕过安全护栏
4. `inference-gpu-oom-capacity-001` — 推理服务在长上下文流量下 GPU OOM
5. `large-scale-rag-reindex-cutover-001` — 大规模 RAG 重建索引提前切换
6. `llm-cost-routing-quality-regression-001` — 低成本模型路由伤害关键客户分层
7. `llm-streaming-backpressure-overload-001` — 流式输出背压引发生产级联过载
8. `multi-agent-delegation-loop-001` — 多 Agent 相互委派形成执行循环
9. `multi-region-rag-consistency-001` — 多区域 RAG 返回不一致引用
10. `zero-downtime-schema-migration-001` — 订单 Schema 迁移要求零停机

三个稳定 Case ID 有两个 published 版本；当前目录选择 v2，历史 v1 仍保留：

- `api-webhook-idempotency-001`
- `customer-pilot-production-gap-001`
- `multi-region-rag-consistency-001`

---

# 2. Skill Mapping

当前 Domain 与 Skill 是严格 15:15 一对一。`F` 表示直接引用该 Skill 的 Foundation
数量；`C` 表示经 Foundation / Case 关系推导到该 Skill 的 Concept 数量；Case 数只统计
当前 50 个活动版本。

| Knowledge Domain（F / C）                                     | Skill                         |     Case数量 | 状态   |
| ------------------------------------------------------------- | ----------------------------- | -----------: | ------ |
| Software foundations & structure（F20 / C15）                 | `software.foundations`        |  9 / 计划 24 | active |
| Git, collaboration & delivery（F2 / C2）                      | `git.delivery`                |  2 / 计划 24 | active |
| Terminal, systems & networking（F7 / C5）                     | `systems.networking`          |  4 / 计划 24 | active |
| HTTP, API, auth & integration（F38 / C26）                    | `api.integration`             | 18 / 计划 24 | active |
| Data, databases & engineering（F2 / C9）                      | `data.engineering`            |  7 / 计划 24 | active |
| Cloud, containers & Kubernetes（F11 / C20）                   | `cloud.deployment`            | 10 / 计划 24 | active |
| Observability & reliability（F34 / C42）                      | `reliability.observability`   | 25 / 计划 24 | active |
| Security, privacy & governance（F28 / C28）                   | `security.governance`         | 12 / 计划 24 | active |
| Performance, cost & scale（F7 / C15）                         | `performance.scaling`         |  9 / 计划 24 | active |
| LLM foundations & AI applications（F14 / C13）                | `llm.applications`            |  5 / 计划 24 | active |
| RAG, search & enterprise knowledge（F11 / C12）               | `rag.search`                  |  7 / 计划 25 | active |
| Agents, tools & evaluation（F17 / C19）                       | `agents.evaluation`           |  9 / 计划 25 | active |
| Model fine-tuning, datasets & inference deployment（F2 / C6） | `tuning.inference-deployment` |  4 / 计划 24 | active |
| Customer discovery & requirements（F5 / C10）                 | `customer.discovery`          |  3 / 计划 24 | active |
| FDE delivery, adoption & communication（F7 / C16）            | `fde.adoption`                |  5 / 计划 24 | active |

Important interpretation:

- `reliability.observability = 25` 不等于 25 个以可靠性为唯一主线的案件。当前 50 案
  共有 129 次 Domain membership，平均每案 2.58 个标签；可靠性经常作为跨域标签出现。
- 当前 Skill 无父子、先修、等级、rubric 或 typed edge。点号 ID 只是稳定命名，
  代码不会把它解释成层级。
- Foundation 的主题粒度已经比 Skill 更细。例如 `ai.tool-schema`、
  `ai.metadata-filtering`、`ai.eval-dataset` 都会被折叠到一个宏观 Skill 分数中。

---

# 3. Coverage Analysis

## 3.1 Quantitative snapshot

| Metric                                 | Current state |
| -------------------------------------- | ------------: |
| Foundation                             |           100 |
| Concept                                |            50 |
| Active Domain / Skill                  |       15 / 15 |
| Case version files                     |            53 |
| Stable Case IDs / active Case versions |       50 / 50 |
| Beginner / Intermediate / Advanced     |  22 / 18 / 10 |
| Coverage target                        |           362 |
| Remaining planned cases                |           312 |
| Overall target completion              |         13.8% |
| Foundation→Skill edges                 |           205 |
| Foundation→Case edges                  |           162 |
| Concept→Foundation edges               |           142 |
| Concept→Case edges                     |           119 |
| Dangling content references            |             0 |

28 个中高阶案件中，26 个带至少三个 Domain，跨域比例为 92.86%。这说明 Case
已经具备真实工程问题的多约束特征，但也说明仅按标签计数容易高估某个领域的独立深度。

## 3.2 Strongly covered FDE capabilities

### Production diagnosis and safe recovery

当前题库最成熟的能力是证据驱动的生产排障。大量案件要求：

- 先确认事实、影响范围和未知项；
- 使用日志、配置、请求、指标或版本证据定位失败层；
- 选择最小安全缓解而不是破坏性修复；
- 使用 canary、rollback、正负测试或 reconciliation 验证恢复；
- 在不夸大结论的前提下向客户给出更新时间。

### API integration and distributed reliability

已有较系统的 OAuth、Content-Type、分页、Webhook、幂等、超时预算、重试退避、
Retry-After、错误契约版本、Correlation ID 和第三方依赖恢复场景。

### RAG and Agent production failure modes

RAG 已覆盖 freshness、chunk boundary、top-k、hybrid search、权限过滤、索引切换和
多区域一致性；Agent 已覆盖 tool schema、tool timeout、indirect prompt injection、
approval boundary、delegation loop 与 guardrail fallback。

### Application-layer security and governance

现有内容对最小权限、fail-closed 授权、PII 日志、Secret 轮换、TLS 主机名、出站
allowlist、跨模型安全降级等实践覆盖较好。

### FDE production judgment

范围控制、成功标准、pilot→production gap、生产就绪、证据沟通、成本/质量权衡和
客户采用失败已经进入真实 Case，不是简单知识问答。

## 3.3 Coverage imbalance

Case 生命周期按原始 literal tag 统计：

| Lifecycle stage   | Case membership |
| ----------------- | --------------: |
| operate           |              44 |
| deploy            |              24 |
| incident-response |              19 |
| build             |              10 |
| design            |               8 |
| integrate         |               8 |
| validate          |               7 |
| evaluate          |               5 |
| discover          |               3 |
| adopt             |               3 |
| pilot             |               2 |

因此当前训练主线是“系统已存在并出现故障后如何处理”，而不是“如何从零设计、实现、
评估并交付一个生产 AI 系统”。此外 lifecycle metadata 同时存在
`discover/discovery`、`adopt/adoption` 两套同义词，直接统计前需要规范化口径。

## 3.4 Structural gaps inside the current knowledge layer

1. **No advanced Foundation**：Foundation schema 支持 advanced，但当前为 0。
2. **No explicit Concept→Skill edge**：50 个 Concept 全部依赖间接推导，无法直接说明
   某个 Concept 训练哪个能力或需要多少证据。
3. **Over-compressed networking concepts**：17 个 Network Foundation 只映射到 4 个
   Concept；`concept.request-response` 一项承载 11 个 HTTP Foundation。
4. **Concept without dedicated Foundation**：Cache、Queue、Incident、Memory、MVP、
   SLO、SLA、Trade-off 等 Concept 主要通过旁路 Foundation 拼接，没有专门知识单元。
5. **Empty reserved directories**：`cloud`、`database`、`docker`、`fine-tuning`、
   `linux`、`programming` 目前只有 `.gitkeep`。
6. **Coarse mastery buckets**：15 个 Skill 都是宏观 Domain 级能力，无法诊断具体缺口。
7. **Case reuse concentration**：部分 Case 被大量 Foundation 重复引用；引用完整不等于
   情境多样性充足。

---

# 4. Missing Areas for a Production AI Engineer

## 4.1 Not represented as first-class, independently measurable capability

| Missing area                     | Current evidence                                                        | What is still missing                                                                    | Priority |
| -------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Programming / Python engineering | 只有通用 software Foundation 与 1 个 Python 配置案；`programming/` 为空 | Python 工程结构、类型、依赖、异步、并发、测试、性能与调试                                | P0       |
| Backend service engineering      | 有 Backend / Service / Database Concept 和 API 故障案                   | 服务分层、业务边界、事务、并发、异步任务、缓存策略、后台作业与服务测试                   | P0       |
| Testing and delivery engineering | Skill 描述提到 testing，现有 Git 只有 2 个 beginner 案                  | 单元/集成/契约/E2E 测试、CI/CD、PR review、release automation、artifact provenance       | P0       |
| Solution and system architecture | 分散在 trade-off、production readiness 与少量高级 Case                  | 需求到架构、容量模型、组件边界、ADR、多租户、数据流和端到端设计评审                      | P0       |
| Platform / IaC engineering       | Cloud Case 有 10 个，但 `cloud/`、`docker/`、`linux/` Foundation 为空   | IaC、VPC/IAM、LB、autoscaling、Kubernetes primitives、service mesh、serverless、环境治理 | P0       |
| Cost / AI FinOps                 | performance Skill 有 9 案，显式 cost risk 只有少量                      | 单位经济、预算/归因、token/GPU 成本模型、batch/cache/routing 策略、容量与质量门槛        | P1       |
| AI product and human loop        | 有采用率下降与 guardrail/fallback 案                                    | AI UX、信任校准、反馈闭环、可解释失败、人工审批体验、A/B 测试与可访问性                  | P1       |

## 4.2 Present, but not yet production-depth

| Area                            | Current strength                                                     | Missing production depth                                                                                            | Priority |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| Cloud deployment                | Docker、Readiness、K8s Secret、GPU 和流式过载 Case                   | 系统化平台知识、IaC、网络、autoscaling、发布平台与多环境治理                                                        | P0       |
| Observability / SRE             | Reliability 标签 25；日志、监控、SLO/SLA、Correlation ID 已出现      | Metrics 设计、distributed tracing、alert engineering、error budget、incident command、postmortem、chaos/load test   | P0       |
| Security engineering            | Auth、RAG 权限、PII、Secret、TLS、prompt injection、guardrail 已覆盖 | Threat modeling、secure SDLC、漏洞治理、供应链/SBOM、KMS/加密、租户隔离、合规控制映射                               | P0       |
| Data engineering                | 7 案覆盖 null、cursor、watermark、schema migration、index cutover    | 数据建模、SQL、查询性能、事务、CDC、stream processing、lineage/catalog 与数据质量运营                               | P1       |
| Evaluation engineering          | 有 eval dataset/metrics、污染、量化和路由回退                        | Offline/online eval、统计置信度、人工 rubric、evaluator calibration、RAG/Agent trajectory eval、回归门禁            | P0       |
| Agent production patterns       | Tool schema、timeout、approval、delegation、injection 已较好         | Durable workflow、checkpoint/replay、HITL、memory lifecycle、tool registry/versioning、sandbox、agent observability | P0       |
| Fine-tuning / MLOps             | 1 个 Foundation、4 个相关 Case                                       | 4 个 Case 全是 serving；缺数据准备、标注、adapter/LoRA、超参、训练评估、experiment/model registry、上线决策         | P0       |
| Network platform depth          | 17 Foundation，但只有 4 个相关 active Case                           | Proxy/LB/NAT/routing、CDN、connection pool、service discovery、service mesh 与 cloud networking                     | P1       |
| Customer discovery and adoption | 有成功标准、范围扩张、pilot gap、采用下降                            | 系统访谈、workflow mapping、stakeholder conflict、价值排序、enablement、change management 与长期移交                | P0       |
| Commercial FDE                  | 成本/质量与客户沟通已零散出现                                        | ROI/TCO、business case、机会资格、采购/安全评审、合同/定价、executive steering、renewal/expansion                   | P1       |

## 4.3 Recommended capability decomposition

后续课程审查时，建议把当前 15 个大 Skill 视为“能力域”，而不是最终可评分 Skill。
至少需要在设计层面考虑以下可独立举证的子能力：

```text
AI Application Engineering
├── Prompt & Context Engineering
├── Structured Output & Model Routing
├── Evaluation Engineering
└── AI Product / Human Feedback Loop

RAG Engineering
├── Ingestion & Chunking
├── Embedding & Index Lifecycle
├── Retrieval & Reranking
├── Grounding & Citation
├── Authorization & Freshness
└── RAG Evaluation

Agent Engineering
├── Tool Contract Design
├── Workflow / State / Memory
├── Permissions & Human Approval
├── Retry / Idempotency / Durable Execution
├── Multi-agent Coordination
└── Agent Evaluation & Observability

Production Engineering
├── Backend & API Design
├── Data Engineering
├── Cloud / Containers / IaC
├── Observability / Reliability
├── Security / Privacy / Governance
├── Performance / Capacity / Cost
└── Model Serving / MLOps

FDE Delivery
├── Discovery & Scoping
├── Architecture & PoC
├── Success Criteria & Evaluation
├── Production Readiness
├── Adoption & Enablement
└── Customer / Executive Communication
```

---

# 5. Suggested FDE Growth Route for Curriculum Redesign

这不是代码改造方案，而是基于当前内容缺口得出的课程编排建议。

## Stage 0 — Engineering Operating Literacy

- Python、Git、Linux、Terminal、Process、Filesystem、Configuration
- HTTP / DNS / TCP / TLS
- 基础调试和证据阅读
- Exit evidence：能独立运行、配置、观测并定位一个本地服务问题

## Stage 1 — Service and Integration Engineering

- Backend service、REST/API design、Auth、Webhook、Idempotency
- Database、Queue、Cache、Data contract
- Testing、CI/CD、版本与发布
- Exit evidence：能构建并验证一个可重试、可观测、契约稳定的服务集成

## Stage 2 — LLM Application Engineering

- Token / Context / Prompt / Structured Output
- Model selection、cost boundary、offline eval
- Safety baseline
- Exit evidence：能用独立评估集证明一个 LLM feature 的质量与失败边界

## Stage 3 — RAG and Agent Engineering

- RAG ingestion→retrieval→rerank→grounding→authorization→evaluation
- Agent tool contract→state→memory→approval→durable execution→evaluation
- Exit evidence：能构建并解释一个有权限边界、引用和失败恢复的 AI workflow

## Stage 4 — Production AI Systems

- Cloud、containers、Kubernetes/IaC
- Observability、SLO、incident、rollback
- Security、privacy、governance
- Capacity、latency、GPU/token cost、model serving
- Exit evidence：能完成 production readiness review、canary、failure drill 和成本评审

## Stage 5 — Field Delivery Engineering

- Discovery、scoping、architecture、PoC、success criteria
- Pilot→production、adoption、enablement、change management
- Customer / executive communication、ROI/TCO、handoff
- Exit evidence：能把模糊客户问题推进为有证据、可运营、被采用的生产系统

当前内容可以直接支撑 Stage 2–4 的部分训练，也已拥有 Stage 5 的方法论骨架；最需要
优先补齐的是 Stage 0–1 的工程基础、Stage 4 的系统化生产知识，以及 Stage 5 的完整
绿地交付闭环。

---

# 6. Final Review Verdict

当前 Knowledge System 的“引用闭环”已经成立，但“课程闭环”尚未成立。

- **内容完整性：强** — 100 Foundation、50 Concept、15 Skill、50 active Case 均可解析。
- **生产排障真实性：强** — Case 不是知识问答，能够训练证据、风险、恢复与验证判断。
- **知识难度纵深：不足** — Advanced Foundation 为 0，很多生产主题只有 Case 没有系统先修。
- **能力可诊断性：不足** — 15 个 Skill 太粗，Concept 又没有直接 Skill edge。
- **成长路线连续性：不足** — 编程→服务→AI→生产→客户交付之间仍有显著跳跃。
- **题库规模：早期阶段** — 当前活动 Case 为规划目标的 13.8%。

因此下一步课程设计的重点不应只是继续横向增加零散 Foundation 或 Case，而应先确定：

1. Production AI Engineer 的分阶段 exit evidence；
2. 每个宏观 Domain 下可独立评分的子 Skill；
3. Foundation→Concept→Case 的明确先修序列；
4. 绿地构建、生产运营、客户采用三类 Case 的平衡；
5. Advanced Foundation 与端到端项目型 Case 的内容标准。

本报告仅新增此 Markdown 文件；没有修改任何项目代码、内容 JSON、Manifest、Schema、
生成索引或运行时数据。
