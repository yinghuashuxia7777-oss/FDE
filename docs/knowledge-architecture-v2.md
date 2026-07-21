# AI Growth OS Knowledge Architecture V2

> 目标角色：Production AI Engineer / AI FDE
> 设计日期：2026-07-17
> 文档性质：知识架构设计，不是实施变更
> 本阶段约束：不修改代码、Schema、Content Pack、Foundation、Concept、Case、Skill、Manifest 或数据库

## Executive Decision

当前系统已经建立了可靠的内容与证据底座，但课程重心明显偏向“系统出故障后如何诊断”，还不足以证明一个学习者能从需求出发，完成设计、构建、评估、部署、运营和客户交付。

V2 推荐采用“策展式能力图”，而不是重建一套 AI 技术百科：

1. 保留当前 100 Foundation、50 Concept、15 个 Skill、50 个活动 Case 的稳定 ID 和历史证据。
2. 将当前 15 个 Skill 保留为兼容聚合层，在其下规划 70 个可独立举证的叶子 Skill。
3. 把知识链路从“阅读后直接跳 Case”补成：

   ```text
   Foundation / Knowledge Primitive
       ↓
   Concept / Decision Model
       ↓
   Practice / Focused Transfer
       ↓
   Case / Integrated Judgment
       ↓
   Mastery Evidence
       ↓
   Skill / Capability Profile

   Project = 多个 Case 与真实产物组成的综合 Evidence Pack
   ```

4. 将 362 Case 规划从重事故标签改为唯一主类型配额：Build、Design、Integrate、Evaluate 合计 58.6%，Incident 主类型控制在 9.4%。
5. 只有能改变工程决策、进入 Practice / Case 并产生可验证证据的知识，才进入 V2；不按名词数量扩充。

这份文档定义目标模型和后续实施门槛，不授权本轮实施任何结构或内容变更。

---

# 1. Current System Assessment

## 1.1 审查口径

本设计读取的事实来源：

- Foundation：`content/foundation/**/*.json`
- Concept：`content/concepts/**/*.json`
- Domain：`content/domains/*.json`
- Skill：`content/skills/*.json`
- Case：`content/cases/{beginner,intermediate,advanced}/*.vN.json`
- 活动 Case 版本：`content/manifests/content-config.json.activeCases`
- 内容清单：`content/manifests/content-manifest.json`
- Coverage 计划与报告：`content/coverage/coverage-plan.json`、`content/manifests/coverage-report.json`
- 现有 Schema：`content/schemas/*.schema.json`

计数以活动 `(caseId, version)` 为准。Domain、Skill 和 lifecycle 都是多标签，不能把各标签数量相加当作 Case 总数。

## 1.2 当前量化基线

| 项目 | 当前状态 | 关键含义 |
|---|---:|---|
| Foundation | 100 | 44 beginner、56 intermediate、0 advanced |
| Concept | 50 | 12 API/Backend、13 System、15 AI、10 FDE |
| Active Domain / Skill | 15 / 15 | 严格一 Domain 对一 Skill，粒度过粗 |
| 活动 Case | 50 | 22 beginner、18 intermediate、10 advanced |
| Case 版本文件 | 53 | 3 个历史版本仍被保留，版本机制正确 |
| 规划 Case | 362 | 当前完成 13.8%，剩余 312 |
| Foundation→Skill 引用 | 205 | 知识与能力已有关系，但集中到 15 个大桶 |
| Foundation→Case 引用 | 162 | 引用完整不等于情境多样性充分 |
| Concept→Foundation 引用 | 142 | 部分 Concept 负载过大 |
| Concept→Case 引用 | 119 | 9 个 Concept 只关联 1 个 Case |
| Case Domain membership | 129 | 平均 2.58 个 Domain / Case，不能作为互斥产量口径 |
| Case nodes / 场景 evidence | 138 / 294 | 每案约 2.76 个节点；证据输入丰富 |

现有 100 Foundation、50 Concept、15 Skill 和 50 个活动 Case 的引用均可解析。这说明“内容完整性底座”已经成立，V2 不应重新初始化或推翻它。

## 1.3 Strengths

### Evidence driven

- Case 普遍要求阅读日志、配置、HTTP、指标、Diff、架构图或客户消息后再决策。
- Attempt 已通过稳定 `caseId + caseVersion` 保存历史，适合长期能力档案。
- Critical error、根因、修复和验证已经进入内容标准，不是简单知识问答。

### Case based learning

- 28 个中高级活动 Case 中有 26 个跨至少 3 个 Domain，能表达真实工程问题的多约束特征。
- RAG 权限、Agent 审批、重试风暴、模型路由、索引切换、PII、TLS 等题目具备生产真实性。

### Production debugging

- “证据优先、最小风险缓解、可回滚、验证后沟通”已经形成清晰的 FDE 判断风格。
- API 集成、可靠性、安全、RAG / Agent 故障模式是当前最成熟资产。

### Content platform integrity

- 稳定 ID、内容版本、活动版本清单、Schema、Coverage 与 Content Pack 已经存在。
- 这使 V2 可以增量演进，而不是用一次性课程文件替换既有内容。

## 1.4 Weaknesses

### Skill 过粗

当前 15 个 Skill 与 15 个 Domain 一一对应，没有父子关系、先修关系、rubric 或 typed edge。Prompt、Structured Output、RAG permission、Agent memory、LLM eval、Kubernetes、Incident Command 等不同能力被压进同一个宏观分数，Capability Profile 难以解释“用户到底会什么”。

### Foundation 缺少工程纵深

- `programming`、`linux`、`database`、`docker`、`cloud`、`fine-tuning` 物理目录仍为空壳。
- Foundation 没有 advanced 内容；但 Case 已有 10 个 advanced，学习者会从基础概念直接跳进多约束生产判断。
- 现有 939 分钟 Foundation 更擅长解释 API / 网络 / AI 名词，不足以支持写代码、测试、构建服务和部署平台。

### Concept 缺少“决策桥梁”结构

- 50 个 Concept 都没有直接 Skill 标签、难度或先修关系。
- `concept.request-response` 关联 11 个 Foundation，`concept.backend` 和 `concept.production-environment` 各关联 7 个，已经超出单一决策模型的合理负载。
- 当前没有 Practice 层，学习者从说明性内容直接进入多节点 Case。

