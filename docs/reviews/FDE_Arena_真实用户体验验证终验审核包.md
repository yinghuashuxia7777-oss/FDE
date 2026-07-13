# FDE Arena 真实用户体验验证终验审核包

> 审核日期：2026-07-14
> 审核对象：FDE Arena 当前工作区
> 项目路径：`/Users/charles/Documents/FDE网页题库`
> 当前分支：`codex/fde-arena-mvp`
> 基准 HEAD：`a024c84a`
> 审核性质：真实用户体验验证阶段的交付终验，不重审已通过的内容平台架构与国际化架构

---

## 一、一键审核用法

1. 将本 Markdown 文件完整上传给 ChatGPT。
2. 如果 ChatGPT 可以访问项目代码，同时上传项目或提供代码工作区。
3. 只需发送下面这一句：

```text
请严格按照本审核包的审核边界、证据规则和强制输出格式，对 FDE Arena 当前实现进行独立终验。请核对附件中的代码与测试证据，不要重新设计架构，不要直接修改代码。最终只能给出 PASS、PASS_WITH_FIXES 或 FAIL，并明确回答是否建议继续进入受控真人试用。
```

> 若 ChatGPT 只收到本文档而没有收到代码，它必须将无法独立复核的项目标记为 `NOT_PROVEN`，不得把本文档中的自述当作独立证明。

---

## 二、审核人角色与核心目标

你是独立的资深产品、前端、内容质量和 QA 终验审核人。你的任务不是继续扩展产品，而是判断当前 MVP 是否已经足以验证以下核心假设：

> 一个 FDE 学习者是否愿意每天使用这个产品，完成「今日训练 → 完整决策 → 评分反馈 → 能力更新 → 复盘 → 回到今日计划」的完整闭环。

审核必须围绕五个问题展开：

1. 首次进入的用户能否在 5 秒内理解今天要做什么？
2. 用户能否在不理解内部 ID、Schema 或 Content Pack 的情况下完成训练？
3. 评分、错误反馈、Mastery 和 Debrief 是否形成可理解的学习闭环？
4. 十个首发案件是否足以代表真实 FDE 工作，而非简单知识问答？
5. 当前产品是否可以进入小规模、受控的真人试用？

---

## 三、强制审核边界

### 3.1 本次必须审核

- Dashboard 上的「今日训练」入口与进度。
- 今日训练计划的推荐、完成与恢复。
- 单个案件从场景、证据、决策、评分到完成的全流程。
- 答案反馈的显示位置、正确答案泄露边界和错误类型文案。
- 完成页对 Mastery 更新和后续动作的表达。
- Mastery/能力页是否正确反映已完成训练。
- Debrief 是否使用人类可读标题、选项和错误类型，而非暴露内部 ID。
- 中英文 UI 切换的完整性。
- 桌面、平板和手机布局的信息顺序与可用性。
- 十个首发案件的专业性、证据链、决策质量和复盘完整性。
- 已发布案件版本和旧用户进度的向前兼容。
- 当前测试、内容门禁、TypeScript、Lint、Format 和 Build 证据。

### 3.2 本次禁止扩展

- 不重新审计或重新设计 ContentSource、Manifest、Schema migration、Repository 等已终验的平台架构。
- 不要求建设 CMS、后台、账号、云同步、社区或 AI 自动出题。
- 不要因为理想架构偏好而建议全面重写。
- 不要将新题型、云端题库或全量 362 题当作本次 MVP 通过的前置条件。
- 不要直接修改代码、生成补丁、重排项目或重新初始化。

### 3.3 发现问题时的处理原则

- 只报告有明确证据、可重现路径或确定代码逻辑的问题。
- 区分「未证明」与「已证明失败」。未执行真实浏览器视觉验收，不等于已证明界面失败。
- 如需修复，必须提出最小必要修复，不得把范围扩展为架构重构。
- 对无法从所给证据判断的事项，标记 `NOT_PROVEN`，并说明需要什么最小补充证据。

---

## 四、最终结论标准

最终结论只能是以下三种之一：

### PASS

同时满足：

- 核心日训闭环可用。
- 无 P0 或 P1 产品/数据/内容问题。
- 十个首发案件满足 MVP 试用质量。
- 旧进度和历史版本不会因当前变更丢失。
- 自动化门禁通过。
- 已明确没有视觉实浏证据的边界，且该边界不阻止进入受控人工试用。

