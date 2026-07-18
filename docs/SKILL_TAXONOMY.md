# FDE Arena Skill Taxonomy

## 1. 使用规则

当前分类法包含 15 个活动 Domain，每个 Domain 对应一个活动 Skill 定义。案件的 `domains` 和 `skills` 必须引用 `content/domains/` 与 `content/skills/` 中 `status: active` 的真实稳定 ID；下表仅作人工阅读摘要。

- Domain 表示能力领域，用于题库覆盖与能力地图分组。
- Skill 表示可评分能力，节点通过 `skillWeights` 关联 Skill。
- 案件可以跨 Domain，但每个 Skill 的 `domainId` 必须在案件 `domains` 中。
- 每个节点只标注完成该决策实际需要的 Skill；权重均为正数且总和为 `1`。
- Label 与描述可以随内容版本修订，ID 一旦发布不得更改。
- 新增 Domain 时必须同时新增 Domain JSON、至少一个 Skill JSON，并更新 coverage；页面无需修改。
- 停用分类使用 `status: deprecated`，不要删除或复用已发布 ID。

## 2. 当前 15 个 Domain 与 Skill

| Domain ID | Domain label | Skill ID | Skill label | Coverage 目标 |
| --- | --- | --- | --- | ---: |
| `agents-evals` | Agents, tools & evaluation | `agents.evaluation` | Agent evaluation | 25 |
| `api-integration` | HTTP, API, auth & integration | `api.integration` | API integration | 24 |
| `cloud-deployment` | Cloud, containers & Kubernetes | `cloud.deployment` | Cloud deployment | 24 |
| `customer-discovery` | Customer discovery & requirements | `customer.discovery` | Customer discovery | 24 |
| `data-engineering` | Data, databases & engineering | `data.engineering` | Data engineering | 24 |
| `fde-adoption` | FDE delivery, adoption & communication | `fde.adoption` | Field adoption | 24 |
| `fine-tuning-inference` | Model fine-tuning, datasets & inference deployment | `tuning.inference-deployment` | Fine-tuning and inference deployment | 24 |
| `git-delivery` | Git, collaboration & delivery | `git.delivery` | Git delivery | 24 |
| `llm-applications` | LLM foundations & AI applications | `llm.applications` | LLM application engineering | 24 |
| `performance-scale` | Performance, cost & scale | `performance.scaling` | Performance and scaling | 24 |
| `rag-search` | RAG, search & enterprise knowledge | `rag.search` | RAG and search | 25 |
| `reliability` | Observability & reliability | `reliability.observability` | Reliability and observability | 24 |
| `security-governance` | Security, privacy & governance | `security.governance` | Security and governance | 24 |
| `software-foundations` | Software foundations & structure | `software.foundations` | Software foundations | 24 |
| `systems-networking` | Terminal, systems & networking | `systems.networking` | Systems and networking | 24 |

当前 coverage 总目标为 **362** 个活动 published 案件；`agents-evals` 与 `rag-search` 各 25 个，其余 13 个 Domain 各 24 个。

## 3. Domain 选取提示

- `customer-discovery`：需求澄清、约束、成功标准、事实与假设。
- `software-foundations`：可维护代码、测试、结构和工程基础。
- `systems-networking`：操作系统、终端、网络和运行时诊断。
- `git-delivery`：版本控制、协作工作流和安全交付。
- `api-integration`：HTTP、API 契约、认证和服务集成。
- `data-engineering`：数据建模、管道、数据库和数据质量。
- `cloud-deployment`：云、容器、编排、部署和运行。
- `reliability`：遥测、事件响应、韧性和服务可靠性。
- `security-governance`：安全控制、隐私、政策、合规和治理。
- `llm-applications`：LLM 应用设计、提示、安全和产品集成。
- `rag-search`：检索、排序、grounding 和企业知识系统。
- `agents-evals`：工具型 Agent、编排、护栏和评估。
- `fine-tuning-inference`：数据集、模型适配、评估、推理服务与运行。
- `performance-scale`：容量、延迟、吞吐、成本和扩展权衡。
- `fde-adoption`：现场交付、采用、赋能、利益相关者协调和沟通。

## 4. 标注方法

1. 先定义每个节点要观察的行为，再选 Skill；不要先选标签再拼题。
2. 主 Skill 应获得最大权重。只有当另一个能力对正确决策不可缺少时才加入。
3. 案件顶层 `skills` 应包含所有节点使用的 Skill，不能包含从未被任何节点使用的装饰性标签。
4. 跨领域案件要证明每个 Domain 都实际影响至少一个决策。
5. coverage 统计是发现内容缺口的工具，不是牺牲标注准确性的配额。

示例：

```json
{
  "domains": ["rag-search", "security-governance"],
  "skills": ["rag.search", "security.governance"],
  "skillWeights": {
    "rag.search": 0.6,
    "security.governance": 0.4
  }
}
```

该示例只适用于一个决策确实同时要求检索诊断和安全治理的场景。若节点只要求检查检索质量，应只使用 `rag.search: 1`。

## 5. 新分类提案

新增分类前回答：

- 现有 15 个 Domain 是否真的无法表达该能力？
- 它是否可以在多个案件中稳定复用，而非某个产品名或一次性知识点？
- 是否能定义可观察、可评分的 Skill 行为？
- 是否已有首批案件和 coverage 目标？
- 新 ID 是否语义稳定，不依赖厂商、标题或目录？

通过评审后，新增 Domain 与 Skill JSON、更新 coverage，运行 `npm run content:validate`、`npm run content:quality` 与索引生成。不得通过修改 `SKILL_TAXONOMY.md` 本身来“注册”分类；注册来源始终是 `content/domains/` 与 `content/skills/`。