### Case 偏 incident / operate

原始 lifecycle 为多标签，50 个活动 Case 共有 138 次标记：

| Lifecycle | Case 数 | 占活动 Case |
|---|---:|---:|
| Operate | 44 | 88% |
| Deploy | 24 | 48% |
| Incident Response | 19 | 38% |
| Build | 10 | 20% |
| Design | 8 | 16% |
| Integrate | 8 | 16% |
| Validate | 7 | 14% |
| Evaluate | 5 | 10% |
| Customer 相关阶段并集 | 7 | 14% |

节点同样偏诊断和审查：39 个 Case 有 `architecture-tradeoff`，32 个有 `log-analysis`，28 个有 `configuration-review`；只有 6 个有 `diff-review`，3 个有 `evidence-conclusion`。

因此当前主要证明的是“能否判断已有系统的问题”，而不是“能否产出一个可运行、可测试、可评估、可部署的系统”。

### Coverage 报告容易被误读

`coverage-report.json` 的 `passed: true` 代表当前没有 error 级结构问题，不代表 362 Case 的课程覆盖已经完成。`reliability` 已有 25 次 Domain membership，甚至超过计划 24，但整个题库仍只有 50 个活动 Case。这进一步证明 Domain membership 不能作为制作配额。

## 1.5 当前结论

当前产品应被定义为：

> 一个强证据、强生产判断、强事故诊断的 FDE Case System，正在向完整 Production AI Engineer Growth System 过渡。

需要保留的是证据驱动和版本兼容；需要补齐的是构建能力、服务工程、系统评估、生产化、项目交付和可解释的细粒度能力证明。

---

# 2. Production AI Engineer Capability Model

## 2.1 两个容易混淆的轴

- **Level 0–6**：课程中的责任范围和系统复杂度，不是用户分数。
- **Mastery state**：用户在某个叶子 Skill 上的证据状态，例如待验证、学习中、胜任、熟练。

用户不应因为“看完 Level 3 内容”就获得 Level 3 能力。能力必须由 Case / Project 的行为证据证明。

## 2.2 Level 0–6 目标模型

| Level | Capability Domain | 核心范围 | Exit evidence：离开该层前必须能证明 |
|---:|---|---|---|
| 0 | Engineering Foundation | Python、Linux、Git、Network、Database、Testing、Debugging | 能运行和配置一个本地服务，用可复现证据定位代码、依赖、网络或数据问题，并提交测试过的修复 |
| 1 | Software & Service Engineering | Backend、API、Auth、Transaction、Cache、Queue、Architecture、CI/CD | 能设计并构建一个有契约、有测试、可重试、可发布、可回滚的服务集成 |
| 2 | AI Application Engineering | LLM、Prompt、Context、Structured Output、Model Selection、Evaluation | 能交付一个有独立评估集、结构化边界、失败策略和质量/成本说明的 LLM feature |
| 3 | RAG Engineering | Ingestion、Chunking、Embedding、Retrieval、Rerank、Grounding、Permission、Evaluation | 能构建一个有引用、权限、freshness 与评估报告的生产候选 RAG pipeline |
| 4 | Agent Engineering | Tool、Workflow、State、Memory、HITL、Recovery、Eval、Safety | 能构建一个可恢复、可审计、最小授权、关键动作需审批的 Agent workflow |
| 5 | Production AI Systems | Cloud、Kubernetes、IaC、Observability、Reliability、Security、Cost、Model Serving | 能完成 production readiness review、灰度发布、故障演练、SLO 与成本评审 |
| 6 | FDE Delivery | Discovery、Requirement、Architecture、PoC、Communication、Adoption、ROI | 能把模糊客户问题推进为可验收、可运营、被采用且价值可解释的生产系统 |

## 2.3 学习路径不是一条死链

建议的主干是：

```text
L0 Engineering Foundation
          ↓
L1 Software & Service Engineering
          ↓
L2 AI Application Engineering
       ↙                       ↘
L3 RAG Engineering        L4 Agent Engineering
       ↘                       ↙
       L5 Production AI Systems
                   ↓
             L6 FDE Delivery
```

重要约束：

- L3 RAG 与 L4 Agent 是可组合分支，不要求所有 Agent 学习者先精通全部 RAG。
- L6 是综合交付责任，不代表 discovery 只能最后学；客户问题与成功标准应从早期 Practice 就进入上下文。
- 先修只影响“是否能授予胜任/熟练”，不应阻止用户提前尝试 Case。

---

# 3. Skill Graph V2 Design

## 3.1 设计选择

推荐采用：

```text
70 个 V2 叶子 Skill（独立 rubric、独立 evidence、独立 mastery）
                         │ rolls-up-to
                         ↓
15 个现有 Skill（legacy aggregate，保留稳定 ID 与历史证据）
```

不推荐全量替换当前 15 个 Skill，也不推荐继续只靠标签细分。全量替换会破坏历史 Attempt / Mastery 的可解释性；只加标签仍无法形成独立能力证明。

以下 ID 是设计建议，尚未创建。每个叶子 Skill 的“主要掌握证据”指学习者产出的可审计结果，不是题目展示给用户的素材；“主要 Case”是课程主类型，不是 UI 题型。

## 3.2 Level 0 — Engineering Foundation（9）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `eng.python-runtime` | Python 代码、模块与运行行为 | 可运行代码、运行输出、行为解释 | Build |
| `eng.python-packaging` | 依赖、虚拟环境、锁文件与可复现构建 | 依赖清单、锁文件 Diff、重现记录 | Build / Incident |
| `eng.python-concurrency` | async、并发、取消与资源边界 | 并发测试、trace、取消行为证明 | Build / Evaluate |
| `eng.linux-runtime` | 进程、文件、权限、信号与服务运行 | Terminal transcript、进程/权限证据 | Operate / Incident |
| `eng.git-collaboration` | 变更历史、分支、合并与审查 | Commit / Diff / review evidence | Build / Integrate |
| `eng.network-diagnostics` | DNS、TCP、TLS、HTTP 与端口诊断 | 请求链、终端输出、分层结论 | Integrate / Incident |
| `eng.database-fundamentals` | SQL、Schema、索引与持久状态 | Schema、查询、结果与解释 | Build / Evaluate |
| `eng.automated-testing` | 单元测试、fixture、mock 与失败定位 | 测试套件和确定性运行结果 | Build / Evaluate |
| `eng.evidence-debugging` | 假设树、证据收敛与根因验证 | 假设日志、证据选择、验证结论 | Incident / Evaluate |