### PASS_WITH_FIXES

核心闭环成立，但存在必须在扩大试用前完成的有限修复或补充验收。审核人必须列出：

- 每项问题的等级、证据和用户影响。
- 最小修复范围。
- 是否阻止「受控小样本试用」，还是只阻止「扩大试用」。

### FAIL

出现任一情况：

- 核心日训闭环无法完成或结果无法保存。
- 评分、Mastery 或 Debrief 与实际选择严重不一致。
- 会丢失、覆盖或错认已有用户历史。
- 首发案件存在影响训练正确性的严重内容问题。
- 存在未解决的 P0，或阻止 MVP 核心体验的 P1。

---

## 五、当前交付基线

### 5.1 技术基线

- React `19.2.7`
- TypeScript `6.0.3`
- Vite `8.1.4`
- React Router `7.18.1`
- IndexedDB 封装：`idb 8.0.3`
- 内容 Schema：`zod 4.4.3`
- 测试：Vitest + Testing Library
- 当前 Content Pack：`fde-arena-bundled`
- 内容版本：`1.2.0`
- Schema 版本：`1`
- 发布时间：`2026-07-13T13:11:51.000Z`

### 5.2 内容基线

- 默认可训练案件：24
- 案件历史版本文件：27
- 难度分布：初级 12 / 中级 8 / 高级 4
- 领域：15
- 技能：15
- 规划目标：362
- 当前完成度：24 / 362
- 剩余：338
- 十个首发试用案件：高级 4、中级 5、初级 1

### 5.3 本轮实施范围

本轮保持已通过终验的架构和数据合同，主要补齐了实际训练闭环中的用户可理解性：

1. 案件完成页明确告知 Mastery 和今日计划已更新。
2. 完成页提供「查看复盘」、「查看能力」和「返回今日训练」。
3. Debrief 提供返回今日计划的动作。
4. Debrief 用当时案件版本的节点标题和选项文案呈现历史选择，避免正常界面暴露 `nodeId`/`optionId`。
5. 未知错误类型使用通用本地化标签，不直接显示内部 slug。
6. 手机布局中证据默认展开，选项反馈保持在决策操作附近。
7. 开始案件和完成案件时更新页面标题焦点，让键盘和辅助技术用户知道状态已变更。
8. 十个首发案件经过专项内容质量复核，本轮没有修改其内容数据。

---

## 六、要求与证据矩阵

审核人必须对 UX1–UX16 逐项标记 `PROVEN` / `PARTIAL` / `NOT_PROVEN` / `FAILED`，不得只给总体印象。

