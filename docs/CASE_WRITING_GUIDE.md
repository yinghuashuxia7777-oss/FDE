# FDE 案件编写指南

## 1. 从决策开始

先写一句“学员在什么约束下必须做什么决策”，再选择题型。合格的 FDE 案件通常包含：

1. 客户目标或生产问题进入。
2. 在噪声中识别可靠证据。
3. 区分事实、假设与未知项。
4. 在成本、时间、风险和客户信任之间权衡。
5. 选择最小、可逆、可观测的行动。
6. 定义验证信号、回滚条件与沟通方式。

只测术语记忆的题目不应成为独立 FDE 案件。

## 2. 真实但虚构、脱敏

“真实”是指约束、系统行为和人的反应符合真实工作，不等于复制真实客户事故。

推荐方法：

- 使用虚构组织、人物、域名、保留地址段和无效凭据。
- 将多个常见模式合成为新场景，改变时间、数量、拓扑和业务背景。
- 只保留教学必需的技术特征，删除可识别个人或客户的字段。
- 在 `metadata.sourceType` 如实标记合成、虚构或公开资料来源。
- 只有确实使用的公开资料才写入可选的 `sourceReferences`。

禁止放入真实密钥、Token、Cookie、邮箱、电话、账号、客户名、私有仓库、内网地址、原始事故单、聊天记录和可识别日志。仅用星号替换字段不一定构成脱敏；上下文仍可识别时必须重写。

## 3. 场景字段

- `customerProfile`：业务类型、规模、使用者和关键目标。
- `background`：系统背景、最近变更和必要上下文。
- `initialIncident`：当前可观测现象与紧迫性，不提前公布根因。
- `constraints`：时间窗、权限、合规、可回滚性、成本和沟通限制。
- `confirmedFacts`：首个决策前已经可靠确认的事实，不混入推测。

## 4. 构建证据链

1. 为每个决策写出正确结论需要的最小证据集。
2. 标注每条证据支持或排除的假设。
3. 检查时间、时区、单位、采样窗口和对照组是否可比。
4. 保留少量合理噪声，但不能隐藏唯一可判定信息。
5. 使用匹配的 Evidence 类型：`text`、`log`、`terminal`、`http`、`json`、`diff`、`config`、`metric`、`diagram` 或 `customer-message`。
6. 代码、日志和配置可用可选 `language` 提供显示提示；可选 `title` 不应泄露答案。

证据自检：

- 只读题内材料能否排除所有错误选项？
- 正确结论来自观察，还是作者个人偏好？
- 是否存在两个选项在当前信息下同样正确？
- 某条证据移除后完全无影响吗？若是，它可能只是无效噪声。

## 5. 决策节点与题型

每个节点只测一个清晰决策，并提供完整的 `prompt`、`skillWeights`、`evidence`、`options`、`answer`、`feedback`、`scoring` 和 `branches`。

| `type` | `answer` 形状 | 适用决策 |
| --- | --- | --- |
| `single-choice` | `correctOptionId` | 单一最佳行动 |
| `true-false` | `correctOptionId` | 可严格判定的命题 |
| `log-analysis` | `correctOptionId` | 日志根因或下一步 |
| `command-choice` | `correctOptionId` | 安全、可验证的命令 |
| `diff-review` | `correctOptionId` | 变更风险审查 |
| `configuration-review` | `correctOptionId` | 配置错误与修复 |
| `architecture-tradeoff` | `correctOptionId` | 架构权衡 |
| `customer-response` | `correctOptionId` | 客户沟通与信任 |
| `multiple-choice` | `correctOptionIds` | 多个同时必要的行动 |
| `ordering` | `orderedOptionIds` | 操作顺序或优先级 |
| `matching` | `pairs` | 症状、证据或措施配对 |
| `evidence-conclusion` | `conclusionId` + `evidenceIds` | 结论与证据联合判断 |

`skillWeights` 的键必须存在于案件顶层 `skills`，每个值为正数，合计必须为 `1`。多技能节点应体现真实能力组合，不要为了增加标签而稀释主能力。

## 6. 错误选项

优质错误选项应来自真实误区：

- 证据不足时直接宣布根因。
- 选择不可逆或影响面过大的修复。
- 只看单个指标，忽略基线、窗口或关联信号。
- 技术可行但违反权限、隐私、合规或客户承诺。
- 只追求立即恢复，没有观测、回滚或沟通计划。
- 把相关性当作因果。

每个 `Option.explanation` 都必须解释该选项的具体因果。需要统计错误模式时，为错误选项提供稳定、可复用的 `errorType`。不要用文案长度、绝对化语气或明显荒谬内容泄露正确答案。

## 7. 反馈与解析

- `feedback.firstWrong`：指出被忽略的判断维度，但不直接报答案。
- `feedback.secondWrong`：给出更具体的证据或约束提示。
- `feedback.revealedAnswer`：公布答案后给出完整因果链与验证方法。
- 正确选项的 `explanation` 说明如何利用证据、满足约束并保留回退路径。
- 错误选项的解析说明它何时可能合理，以及当前证据为何不支持。

`debrief` 不应重复每道题，而应串起根因、正确处置次序、客户风险、补救、验证、面试观察点和可迁移知识。

## 8. 难度

| Level | 建议最少决策节点 | 信息与权衡 | 学员任务 |
| --- | ---: | --- | --- |
| `beginner` | 2 | 信号清晰，单一主要约束，可直接验证 | 识别证据并选择安全下一步 |
| `intermediate` | 3 | 有噪声、信息缺口或两项竞争约束 | 根因分析、权衡、回滚和沟通 |
| `advanced` | 4 | 跨系统证据，多方目标，安全/成本/可靠性冲突 | 分阶段处置不确定性和组织风险 |

节点数是建议下限。难度应来自必要推理和权衡，不能来自含糊文案或冷门记忆。当前 Schema 也接受 `expert`，但它不属于本轮常规编写级别；使用前应另行定义验收标准。

## 9. 分支、评分与后果

- `startNodeId` 必须引用存在的节点。
- 非空 `branches[].nextNodeId` 只能引用本案件节点；`null` 表示明确终点。
- 所有应达节点都应从起点可达，且流程不得形成死循环。
- `firstTry`、`secondTry`、`thirdTry` 范围为 0–100，`weight` 必须大于 0。
- `criticalErrorOptionIds` 只标记会造成严重安全、隐私、数据、生产或客户信任损害的选项。
- 可选 `consequences` 表达选项对时间、成本、信任和风险的变化；数值方向和量纲必须一致。

## 10. 完稿流程

1. 用 [CASE_TEMPLATE.md](./CASE_TEMPLATE.md) 建立 `draft`。
2. 不看答案独立试做，确认题内信息足够。
3. 反向检查每个答案的证据和每个干扰项的排除理由。
4. 运行 `npm run content:validate`、`npm run content:quality` 与 coverage 审计。
5. 交给不同于作者的审核者按 [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md) 复核。
6. 修改后重新运行全部校验（包括 `npm run content:quality`）；已发布内容的实质变更必须升级 `metadata.version`。