## 3.3 Level 1 — Software & Service Engineering（10）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `software.service-boundaries` | Backend 分层、职责和服务边界 | 组件图、接口与边界说明 | Design / Build |
| `software.api-contracts` | API、错误契约、分页与版本兼容 | OpenAPI / JSON Schema、契约测试 | Design / Integrate |
| `software.identity-integration` | Authentication、Authorization、OAuth | 权限矩阵、授权流程、集成 trace | Integrate / Evaluate |
| `software.data-transactions` | 数据建模、事务、一致性与迁移 | ERD、migration、事务测试 | Design / Build |
| `software.cache-consistency` | 缓存键、TTL、失效与一致性 | Cache policy、失效测试、指标 | Design / Operate |
| `software.event-delivery` | Queue、Webhook、顺序、确认和幂等 | 事件契约、重放/重复测试 | Design / Integrate |
| `software.test-strategy` | 单元、集成、契约与 E2E 组合 | 测试策略、覆盖矩阵、失败报告 | Design / Evaluate |
| `software.architecture-decisions` | Trade-off、ADR、容量与演进边界 | ADR、备选方案和决策证据 | Design |
| `software.cicd-release` | CI、artifact provenance、发布与回滚 | Pipeline、制品摘要、回滚证明 | Deploy |
| `software.distributed-resilience` | Timeout、Retry、Idempotency、Bulkhead | 故障注入、重试/降级验证 | Design / Incident |

## 3.4 Level 2 — AI Application Engineering（8）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `ai.prompt-instruction` | 指令层级、任务边界与不可信数据隔离 | Prompt Diff、测试集结果 | Build / Evaluate |
| `ai.context-engineering` | 上下文选择、预算、顺序和压缩 | Context policy、ablation 报告 | Design / Evaluate |
| `ai.structured-output` | Schema、解析、校验与失败恢复 | Schema、parser、contract tests | Build / Integrate |
| `ai.model-selection` | 模型选择、路由、fallback 与版本 | Routing ADR、基线比较 | Design / Evaluate |
| `ai.llm-evaluation` | 数据集、rubric、离线/在线评估与回归 | Eval set、rubric、统计报告 | Evaluate |
| `ai.guardrails` | 输入、输出、策略和业务护栏 | Threat cases、policy tests、失败边界 | Evaluate / Operate |
| `ai.product-fallback` | AI UX、信任校准、人工接管和可解释失败 | 用户流程、fallback test、反馈分析 | Design / Customer |
| `ai.quality-cost-latency` | 质量、延迟、容量与单位成本权衡 | Pareto 报告、预算与选择理由 | Evaluate / Design |

LLM mechanics、Token 与生成随机性仍是本层必需 Foundation / Concept 前置，但不单独授予叶子 mastery；其理解必须在 Prompt、Context、Model Selection 与 Evaluation 的行为证据中体现。

## 3.5 Level 3 — RAG Engineering（9）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `rag.ingestion` | 数据摄取、解析、清洗与血缘 | Ingestion pipeline、data contract | Build / Integrate |
| `rag.chunking` | 语义边界、重叠、结构与授权边界 | Chunk corpus、ablation 结果 | Build / Evaluate |
| `rag.embedding-index` | Embedding 选择、索引与生命周期 | Index config、版本/删除验证 | Build / Deploy |
| `rag.retrieval` | Query understanding、稀疏/稠密/混合召回与阈值 | Retrieval metrics、对照实验、失败样本 | Build / Evaluate |
| `rag.reranking` | Reranker、候选预算与排序质量 | Rerank benchmark、延迟报告 | Evaluate |
| `rag.grounding-citation` | 依据、引用、claim verification | Claim/source 对齐报告 | Build / Evaluate |
| `rag.permission-filtering` | Tenant、ACL、metadata 与 fail-closed | 权限矩阵、越权负测试 | Integrate / Evaluate |
| `rag.freshness-versioning` | 更新、删除、缓存与索引切换 | Freshness SLO、cutover/rollback 证明 | Deploy / Operate |
| `rag.evaluation` | Golden queries、检索/回答分层评估 | RAG eval report、failure taxonomy | Evaluate |

## 3.6 Level 4 — Agent Engineering（9）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `agent.tool-contracts` | Tool schema、参数、结果与版本契约 | Tool contract、schema tests | Build / Integrate |
| `agent.workflow-orchestration` | 步骤编排、分支、终止和业务约束 | Workflow diagram、trajectory tests | Design / Build |
| `agent.state-checkpoint` | State、checkpoint、resume 与 replay | State model、恢复演练 | Build / Incident |
| `agent.memory-lifecycle` | Memory 写入、检索、隔离、过期与污染 | Memory policy、隔离/删除测试 | Design / Evaluate |
| `agent.human-approval` | HITL、审批权限、升级和超时 | Approval state machine、绕过负测试 | Design / Evaluate |
| `agent.failure-recovery` | Tool timeout、未知结果、补偿和幂等 | Failure injection、recovery trace | Evaluate / Incident |
| `agent.evaluation` | Trajectory、tool use、goal 与 safety eval | Agent eval suite、失败分类 | Evaluate |
| `agent.safety-authorization` | 最小权限、prompt injection 与副作用控制 | Threat model、policy tests、audit | Evaluate / Operate |
| `agent.observability-audit` | Trace、decision log、成本与审计重放 | Trace pack、audit replay、dashboard | Operate / Incident |