| ID | 必须成立的要求 | 当前实现证据 | 已知边界 |
| --- | --- | --- | --- |
| UX1 | Dashboard 在首屏提供明确的今日训练入口、训练量和进度 | Dashboard 页面测试覆盖今日训练、`1/3`、`30 分钟`、空状态和继续/复盘入口 | 「5 秒理解」需真人观察，自动化测试只能证明信息存在 |
| UX2 | 今日训练使用真实 Content Pack，不是演示假数据 | `mvp-training-flow.integration.test.tsx` 通过 `LocalContentSource` 和 `ContentInstaller` 加载 `1.2.0`，断言 24 个活跃案件、27 个版本 | 未证明外部内容包或云端来源，且本阶段不要求 |
| UX3 | 用户可完成场景、证据、决策节点、评分与终点 | 真实内置案件集成测试完成 `rag-stale-policy-cache-001`，并保存路径、分数、Mastery 和错误记录 | 无实体浏览器点击录屏 |
| UX4 | 自适应反馈在决策附近显示，且不提前泄露正确答案 | `AdaptiveFeedback` 只在明确的 `revealedAnswer` 状态显示编写答案；训练页手机反馈位置有回归测试 | CSS 视觉间距没有实浏截图证据 |
| UX5 | 完成页清晰告知得分、结果、Mastery 更新及下一步 | `TrainingSessionPage.tsx` 完成态显示分数、verdict、Mastery 更新文案和三个后续动作；页面测试验证 | 当前只告知已更新，未显示能力值的前后差异 |
| UX6 | 训练完成后 Mastery 在同一原子保存中更新，能力页可读 | 应用层测试验证 Attempt、Progress、Mastery、Mistakes 作为一个 snapshot 完成；集成测试断言 `rag.search` 得分 100、样本数 1 | 不涉及跨设备或云同步 |
| UX7 | Debrief 加载完成尝试对应的精确案件版本，并展示根因、修复、验证和路径 | `DebriefPage.tsx` 以 `caseId + caseVersion` 加载历史内容；页面测试验证每轮选择、解析和返回今日计划 | 如精确版本被外部破坏或缺失，页面显示历史内容缺失警告，不伪造新版本复盘 |
| UX8 | 正常用户界面不应把内部 node/option/error ID 当作文案显示 | Debrief 将稳定 ID 映射到当时版本的作者标题/选项；未知错误 slug 回退到通用本地化标签；包含专项测试 | 调试、历史缺失或导出场景仍可以需要显示稳定 ID，不属于正常学习界面 |
| UX9 | 产品 UI 支持中英文，无主要界面硬编码泄漏 | 训练、复盘、Dashboard 和产品页有中英语言测试；新增的 Mastery、返回计划、未知决策和错误类型文案均有 zh/en 词条 | 内置 Content Pack 的作者内容可以仍是中文；这是内容包语言问题，不是 UI 国际化泄漏 |
| UX10 | 桌面/平板/手机保持场景→证据→决策顺序，手机证据可直接看到 | `TrainingLayout` 在小于 64rem 切换折叠布局，Evidence 默认展开；组件测试验证 DOM 顺序和展开状态 | 没有真实浏览器的 360/390/768/1024/1440 视口截图证据；存在旋转时未提交选择丢失的已知风险 |
| UX11 | 路由/状态变更后键盘和辅助技术用户可感知新上下文 | 训练页的当前标题使用 `tabIndex=-1` 并在加载/完成时聚焦；有回归测试 | 未进行 VoiceOver/NVDA 实机审核，不得声称 WCAG 全面合规 |
| UX12 | 十个首发案件是真实 FDE 决策场景，含证据链、错误路径、根因、修复和验证 | 十个活跃版本全部通过人工内容复核与 Schema/quality/graph/duplicate/coverage 门禁，详见第十节 | 内容专业性仍应由独立 FDE 审核人复核，不得只依赖机械门禁 |
| UX13 | 新内容不覆盖旧进度，已完成尝试继续按 `caseId + caseVersion + schemaVersion` 识别 | Attempt 保存稳定案件与版本信息；内容生命周期集成测试验证恢复内置包不删除导入版本或用户历史 | 未包含跨版本真实生产数据迁移演练 |
| UX14 | 本轮不推翻已通过的平台架构 | 实施集中在训练页、Debrief、本地化词条和相关测试；内容实体、Manifest、Repository 和数据合同保持 | 当前工作树包含整个开发阶段的未提交变更，审核应面向工作区而非只看 HEAD |
| UX15 | 内容门禁、测试、Typecheck、Lint、Format 和 Build 全部通过 | 已执行结果：54 个测试文件 / 563 个测试通过；六类内容门禁及静态构建检查通过 | 审核人若有代码环境，应独立重跑；本文档不是 CI 日志签名 |
| UX16 | 交付对「已证明」和「尚未证明」保持诚实 | 本包明确标记真实浏览器视觉验收为 `NOT RUN`，列出平板旋转、英文内容包、Mastery 差值和 bundle 警告 | 只能通过用户手工运行或授权的真实浏览器验收消除视觉证据缺口 |

---

## 七、核心用户闭环与数据流

```text
Dashboard / 今日训练
  ↓ 选择推荐案件
TrainingSessionPage
  ↓ 阅读场景与证据
QuestionRenderer
  ↓ 按稳定 optionId 提交决策
Training application service
  ↓ 评分 + 路径 + 错误分类
原子保存：Attempt + Progress + Mastery + Mistakes
  ↓
完成页
  ├─→ Debrief（按 caseId + caseVersion 读取原版本）
  ├─→ Skills / Mastery
  └─→ Dashboard / 今日训练
```

审核时要特别验证两条不可混淆的链路：

1. **学习链路**：用户看到的是场景、证据、选项、反馈和复盘文案。
2. **稳定关联链路**：系统内部以 `caseId`、`caseVersion`、`schemaVersion`、`nodeId`、`optionId` 和 `skillId` 保持历史与计分关联。

稳定 ID 必须在数据层保留，但不应在正常学习界面中取代人类可读标签。

---

## 八、关键代码证据索引

以下为审核导航，不是用于取代独立阅读的摘要。

### 8.1 训练完成、导航与焦点

文件：`src/pages/training/TrainingSessionPage.tsx`

审核点：

- `pageTitleRef` 在案件进入和完成状态切换时获得焦点。
- 完成态显示 score/verdict 与 `training.session.masteryUpdated`。
- 完成态的复盘链接使用当前 `attempt.id`，另有 `/skills` 和 `/` 入口。
- `AdaptiveFeedback` 位于选项/决策区内，不需用户跳回上方查找反馈。
- 页面保留持久化失败和提交错误的可见 alert。

### 8.2 响应式训练布局

文件：`src/components/case/TrainingLayout.tsx`

审核点：

- 在 `max-width: 63.999rem` 使用小屏折叠布局。
- 手机/竖屏顺序为 Scene → Evidence → Question → Options。
- Evidence、Question 和 Options 默认展开，Scene 可折叠。
- 同一时刻只渲染当前布局的一棵交互 DOM，避免宽窄两套互动控件并存。

### 8.3 反馈泄露边界与错误文案

文件：`src/components/scoring/AdaptiveFeedback.tsx`

审核点：

- 只有在 `feedback.kind === 'revealedAnswer'` 且 `revealed === true` 时才显示作者编写的正确答案/选项。
- 未知 `training.errorType.<slug>` 不直接回显 slug，而是使用 `training.errorType.other`。

### 8.4 历史版本复盘和可读标签

文件：`src/pages/debrief/DebriefPage.tsx`

审核点：

- 使用尝试中的 `caseId` 和 `caseVersion` 查找精确历史内容。
- 将 `nodeId` 映射为当时版本的 `node.title`，将 `optionId` 映射为作者选项文案。
- 实际路径、推荐路径、时间线和关键错误都使用可读标签。
- 无标题节点使用本地化的 `debrief.unknownDecision`，不以内部 ID 兜底。
- 页面展示 root cause、correct approach、lessons、interviewer/customer risk、remediation、verification 和 knowledge links。
- 提供 `debrief.backToPlan` 链接返回 `/`。

### 8.5 选项 ID 全案件唯一约束

文件：`src/schemas/case.schema.ts`

审核点：

- Schema 在案件层维护 `nodeIds`、`optionIds` 和 `evidenceIds` Set。
- 同一案件内任何节点的重复 `optionId` 都会被拒绝。
- 因此 Debrief 以 `optionId` 建立案件级可读文案 Map 不会在合法内容中发生节点间覆盖。

### 8.6 新增/补齐本地化文案

文件：

- `src/i18n/translations/training-ui.ts`
- `src/i18n/translations/product-pages.ts`

中英文均应存在：

- `training.session.masteryUpdated`
- `training.session.viewMastery`
- `training.errorType.other`
- `debrief.unknownDecision`
- `debrief.backToPlan`

---

## 九、自动化测试证据

### 9.1 关键回归测试

| 文件 | 关键用例 | 证明范围 |
| --- | --- | --- |
| `src/components/scoring/ScoringComponents.test.tsx` | `does not expose an unknown internal error slug in Chinese` | 未知错误类型不泄露内部 slug |
| `src/components/case/TrainingLayout.test.tsx` | 手机顺序与 Evidence 展开用例 | 小屏信息顺序和默认可见证据 |
| `src/pages/training/TrainingSessionPage.test.tsx` | 中英文训练 chrome | UI 词条本地化，不篡改作者内容 |
| `src/pages/training/TrainingSessionPage.test.tsx` | 单次 prompt、独立选项、页标题焦点 | 可读性、交互语义与状态可感知 |
| `src/pages/training/TrainingSessionPage.test.tsx` | 手机反馈紧邻决策控件 | 反馈位置不脱离操作上下文 |
| `src/pages/training/TrainingSessionPage.test.tsx` | Mastery 更新及复盘/能力/今日计划链接 | 完成后的学习闭环 |
| `src/pages/slice-b-pages.test.tsx` | 按完成尝试精确版本展示每轮与解析 | 历史版本复盘 |
| `src/pages/slice-b-pages.test.tsx` | 作者标题/选项而非 node/error/critical ID | 正常界面不暴露内部识别符 |
| `src/pages/slice-b-pages.test.tsx` | 无标题节点使用本地化兜底 | 回归修复内部 node ID 泄露 |
| `src/application/training/training.test.ts` | 一次原子 snapshot 完成 path/score/mastery/mistakes | 训练业务数据一致性 |
| `src/content/mvp-training-flow.integration.test.tsx` | 真实内置 Content Pack 全闭环 | 24/27 内容加载、案件完成、保存、Mastery、Debrief、今日计划与 Dashboard |
| `src/content/content-lifecycle.integration.test.tsx` | 恢复内置内容不删除导入版本/历史 | 内容更新与用户进度向前兼容 |
| `src/pages/product-pages.test.tsx` | 今日训练、进度、空状态、继续/复盘 | Dashboard 入口与日训计划呈现 |