## 3.7 Level 5 — Production AI Systems（18）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `prod.containerization` | Image、runtime、health、resource 与运行安全 | Dockerfile、image scan、readiness 证明 | Build / Deploy |
| `prod.kubernetes` | Workload、service、secret、autoscaling 与调度 | Manifest、rollout、failure drill | Deploy / Operate |
| `prod.cloud-networking` | VPC、routing、private endpoint、load balancer | 网络架构、route proof、连通性负测试 | Design / Integrate |
| `prod.identity-access` | IAM、service identity、secret 与最小权限 | Access matrix、policy、拒绝路径测试 | Design / Evaluate |
| `prod.infrastructure-as-code` | IaC、环境差异、review 与 drift | IaC plan、review、drift report | Build / Deploy |
| `prod.data-pipelines` | Batch/stream、checkpoint、replay 与 data quality | Pipeline、replay proof、quality SLO | Build / Operate |
| `prod.data-governance` | Lineage、catalog、retention 与 policy | Lineage graph、data card、audit evidence | Design / Operate |
| `prod.observability` | Logs、metrics、traces、correlation 与 alert | Dashboard、query、alert validation | Operate / Incident |
| `prod.reliability-slo` | SLO、error budget、resilience 与 runbook | SLO、failure drill、resilience verification | Design / Operate |
| `prod.incident-command` | Triage、containment、timeline、RCA 与 corrective action | Decision log、RCA、action verification | Incident / Customer |
| `prod.security-engineering` | Threat model、secure SDLC、tenant isolation 与漏洞控制 | Threat model、negative tests、control evidence | Design / Evaluate |
| `prod.privacy-governance` | Data classification、minimization、retention 与 audit | Data flow、privacy review、audit evidence | Design / Customer |
| `prod.supply-chain-security` | Dependency、SBOM、provenance、signing 与 verification | SBOM、签名、provenance verification | Build / Deploy |
| `prod.model-serving` | Serving runtime、batching、quantization 与 GPU 利用 | Serving manifest、benchmark、failure test | Build / Deploy |
| `prod.mlops-lifecycle` | Experiment、registry、版本、drift 与 release gate | Model card、registry lineage、eval gate | Evaluate / Deploy |
| `prod.capacity-backpressure` | Capacity、queueing、load shedding 与 autoscaling | Load test、capacity model、drill | Evaluate / Incident |
| `prod.cost-optimization` | Token/GPU/cloud 归因、预算和 FinOps | Unit economics、cost dashboard、ADR | Evaluate / Operate |
| `prod.release-verification` | Canary、migration、rollback 与 production readiness | Release plan、verification、rollback | Deploy / Operate |

## 3.8 Level 6 — FDE Delivery（7）

| 建议稳定 ID | 叶子能力 | 主要掌握证据 | 主要 Case |
|---|---|---|---|
| `fde.discovery-scoping` | Workflow discovery、问题界定和范围控制 | 访谈摘要、problem statement、scope | Customer |
| `fde.requirements-success` | 需求、约束、成功标准与验收 | Requirements matrix、acceptance rubric | Customer / Design |
| `fde.solution-architecture` | 从客户约束到可演进方案 | Solution ADR、架构图、风险清单 | Design / Customer |
| `fde.poc-pilot` | 假设、MVP/PoC、实验与生产差距 | Experiment plan、结果、gap report | Build / Customer |
| `fde.stakeholder-communication` | 事实、未知、影响、计划和高管沟通 | Status update、decision memo | Customer / Incident |
| `fde.adoption-enablement` | Workflow 采用、培训、fallback 与变更管理 | Adoption plan、enablement evidence | Customer / Operate |
| `fde.value-roi` | ROI、TCO、价值归因与优先级 | Business case、value realization | Customer / Evaluate |

## 3.9 先修关系与关键跨域边

建议图关系必须显式保存，不能从点号 ID 推断。首批关键边：

```text
eng.python-runtime → eng.python-packaging → software.service-boundaries
eng.network-diagnostics → software.api-contracts
eng.database-fundamentals → software.data-transactions
eng.automated-testing → software.test-strategy → software.cicd-release

software.api-contracts + ai.structured-output → agent.tool-contracts
software.data-transactions → rag.ingestion
ai.llm-evaluation → rag.evaluation + agent.evaluation
rag.retrieval + prod.identity-access → rag.permission-filtering
agent.workflow-orchestration → agent.state-checkpoint → agent.failure-recovery
agent.state-checkpoint → agent.memory-lifecycle

prod.kubernetes + prod.reliability-slo + prod.capacity-backpressure
    → prod.release-verification

fde.discovery-scoping → fde.requirements-success → fde.solution-architecture
fde.solution-architecture + fde.poc-pilot + prod.release-verification
    → Project G6 Customer Defense / operational handoff
```

## 3.10 Legacy 15 Skill 兼容映射

| 现有聚合 Skill | V2 主要叶子范围 |
|---|---|
| `software.foundations` | `eng.python-*`、testing/debugging、service boundaries、test strategy、architecture decisions |
| `git.delivery` | `eng.git-collaboration`、`software.cicd-release`、`prod.release-verification` |
| `systems.networking` | Linux runtime、network diagnostics、runtime configuration、cloud networking |
| `api.integration` | API contracts、identity、event delivery、distributed resilience |
| `data.engineering` | Database、data transactions、data pipelines、data governance |
| `cloud.deployment` | Container、Kubernetes、cloud networking、IAM、IaC、release verification |
| `reliability.observability` | Evidence debugging、distributed resilience、observability、SLO、incident command、release |
| `security.governance` | Identity、AI guardrails、RAG permission、Agent authorization、security、privacy、supply chain |
| `performance.scaling` | AI quality/cost/latency、capacity/backpressure、model serving、cost optimization |
| `llm.applications` | Level 2 的 9 个 AI Application Skill |
| `rag.search` | Level 3 的 10 个 RAG Skill |
| `agents.evaluation` | Level 4 的 10 个 Agent Skill |
| `tuning.inference-deployment` | Model selection、LLM eval、model serving、MLOps lifecycle、release verification |
| `customer.discovery` | Discovery、requirements、solution architecture、value/ROI |
| `fde.adoption` | PoC/pilot、communication、adoption；handoff 由 Project evidence gate 综合证明 |

兼容原则：