### 9.2 真实内置内容闭环的具体断言

`src/content/mvp-training-flow.integration.test.tsx` 使用真实包而非临时 fixture，并验证：

- Content Pack 版本为 `1.2.0`。
- 默认案件数为 24，历史版本数为 27。
- 加载 `rag-stale-policy-cache-001@1`。
- 通过其真实正确路径完成案件。
- 保存的 Attempt 含正确 `caseVersion`、`schemaVersion`、完成状态、分数 100 和 `excellent` verdict。
- Progress 的 completed count 增加为 1。
- `rag.search` Mastery 分数为 100，样本数为 1。
- Debrief 渲染真实 root cause。
- 重建今日计划后，Dashboard 显示已完成与复盘入口。

---

## 十、十个首发案件审核摘要

本表只列默认题库中的活跃版本。三个已更新案件的 v1 仍保留用于历史兼容，但不是当前首发训练版本。

| 难度 | 活跃案件 | 版本 | 核心 FDE 决策与证据 | 本轮复核 |
| --- | --- | ---: | --- | --- |
| 高级 | `agent-approval-boundary-bypass-001` | 1 | Agent 在审批竞态下绕过能力边界；要求服务端授权、幂等重放与客户恢复 | PASS |
| 高级 | `zero-downtime-schema-migration-001` | 1 | 在无停机约束下做 expand–migrate–contract、双写/API 兼容和可回滚验证 | PASS |
| 高级 | `multi-region-rag-consistency-001` | 2 | 多区域 RAG 一致性；含 120 秒、滚动 30 天 99.9%、≤0.1%、7 天发布门禁和 30 秒 ACL 指标 | PASS |
| 高级 | `inference-gpu-oom-capacity-001` | 1 | 长上下文和异构 GPU 下的 OOM；通过 token admission、调度、20% 余量和过载保护修复 | PASS |
| 中级 | `rag-permission-filter-gap-001` | 1 | claim 漂移、fail-open 和跨组泄露；要求正/反授权矩阵和元数据过滤验证 | PASS |
| 中级 | `api-webhook-idempotency-001` | 2 | PostgreSQL 与 broker 无跨系统事务；以 event ledger + transactional outbox 解决重复与丢失 | PASS |
| 中级 | `warehouse-late-arrival-watermark-001` | 1 | 离线 2–18 小时迟到数据、财务暂定语义、watermark 和 `eventId` 幂等回补 | PASS |
| 中级 | `llm-eval-dataset-leakage-001` | 1 | LLM 评估集泄露；用 hash overlap、去污染分数、240 条盲测、holdout 与 lineage 核验 | PASS |
| 中级 | `customer-pilot-production-gap-001` | 2 | 14 天客户试点到生产缺口；约束处理≤10 分钟、修正≤10%、fallback≤5%、队列 p95≤15 分钟、P1 响应 10 分钟 | PASS |
| 初级 | `rag-stale-policy-cache-001` | 1 | 索引 v18 与缓存 v17 造成旧政策命中；以 corpus generation key、失效机制和合成回归修复 | PASS |

### 10.1 历史版本说明

下列案件已以 v2 作为默认活跃版本：

- `multi-region-rag-consistency-001@2`
- `api-webhook-idempotency-001@2`
- `customer-pilot-production-gap-001@2`

它们的 v1 没有被静默覆盖或删除，仍可供已有 Attempt 精确复盘。人工首发质量结论以 v2 为准；历史 v1 只需满足 Schema 和历史可读性，不应被当作当前推荐内容。

### 10.2 内容审核人必须独立确认

对每个首发案件，不得只看 Schema 通过，必须回答：

1. 场景是否迫使学习者在业务、技术和运营约束下做取舍？
2. 证据是否真正改变决策，而非只是背景文字？
3. 错误选项是否代表真实工作中的合理误区，而非明显荒谬的干扰项？
4. 正确路径是否同时覆盖根因、修复、上线门禁和验证指标？
5. 复盘是否解释「为什么」，而不只重复正确选项？

---

## 十一、已执行的质量门禁与结果

以下是本次交付前实际执行的结果。如审核人拥有项目工作区，应在不修改数据的前提下独立重跑。

| 检查 | 结果 |
| --- | --- |
| `npm run content:validate` | PASS；27 个案件版本、15 个领域、15 个技能、0 issues |
| `npm run content:quality` | PASS；27 checked，0 validation issues，0 quality issues |
| `npm run content:graph` | PASS；27 checked，0 graph issues |
| `npm run content:duplicates` | PASS；no duplicates |
| `npm run coverage:audit` | PASS；24 published active cases；12/8/4；cross-domain 10/12 = 0.8333，阈值 0.4；目标 362，剩余 338 |
| `npm run content:check` | PASS；manifest/index drift `[]` |
| `npm test -- --run` | PASS；54 个测试文件，563 个测试全部通过 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS；0 warnings |
| `npm run format:check` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

### 11.1 构建输出边界

- 主 JavaScript chunk：约 `664.37 kB` minified / `185.42 kB` gzip。
- Vite 报告超过 500 kB 的非阻断警告。
- 该警告对小规模受控 MVP 试用不构成自动 FAIL，但应在真实设备上观察首次加载体感。

### 11.2 审核人可重跑的非交互命令

```bash
cd "/Users/charles/Documents/FDE网页题库"
npm run content:validate
npm run content:quality
npm run content:graph
npm run content:duplicates
npm run coverage:audit
npm run content:check
npm test -- --run
npm run typecheck
npm run lint
npm run format:check
npm run build
git diff --check
```

> 这些命令可能在不同机器上耗时不同。本审核包不授权安装依赖、修改全局 npm 设置或启动长驻服务。

---

## 十二、未执行的验收与已知风险

### 12.1 真实浏览器视觉验收：NOT RUN

本轮没有由 Codex 启动本地服务，也没有使用浏览器自动化、用户 Chrome 会话或浏览器个人资料。因此以下项目不得在审核中伪造为已通过：

- 1440×900 桌面布局的真实视觉效果。
- 1024×768 和 768×1024 平板布局。
- 390×844 和 360×800 手机布局。
- 文字截断、水平溢出、粘性容器、折叠标题和长选项的真实点击可用性。
- 中英文切换后的实际排版。
- VoiceOver/NVDA 输出顺序。

jsdom 组件测试和 CSS 静态检查可以证明结构与状态，不能独立证明无截断、无溢出或视觉层级已达标。

### 12.2 已知 P1 风险：平板旋转可能丢失未提交选择

`TrainingLayout` 在 64rem 断点处在桌面与小屏布局之间切换，`QuestionRenderer` 的未提交草稿保留在局部组件状态。当 iPad 在竖屏与横屏之间跨过断点时，当前交互子树可能重挂载，从而丢失尚未提交的选择。

该风险：

- 不会丢失已提交的 Attempt 或已完成历史。
- 不影响固定方向的手机/桌面训练。
- 可以在受控试用中将「训练过程中旋转平板」列为专项观察项。
- 若人工复现，应优先以最小受控状态提升修复，不必重构布局引擎。

### 12.3 其他非阻断边界

- **Mastery 可见性**：完成页告知能力已更新并可跳转查看，但没有在完成卡上显示「前值 → 后值」。
- **英文体验**：英文 UI chrome 完整，但当前中文作者内容不会被运行时机器翻译。完整英文案件应以独立版本化 Content Pack 生产，不应在本轮硬编码翻译。
- **Bundle 体积**：Vite 的 500 kB 警告非阻断，但真实试用应收集首屏加载体感。
- **E2E 证据**：项目有 `@playwright/test` 开发依赖，但当前交付不声称存在已配置、已执行的 Playwright 端到端套件。
- **工作树状态**：当前项目包含这一连续开发阶段的未提交变更。审核对象是当前工作区，不是单独的 `a024c84a` 提交。

### 12.4 手工体验验收建议（由用户在 Terminal 运行）

本审核包不授权 ChatGPT/Codex 自动启动服务。如用户决定进行手工验收，可在 Terminal 执行：

```bash
cd "/Users/charles/Documents/FDE网页题库"
npm run dev
```

然后打开终端显示的本地地址（通常为 `http://localhost:5173`）。验收完成后在原终端按 `Ctrl+C` 停止服务。