1. 旧 Skill ID 永久保留，历史 Attempt / Mastery 不重写。
2. 新 Case 或新 CaseVersion 未来直接归因叶子 Skill；同一证据不得同时作为 legacy 和 leaf 两份样本重复计分。
3. 旧证据只有经过人工审核的 `(caseId, caseVersion, nodeId) → leafSkillIds` attribution map 才能回填；不得把旧总分平均拆给多个叶子。
4. Legacy 分数作为兼容聚合视图；V2 Capability Profile 以叶子证据为主，并标明 legacy-only evidence 的较低可解释置信度。
5. ID 永不复用；退出使用只改变状态，不改变历史含义。

## 3.11 能力证据门槛建议

此处是未来 rubric 设计原则，不是本轮对 Mastery 算法的修改：

- 阅读 Foundation / Concept 不产生正式 mastery。
- 重复同一 Case 不能无限增加独立样本数。
- `Competent` 至少需要 3 个独立 Case、2 种主类型、无未修复 critical error。
- `Proficient` 至少需要 5 个独立 Case、3 种主类型，并包含一次 Project 或跨环境迁移证据。
- AI Mentor 解释不能直接成为掌握证据；必须经过确定性 rubric 或人工确认。
- Recency 只降低置信度，不删除历史事实。

---

# 4. Knowledge Layer Redesign

## 4.1 每一层只承担一种责任

| 层 | V2 定义 | 必须回答 | 不应该做 |
|---|---|---|---|
| Foundation | 一个耐久的知识原语 | “这个机制是什么，边界在哪里？” | 厂商功能列表、新闻、宽泛综述 |
| Concept | 可复用的决策模型 | “何时使用，如何在两个选择间判断？” | 只换一种说法重复 Foundation |
| Practice | 3–8 分钟的单点迁移 | “能否在低噪声情境中执行一个动作？” | 冒充完整客户 Case |
| Case | 多概念、多约束的综合判断 | “能否基于证据作出安全决策并验证？” | 记忆题、装饰性证据 |
| Evidence | 可审计的输入或掌握样本 | “什么事实支撑什么结论？” | 直接泄露答案或只做附件 |
| Project | 多阶段交付和证据防守 | “能否把多个能力组合成可运行结果？” | 仅用完成进度代替工程产物 |

## 4.2 Foundation：保留、重分类、拆分、新增

### 保留

当前 100 条全部作为稳定 ID 迁移基线。一个 active Foundation 应满足：

- 只有一个可独立掌握的机制、边界或诊断原则；
- 有明确学习目标和一个可观察误区；
- 至少支持一个 Practice；
- 内容耐久，不依赖短期版本细节；
- 能改变后续工程判断。

### 重分类为 primer，而不是删除

以下 9 条更像总览入口，不宜与原子知识使用相同掌握权重：

- `api-basic`
- `http-request-basic`
- `api.token-authentication`
- `api.timeout-retry`
- `api.webhook-idempotency`
- `rag-basic`
- `agent-basic`
- `agent.tool-calling`
- `ai.evaluation-guardrails`

未来可保留原 ID 和阅读入口，但详细掌握应由细分 Foundation、Practice 和 Case 证明。

V2 当前不建议物理合并或删除任何 Foundation。这里的“合并”先发生在学习入口与 primer 编排层；只有 Practice 审核证明两个稳定 ID 始终服务同一决策、同一证据和同一错误模式时，才在未来版本中选择 canonical 条目并把旧 ID 保留为 alias / redirect。

### 拆分门槛

只有在一个 Foundation 包含两个可独立失败的决策、需要不同证据或不同练习时才拆分。不因文章较长、术语多或关联多个 Skill 自动拆分。

### 新增门槛

只有当缺失知识会阻断 Practice / Case，且至少有两个下游消费者，或属于授权、数据破坏等高风险必要知识时才新增。advanced 能力优先由多约束 Practice / Case 表达，不能通过堆“高级知识卡”制造深度。

## 4.3 Concept：从术语卡变成决策模型

每个 Concept 必须明确：

1. 使用情境；
2. 核心 decision question；
3. 会改变结论的证据；
4. 常见反例与可观察风险；
5. 关联的叶子 Skill 和至少一个 Practice。

建议一个 Concept 关联 2–6 个 Foundation；超过 6 个强制拆分审查。

### 必须拆分审查的 3 个过载 Concept

| 当前 Concept | 当前负载 | V2 建议 |
|---|---:|---|
| `concept.request-response` | 11 Foundation | 保留为请求构造；将状态码与响应语义拆为 `concept.http-outcome-semantics` |
| `concept.backend` | 7 Foundation | 保留服务侧职责；将 IP / DNS / TCP / Port 拆为 `concept.network-reachability` |
| `concept.production-environment` | 7 Foundation | 保留生产风险边界；将配置、优先级、路径和权限拆为 `concept.runtime-configuration` |

这些是未来候选设计，不在本阶段创建。

### 条件性合并审查

- `concept.api-key`：若不能形成第二种独立 Practice，可降为 authentication-token 的 facet。
- `concept.chunk`：若不能独立形成两种迁移情境，可并入 RAG ingestion pipeline。
- `concept.rate-limit` 虽然当前关系少，但有独立容量决策与故障模式，倾向保留。
- `metadata / retriever / rerank` 控制不同 RAG 杠杆，应先补 Practice 再决定是否合并。
- `scoping / requirement / poc / mvp` 分别对应不同交付门禁，不因一对一关系自动合并。

## 4.4 Practice：填补认知到综合判断的断层

当前项目没有 Practice 内容目录、Schema 或索引。V2 需要把 Practice 定义为逻辑上的一等层，但是否使用新 Schema 应在实施阶段单独评审，不能在本设计阶段提前改代码。

内容门槛：

- exactly 1 个 primary Concept；
- 1–3 个 Foundation；
- 一个可评分动作和明确错误诊断；
- 3–8 分钟；
- 不包含完整客户故事、长分支或多个互相竞争的目标。

首批目标不是任意数量，而是每个 active Concept 至少一个非同构 Practice。

## 4.5 区分两种 Evidence

- **Scenario Evidence**：题目提供的日志、配置、指标、HTTP、Diff 等观察输入。
- **Mastery Evidence**：用户完成 Practice / Case / Project 后形成的可审计能力样本。

当前 Case 的 294 条 evidence 是丰富的场景输入，但只有 3 个 Case 含显式 `evidence-conclusion` node。V2 内容质量门应要求每个 Case 至少有一次“结论是否被正确证据支撑”的显式评分；不一定要新增题型，也可以由现有节点 rubric 表达。

## 4.6 防百科化五层门槛

| 层 | 硬门槛 | 防百科化门槛 |
|---|---|---|
| Foundation | 1 个学习目标、1 个主要误区、至少 1 个 Practice | 不能只是定义、产品列表或宽泛综述 |
| Concept | Decision question、边界、反例、通常 2–6 Foundation | 单 Foundation Concept 必须证明独立决策价值 |
| Practice | 1 primary Concept、一个可评分动作、明确错误诊断 | 不用长故事掩盖单点能力 |
| Case | 2–5 Concept、约束、权衡、version、evidence-grounded decision | 不能考记忆；不能用证据做装饰 |
| Evidence | 输入有来源/时间/范围；输出可追溯 exact version 和 rubric | 不能把“看过材料”当成能力 |

---

# 5. Missing Knowledge Inventory

## 5.1 P0 — Must Add

P0 表示 V2 能力闭环发布前必须补齐的设计或内容，不代表本轮立即新增。

### Structural P0

| 缺口 | 当前问题 | V2 必须达到 |
|---|---|---|
| 叶子 Skill Graph | 15 个宏观分数无法诊断具体能力 | 冻结 70 个 Skill 的 ID、rubric、roll-up 与先修 DAG |
| Practice bridge | Foundation / Concept 直接跳 Case | 每个 active Concept 至少一个单点 Practice |
| 关系所有权 | Foundation 与 Concept 手工保存反向 Case 引用 | 未来选择一个规范正向来源，反向索引自动生成 |
| Evidence judgment | 证据丰富但显式证据结论评分很少 | 每个 Case 至少一个 evidence-grounded decision |
| 互斥 Case 类型 | lifecycle 是多标签，不能控制作品集 | 每个 Case 未来拥有唯一 primary archetype；其他仍是辅助标签 |
| 兼容归因 | 旧 Skill 证据不能直接拆成叶子 | 保留 legacy evidence；只经审核映射，不平均拆分、不双计 |

### Programming Engineering

- Python 模块与项目结构、typing、错误处理；
- packaging、lockfile、dependency isolation；
- async、concurrency、cancellation；
- unit / integration testing；
- profiler、debugger 与可复现调试。

### Backend Engineering

- 服务边界与后台作业；
- relational data model、transaction、migration；
- cache consistency；
- queue delivery、ack、ordering、duplicate、backlog；
- API contract testing 和 distributed resilience。

### System Architecture

- Component / data flow / trust boundary；
- ADR 与 trade-off；
- multi-tenancy；
- capacity model；
- migration、compatibility 与 rollback design。

### Cloud Engineering

- Docker image/runtime/security；
- Kubernetes primitives 与 scheduling；
- IaC 与 environment drift；
- IAM / secrets / least privilege；
- VPC、routing、private endpoint、load balancer；
- canary、autoscaling 与 production readiness。

### AI Evaluation

- LLM offline / online evaluation；
- RAG retrieval 与 answer 分层评估；
- Agent trajectory / tool / safety evaluation；
- human rubric、evaluator calibration、统计置信度；
- regression gate 与数据泄漏防护。

### Agent Production

- durable workflow；
- checkpoint / replay；
- memory lifecycle；
- HITL 与 approval state；
- tool registry / versioning；
- agent observability、audit 和 failure recovery。

### 三个高复用知识原语

未来优先候选：

- `system.cache-consistency`
- `system.queue-delivery-semantics`
- `ai.memory-state-lifecycle`

它们分别支撑 Backend、Agent、Reliability 等多个下游能力，符合“至少两个消费者”的新增门槛。

## 5.2 P1 — Should Add

| 领域 | 应补内容 | 为什么不是 P0 第一波 |
|---|---|---|
| AI Product Engineering | AI UX、feedback loop、trust calibration、fallback、A/B | 需先有稳定评估与能力 rubric，才能避免只谈体验原则 |
| Cost Optimization | Token/GPU/cloud unit economics、budget、routing、cache/batch | 可在 P0 production 基础上深化 |
| Security Engineering | Threat modeling、secure SDLC、KMS、tenant isolation、SBOM、合规映射 | 现有安全 Case 较强，先补系统化知识与 Build evidence |
| Data Engineering | SQL performance、CDC、stream、lineage、catalog、quality ops | 当前有事故样本，缺端到端建设路径 |
| MLOps | Experiment/model registry、data card、fine-tuning、drift、release decision | 需先建立 evaluation gate 与 model serving 基础 |
| Customer Delivery | stakeholder conflict、enablement、change management、procurement、ROI/TCO | 先冻结 FDE 叶子 Skill 和 Project 证据门 |
| Advanced Production Patterns | backpressure、consistency/cutover、multi-region、multi-agent coordination、platform governance | 应由高级 Practice / Project 驱动，不单独堆知识卡 |

## 5.3 明确不要补什么

- 不补模型发布新闻、厂商控制台功能清单或短期版本说明；
- 不补“100 个 Prompt 技巧”式技巧集合；
- 不补与 Practice / Case / Evidence 无下游关系的术语卡；
- 不补换客户名但决策结构相同的重复事故 Case；
- 不把 advanced 等同于更长、更晦涩的百科文章；
- 不在 Skill rubric 与 Project 证据门冻结前大量生成内容；
- 不把课程完成度、阅读时长或 AI Mentor 文本当作工程能力证据；
- 不因 362 是目标就平均铺满 15 个 Domain membership；Domain 是多标签，不是互斥产量。

---

# 6. Case Portfolio Redesign

## 6.1 先建立唯一主类型

每个 Case 未来必须有且只有一个课程统计用 primary archetype：

- Build：从 0 产出可运行组件；
- Design：架构、边界与权衡；
- Integrate：把系统、数据或第三方能力接通；
- Evaluate：设计评估并解释结果；
- Deploy：发布、迁移和回滚；
- Operate：日常可观测、SLO、容量与治理；
- Incident：故障定位、缓解、恢复和 RCA；
- Customer：发现、范围、沟通、采用和价值交付。