建议以 1440×900、1024×768、768×1024、390×844 和 360×800 五组视口检查：

1. Dashboard 是否在不滚动或少量滚动下显示今日行动。
2. 证据、决策和反馈是否连续、无重复 prompt。
3. 长选项、长中文/英文按钮和 Debrief 时间线是否截断或溢出。
4. 完成后是否容易找到复盘、能力和今日计划。
5. 在平板某节点选择但未提交，旋转横/竖屏，观察草稿是否丢失。

---

## 十三、独立审核时必须核对的事实

### 13.1 不得忽略的正面证据

- 当前不是只有案件列表的内容底座；已有真实内置 Content Pack 的全闭环集成测试。
- 评分、Attempt、Progress、Mastery 和 Mistakes 在应用层经过同一原子保存测试。
- Debrief 不是用最新案件静默替换历史，而是加载尝试完成时的精确版本。
- 三个已升级的首发案件保留 v1，默认训练使用 v2。
- 当前回归门禁为 54 个测试文件、563 个测试，不应引用早期的 559 个数字作为当前结果。
- 选项 ID 在案件级必须唯一，因此不应在没有反例内容的情况下宣称 Debrief 的 option Map 会合法冲突。

### 13.2 不得忽略的证据缺口

- 没有真实浏览器视觉验收。
- 没有声称已执行 Playwright E2E。
- 没有 VoiceOver/NVDA 实机验收。
- 没有真人用户完成率、次日留存或实际「每日使用意愿」数据。
- 已知平板跨断点旋转的草稿丢失风险尚未实机复现或修复。

### 13.3 证据级别

审核人应按以下强度使用证据：

1. **强证据**：独立重跑的测试/构建、直接代码检查、真实浏览器可重现结果。
2. **中等证据**：本包记录的已执行命令和确切文件/用例导航。
3. **弱证据**：本包的实施摘要或未附代码的说明。

仅有弱证据时，不得标记 `PROVEN`。

---

## 十四、审核人必须回答的问题

1. 当前 Dashboard → Training → Scoring → Mastery → Debrief → Dashboard 闭环是否在代码和测试中完整成立？
2. 真实内置 Content Pack 是否被用于集成验证，而非只验证 mock/fixture？
3. 用户完成案件后，Attempt、Progress、Mastery 和 Mistakes 是否一致持久化？
4. 完成页是否让用户明白「训练已影响能力」且知道下一步去哪里？
5. Debrief 是否加载原案件版本，并避免在正常视图暴露内部 ID？
6. 自适应反馈是否有提前泄露正确答案的路径？
7. 十个首发案件是否都是多证据、多节点、有取舍的 FDE 决策训练？哪些案件如仍有专业性缺口？
8. 中英文 UI 是否完整？内容包语言与 UI 语言应否被正确区分？
9. 小屏 DOM 顺序、Evidence 默认展开、反馈位置和页标题焦点是否有足够自动化证据？
10. 没有真实浏览器视觉证据应被判定为哪些具体子项 `NOT_PROVEN`？它是否阻止受控小样本试用？
11. 平板旋转草稿丢失风险应定为 P1、P2 还是其他等级？是否必须在首轮受控试用前修复？
12. 当前 664.37 kB 主 chunk 是否会实质阻止 MVP 试用，还是应通过真实性能观察后再排期？
13. 是否存在任何会丢失旧 Attempt、将 v1 复盘错配到 v2，或将新案件误认为已完成的路径？
14. 自动化门禁结果是否支持「工程上可进入试用」的结论？
15. 综合所有证据，是否建议继续按当前方案进入受控真人试用？

---

## 十五、ChatGPT 强制输出格式

审核回答必须严格使用以下结构，不得省略章节。

```markdown
# FDE Arena 真实用户体验终验结论

## 1. Final Verdict

PASS | PASS_WITH_FIXES | FAIL

Confidence: High | Medium | Low

是否建议进入受控真人试用：是 | 否 | 有条件是

一句话理由：...

## 2. Executive Summary

（不超过 10 句，必须区分已证明和尚未证明的事项。）

## 3. UX1–UX16 要求矩阵

| ID | 结论 | 证据 | 缺口/风险 |
| --- | --- | --- | --- |
| UX1 | PROVEN/PARTIAL/NOT_PROVEN/FAILED | ... | ... |

（必须完整列出 UX1–UX16。）

## 4. Findings

按 P0、P1、P2、P3 分组。如某级别没有问题，明确写「None」。

每个 finding 必须包含：
- Severity
- Requirement ID
- Evidence（文件/测试/可重现路径）
- User impact
- Minimal fix or evidence needed
- Blocks controlled pilot: Yes/No

## 5. 每日使用闭环判定

- Dashboard → Training：...
- Training → Scoring：...
- Scoring → Mastery：...
- Mastery/Debrief → Dashboard：...
- 用户每日回来的价值主张是否成立：...

## 6. 十个首发案件的内容质量

| Case ID@Version | PASS/PARTIAL/FAIL | 核心理由 | 必须修复 |
| --- | --- | --- | --- |

（必须列出全部 10 个。）

## 7. 中英文、响应式与可访问性

- UI 国际化：...
- Content Pack 语言边界：...
- 桌面/平板/手机：...
- 键盘/焦点/辅助技术：...
- 未执行的实机验收：...

## 8. 数据、版本与回归安全

- Attempt/Progress/Mastery/Mistakes 一致性：...
- caseVersion/schemaVersion 兼容：...
- v1/v2 历史复盘：...
- 新内容对旧进度的影响：...

## 9. 测试与构建判定

- 独立重跑的命令：...
- 结果：...
- 未重跑或不能验证的项目：...
- 构建体积警告判定：...

## 10. 真实浏览器验收状态

- Status: RUN / NOT RUN
- 已验证视口：...
- 未验证项：...
- 是否阻止受控试用：...
- 最小补充验收清单：...

## 11. 进入受控试用前的行动

按「必须」、「建议」、「延后」三类列出。不得加入 CMS、后台、云同步、账号、社区、AI 自动出题或新架构抽象。

## 12. Final Recommendation

- 是否继续按当前推荐方案：是/否/有条件是
- 下一个最小行动：...
- 不应在此时开始的事：...
```

### 15.1 Finding 等级定义

- **P0**：核心闭环不可用、严重数据丢失/错配、正确答案系统性错误，必须 FAIL。
- **P1**：明显阻止主要用户完成训练或导致重要状态丢失；通常至少 PASS_WITH_FIXES。
- **P2**：不阻断核心流程，但显著损害理解、效率或信任。
- **P3**：小型一致性、文案、视觉或工程优化，可延后。

### 15.2 输出约束

- 不得用「大体上可以」、「看起来不错」等模糊文字替代结论。
- 不得以「没有浏览器截图」直接否定已由代码和测试证明的数据逻辑；必须精确限定为视觉/实机子项未证明。
- 同样，不得以自动化测试通过代替真实视觉验收。
- 任何问题必须指向准确文件、测试、内容或可重现步骤。
- 如果无法访问代码，必须降低 Confidence，不得把本包自述当作独立审核完成。

---

## 十六、建议的审核顺序

1. 先核对 `package.json` 与 Content Pack manifest，确认基线数字。
2. 阅读 `mvp-training-flow.integration.test.tsx` 和训练应用层原子保存测试，确认核心闭环。
3. 阅读 `TrainingSessionPage.tsx`、`TrainingLayout.tsx`、`AdaptiveFeedback.tsx` 和对应测试。
4. 阅读 `DebriefPage.tsx`、精确版本加载逻辑与页面测试。
5. 核对中英文词条和未知 ID/slug 兜底。
6. 逐个阅读十个首发活跃案件，不只看内容质量脚本输出。
7. 如有可执行环境，重跑静态门禁、测试和构建。
8. 将真实浏览器未执行项单独列出，不与已通过的业务逻辑混为一谈。
9. 最后才给出 PASS / PASS_WITH_FIXES / FAIL 和是否进入受控试用。

---

## 十七、交付方声明

本审核包的目的是让第三方可以一次性、有边界地复核当前 MVP，而不是预先要求某一结论。

交付方明确声明：

- 已将现有代码、内容、测试和构建证据与未执行的浏览器视觉验收分开陈述。
- 已披露平板旋转草稿丢失、内容包语言、Mastery 差值未就地展示与 bundle 体积警告。
- 未宣称已执行真实浏览器、Playwright E2E 或屏幕阅读器实机验收。
- 未通过重新初始化、删除旧功能或推翻已终验架构来完成本阶段。
- 当前最重要的下一步是通过小规模受控真人试用验证「学习者是否愿意每天使用」，而不是继续扩展平台基础架构。