原 `lifecycleStages` 继续表达多阶段语义，primary archetype 只用于互斥作品集规划。当前 50 个 Case 没有该字段；本阶段不修改 Schema。下表中的“当前”仅用首个 lifecycle tag 做临时、可复算的规划映射，并把同义词规范到八类，不能当成已经发布的内容属性。

## 6.2 362 Case 精确组合

| Primary archetype | 当前临时口径 | 最终目标 | 最终比例 | 暂定新增 |
|---|---:|---:|---:|---:|
| Build | 10 | 64 | 17.7% | 54 |
| Design | 8 | 50 | 13.8% | 42 |
| Integrate | 7 | 50 | 13.8% | 43 |
| Evaluate | 1 | 48 | 13.3% | 47 |
| Deploy | 8 | 42 | 11.6% | 34 |
| Operate | 9 | 38 | 10.5% | 29 |
| Incident | 2 | 34 | 9.4% | 32 |
| Customer | 5 | 36 | 9.9% | 31 |
| **合计** | **50** | **362** | **100%** | **312** |

“暂定新增”按当前首标签映射计算，只能作为制作基线。Phase 1 必须由内容 reviewer 对现有 50 个 Case 逐案确认 primary archetype 后再冻结各类新增数量；无论分类如何调整，最终总目标 362、现有总数 50、总增量 312 不变。

组合含义：

- Build + Design + Integrate + Evaluate = 212，占 58.6%，把“创造与证明”变成主线；
- Deploy + Operate + Incident = 114，占 31.5%，保留现有生产真实性；
- Customer = 36，占 9.9%，同时要求其他七类也说明客户影响；
- Evaluate 从当前临时口径的 1 个主类型提升到 48，是最大结构补强；
- Incident 可继续作为 secondary stage 出现在其他 Case 中，但不能继续主导作品集。

## 6.3 新增 312 个的组成

下表同样是待人工重分类现有 50 个 Case 后冻结的组合基线，而不是已写入 Content Pack 的正式配额。

| 类型 | Project milestone Case | 独立/组合训练 Case | 新增合计 |
|---|---:|---:|---:|
| Build | 9 | 45 | 54 |
| Design | 9 | 33 | 42 |
| Integrate | 8 | 35 | 43 |
| Evaluate | 9 | 38 | 47 |
| Deploy | 5 | 29 | 34 |
| Operate | 7 | 22 | 29 |
| Incident | 7 | 25 | 32 |
| Customer | 6 | 25 | 31 |
| **合计** | **60** | **252** | **312** |

一个 Project milestone Case 只能计入一个 primary 配额，不能跨项目或跨类型重复计数。

## 6.4 每个 Case 的能力质量门

未来新 Case 至少应满足：

1. 一个唯一 primary archetype；
2. 1–3 个 primary 叶子 Skill，其他只作 secondary attribution；
3. 2–5 个 Concept；
4. 一个明确产出或决策，不只选择“正确知识点”；
5. 至少一次 evidence-grounded decision；
6. 根因 / 设计理由、修复或行动、验证计划；
7. exact version 与稳定 ID；
8. 与同 Skill 的其他 Case 在客户、系统、证据或约束上至少有一个真实迁移差异。

---

# 7. Project-Based Learning Layer

## 7.1 为什么 Case 不足以证明交付能力

单个 Case 可以证明局部判断，但无法充分证明：

- 学习者能否维持跨阶段的一致架构；
- 能否把代码、测试、评估、部署和运营证据组合起来；
- 能否处理需求变化、trade-off 和长期责任；
- 能否向客户或评审者解释“为什么这样做、如何证明有效”。

因此 Project 不替代 Case。Project 把多个 Case 作为里程碑，并要求一组相互一致、可复验的工程产物。

## 7.2 六个推荐项目方向

### Project 1 — Production RAG Knowledge Assistant（12 milestone Case）

- 能力：架构、ingestion、retrieval、permission、evaluation、deployment、SLO；
- 证据：需求/成功标准、数据与 ACL 模型、ADR、pipeline、golden queries、eval report、API contract、部署/回滚、SLO dashboard、客户验收；
- 主类型配额：Build 3 / Design 2 / Integrate 2 / Evaluate 2 / Deploy 1 / Operate 1 / Customer 1。

### Project 2 — Governed Tool-Using Agent（12）

- 能力：Tool contract、workflow、state、memory、approval、safety、failure recovery；
- 证据：Tool schema、审批状态机、威胁模型、授权/幂等实现、对抗 eval、failure injection trace、runbook、事故复盘、release memo；
- 配额：Build 2 / Design 2 / Integrate 2 / Evaluate 2 / Deploy 1 / Operate 1 / Incident 1 / Customer 1。

### Project 3 — Multi-tenant LLM Gateway（10）

- 能力：API、tenant auth、rate limit、model routing、observability、capacity、cost；
- 证据：OpenAPI、权限策略、routing ADR、load test、cost/quality report、IaC、canary/rollback、capacity RCA；
- 配额：Build 2 / Design 2 / Integrate 2 / Evaluate 1 / Deploy 1 / Operate 1 / Incident 1。

### Project 4 — AI Incident Command Lab（8）

- 能力：telemetry、hypothesis、containment、recovery、RCA、customer communication；
- 证据：Timeline、假设树、trace queries、containment record、recovery proof、RCA、corrective-action verification、客户说明；
- 配额：Design 1 / Evaluate 1 / Operate 2 / Incident 3 / Customer 1。

### Project 5 — Customer PoC → Production（10）

- 能力：discovery、scoping、success criteria、PoC、production gap、adoption；
- 证据：访谈与需求矩阵、risk register、架构、PoC、acceptance eval、production-gap report、rollout/rollback、handoff、adoption / executive readout；
- 配额：Build 1 / Design 1 / Integrate 1 / Evaluate 1 / Deploy 1 / Operate 1 / Incident 1 / Customer 3。

### Project 6 — Fine-tuning & Inference Serving（8）

- 能力：dataset、baseline、model adaptation、serving、quality regression、GPU capacity；
- 证据：Data card、baseline、training config、model card、quantization benchmark、serving manifest、capacity/cost report、rollback/RCA；
- 配额：Build 1 / Design 1 / Integrate 1 / Evaluate 2 / Deploy 1 / Operate 1 / Incident 1。

六个项目合计 60 个 milestone Case，精确对应新增组合中的 Project 配额。

## 7.3 统一 Evidence Pack Gate

| Gate | 必须提交的证据 |
|---|---|
| G0 Scope | 目标、约束、成功指标、风险 |
| G1 Design | ADR、架构图、数据/信任边界、威胁模型 |
| G2 Build & Integrate | 可运行 artifact、tests、contracts |
| G3 Evaluate | Dataset、rubric、baseline、failure taxonomy |
| G4 Release | IaC、canary、rollback、安全检查 |
| G5 Operate & Incident | SLO、dashboard、runbook、timeline、RCA |
| G6 Customer Defense | 验收、handoff、adoption 与 executive memo |

没有相应可复验证据，不能仅凭“完成 Project 页面”或“完成所有 Case”通过。

---

# 8. Recommended Implementation Roadmap

以下是未来实施顺序，不是本轮执行清单。

## Phase 1 — Skill Graph V2

交付：

- 冻结 70 个叶子 Skill 的稳定 ID、定义、rubric 与 `rolls-up-to`；
- 冻结先修 DAG；
- 定义 legacy evidence 兼容策略；
- 选取 5–10 个现有 Case 做人工 attribution 试点。

Go / No-Go：同一 Case 的两位 reviewer 对叶子 Skill 归因能达到一致；旧 Attempt 无需重写。

## Phase 2 — 补 Foundation

交付：

- 只补 P0 阻断原语；
- 将 9 个总览项规划为 primer；
- 优先 Programming、Backend、Cloud、Evaluation、Agent production；
- 每个新增 Foundation 在发布前已有明确 Practice / Case 消费者。

Go / No-Go：不存在“无下游消费者的孤立知识”；不以 Foundation 数量作为完成标准。

## Phase 3 — 补 Concept 与 Practice

交付：

- 拆分 3 个过载 Concept；
- 每个 Concept 写出 decision question、反例、证据模式和叶子 Skill；
- 为每个 active Concept 创建至少一个 focused Practice；
- 审核 11 个单 Foundation Concept 是否真正有独立决策价值。

Go / No-Go：新用户能从 Foundation 经 Practice 进入 Case，不再发生明显认知跳跃。

## Phase 4 — 补 Case

交付：

- 使用八类 primary archetype 配额；
- 先补 Build、Evaluate、Customer 与工程基础；
- 每个新 Case 产生明确叶子 Skill evidence；
- 将 312 个增量分为 252 个独立训练和 60 个 Project milestone。

Go / No-Go：组合比例可复算；每个 Case 有 evidence-grounded decision；同模板换皮不计入覆盖。

## Phase 5 — Project Layer

交付：

- 先试点 Production RAG 与 Governed Agent 两个项目；
- 引入 Evidence Pack gate，而不是新 XP 或徽章；
- 证明跨 Case 证据可以组合成 Capability Profile 中的交付证明。

Go / No-Go：第三方 reviewer 能仅凭 Evidence Pack 复核项目结论和能力归因。

## Phase 6 — AI Mentor

交付：

- Mentor 只基于已验证 Skill gap、prerequisite 与 evidence recency 推荐下一步；
- 推荐必须说明“为什么、依据哪些证据、完成后补哪个缺口”；
- Mentor 输出不直接写入 mastery。

Go / No-Go：在不生成新知识事实、不伪造 evidence 的情况下，推荐比静态路线更有效。

## 每一阶段都不应提前做的事

- 不先建 CMS、后台或云同步；
- 不先大规模生成内容再补 rubric；
- 不用 AI Mentor 掩盖 Skill 粒度和 evidence 质量问题；
- 不静默迁移历史 ID 或历史分数；
- 不把 Project 做成另一套课程列表。

---

# 9. Final Answers

## 1. 当前系统距离 Production AI Engineer 还缺什么？

缺的不是更多 AI 名词，而是四类可证明能力：

1. **工程构建能力**：Python、测试、Backend、Database、Cache、Queue、CI/CD；
2. **系统设计与评估能力**：ADR、capacity、LLM/RAG/Agent eval、失败分类；
3. **生产化能力**：Cloud、Kubernetes、IaC、Observability、Security、MLOps、Cost；
4. **端到端交付能力**：Discovery、PoC、adoption、ROI，以及跨阶段 Project Evidence Pack。

结构上还缺细粒度 Skill、Practice bridge、唯一 Case 主类型和可复核的掌握证据归因。

## 2. 下一阶段应该补什么？

先补 Skill Graph V2，不先批量补内容。冻结 70 个叶子 Skill、rubric、先修关系和历史兼容规则后，再按 Programming / Backend / Cloud / Evaluation / Agent Production 的 P0 缺口补 Foundation；随后补 Concept + Practice，最后按 362 组合补 Case 和 Project。

## 3. 什么内容不要补？

不要补无下游实践的百科条目、模型新闻、厂商功能清单、Prompt 技巧合集、同模板事故换皮、只增加阅读量的 advanced 文章，以及无法进入 evidence rubric 的内容。也不要继续用 Domain membership 平均凑 362。

## 4. 如何保证不是 AI 知识百科，而是真正能力成长系统？

坚持一条发布规则：

> 每个新增知识必须改变一个可观察决策；每个决策必须进入 Practice / Case；每个 Case 必须产生可追溯 Evidence；每个 Evidence 必须归因到稳定叶子 Skill；多个 Skill 必须能在 Project 中组合并接受复核。

如果一个内容不能走完这条链路，就不进入正式课程。这样系统优化的是“能否交付和证明”，而不是“收录了多少知识”。

---

## 本阶段变更声明

本阶段只新增本设计文档：`docs/knowledge-architecture-v2.md`。没有修改任何项目代码、Schema、Foundation、Concept、Case、Skill、Content Pack、Manifest 或数据库。
