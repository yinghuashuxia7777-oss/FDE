# FDE Arena 7 天快速 MVP 实施一键审核包

> 文档日期：2026-07-13
> 项目：FDE Arena
> 当前分支：`codex/fde-arena-mvp`
> 审核性质：快速 MVP 实施前的最后一次方案审核
> 审核目标：判断是否应直接执行本文推荐的 7 天最小产品闭环方案
> 重要前提：内容平台架构已经通过终验，本审核不得重新发起架构重构

---

## 一、一键使用方法

将本 MD 文件直接上传给 ChatGPT，然后只发送下面这段话：

> 请作为资深教育产品负责人、FDE 内容主编、React/TypeScript 工程负责人和本地数据一致性审计员，对本审核包做一次独立的实施前终审。当前内容平台架构已经通过终验，不要重新设计架构，不要直接写代码。请重点判断：推荐方案能否在 7 天内形成真实可体验的“今日训练 → 作答 → 评分 → mastery 更新 → 复盘”闭环，以及 10 个首发案件是否足以验证用户是否愿意每天使用。请严格按照文末强制格式输出 `GO`、`GO_WITH_FIXES` 或 `NO_GO`，所有问题必须给出最小修复边界。

---

## 二、审核者角色与强制边界

你审核的是一个已经具备内容平台、题型引擎和本地训练数据能力的项目。当前目标不是继续建设平台，而是尽快让真实学习者体验产品。

审核时必须遵守以下边界：

1. 不得建议重新初始化、重写或替换已经通过终验的内容平台架构。
2. 不得建议新增 CMS、后台管理、账号、登录、社区、云同步、远程数据库或 AI 自动出题。
3. 不得因为未来可能需要运营能力而要求本轮预先建设后台或新的通用抽象。
4. 不得建议删除、重置或迁移掉现有 attempts、progress、mastery、mistakes、settings 或历史 Case Version。
5. 不得把“没有行为分析后台”作为快速 MVP 不通过的理由；本轮目标是先验证训练体验，不是建设增长平台。
6. 不得要求把 24 个现有案件全部重写。本轮只需确认至少 10 个案件达到首发体验标准。
7. 不得建议为了“每日计划稳定”立即增加新 IndexedDB 表；只有证明不持久化会阻断 P0 时，才可提出最小数据修改。
8. 不得使用“建议优化”“可以考虑”等模糊意见。每个问题必须标明优先级、影响、文件边界和最小修复。
9. 本审核是实施前最后一次审核。若没有 P0 阻断项，应明确给出可以直接开发的结论，不再要求第二轮方案评审。

---

## 三、快速 MVP 的产品问题

本阶段只验证一个核心假设：

> 一个正在学习或准备从事 Forward Deployed Engineer 工作的人，是否愿意每天打开 FDE Arena，完成一个真实场景案件，并通过复盘看到自己的能力变化？

因此本轮的最小价值链是：

```text
打开首页
  -> 看见今天最值得训练的案件
  -> 进入真实 FDE 场景
  -> 阅读证据并作出决策
  -> 获得评分与后果反馈
  -> 原子保存 Attempt / Progress / Mistake / Mastery
  -> 进入精确历史版本的 Debrief
  -> 返回首页看见今日完成状态和下一项建议
```

不直接服务这条价值链的能力，本轮默认不做。

---

## 四、当前项目事实

### 4.1 技术栈

- React 19
- TypeScript 6，严格模式
- Vite 8
- React Router 7
- IndexedDB，通过 `idb` 访问
- Zod 4
- Vitest、Testing Library、fake-indexeddb
- 本地优先，固定本地用户 `local-user`
- 无后端、无账号、无运行时远程 API

### 4.2 已通过终验、不得重写的能力

- 程序代码与 `content/` 题库彻底分离。
- 构建时生成 Manifest、Coverage Report、JSON Schema 和 loader map。
- Content Pack、ContentSource、ContentInstaller 与 IndexedDB 内容安装事务。
- Case、Node、Evidence、Option、Domain、Skill 稳定 ID。
- `caseId + version` 不可变历史版本；同版本不同内容会拒绝安装。
- 12 类题型渲染器。
- 三次作答、渐进提示、答案揭示、节点分支、后果与评分。
- Attempt、Progress、Mistake、Mastery 的原子完成写入。
- Dashboard、Cases、Training、Debrief、Mistakes、Skills、Profile、Settings 页面。
- deprecated 默认隐藏但历史 Attempt 和精确案件版本继续保留。
- 用户数据导入导出与 Content Pack 导入完全分离。

### 4.3 当前 Content Pack

当前生成清单：`content/manifests/content-manifest.json`

```text
contentVersion: 1.1.0
schemaVersion: 1
activePublishedCaseCount: 24
caseVersionCount: 24
beginner: 12
intermediate: 8
advanced: 4
active domains: 15
362-case target: 24 complete / 338 remaining
```

24 个案件共包含：

- 64 个决策节点
- 128 条证据
- 192 个选项
- 15 个活跃领域均有覆盖
- 10/12 个中高级案件覆盖至少三个领域

最近一次完整内容门禁记录：

- Schema 校验：0 问题
- 图可达性、死循环和合法终点：0 问题
- 重复稳定 ID：0 问题
- 内容质量检查：0 问题
- Manifest 字节漂移：0
- Coverage Audit：通过

### 4.4 最近一次完整工程验证记录

- Vitest：51 个测试文件、527 项测试通过
- TypeScript typecheck：通过
- ESLint：通过，0 warning
- Prettier：通过
- Production build：通过
- 独立终审：无剩余 Critical 或 Important 问题
- 已知非阻断提示：Vite 主包 588.34 kB minified / 166.84 kB gzip

以上是上一阶段完成时的验证记录。本轮实施完成后必须重新运行测试和 build，不能把这组历史结果当作新代码的通过证明。

---

## 五、当前真实产品缺口

### G1：训练完成后没有用户可见的复盘入口

底层 Attempt 已经完成并保存，但 `src/pages/training/TrainingSessionPage.tsx` 的完成态只显示分数和 verdict，没有链接到现有 `/debrief/:attemptId`。

影响：用户完成训练后无法自然进入复盘，P0 训练闭环在 UI 上中断。

最小修复：

- 在完成态增加 `Review decisions`，链接到精确的 `completedAttempt.id`。
- 增加 `Back to today's plan`，返回首页。
- 不修改评分、Attempt Schema 或 Debrief 数据模型。

### G2：页面显示 Resume，但训练路由没有真正恢复未完成 Attempt

- `CaseLibraryPage` 会根据进行中记录显示 Resume。
- `training-service.ts` 已经实现并测试 `resumeAttempt()`。
- `TrainingRoutePage.tsx` 目前每次进入都调用 `createTrainingSession()`，没有读取进行中 Attempt。

影响：学习者中断后点击 Resume 实际会创建新 Attempt，损害每日使用的连续性和信任。

最小修复：

- 路由读取当前用户、当前 `caseId + caseVersion` 的最新进行中 Attempt。
- 存在时调用已有 `resumeAttempt()`；不存在时才创建新 Session。
- 不新增 Repository、Store 或迁移。

### G3：首页只有一条推荐，没有“今日计划”进度

`DashboardPage.tsx` 已经显示 `Today's training`，并调用已有 `recommendCases()`，但只展示第一条推荐：

- 没有今日推荐序列。
- 没有“今天已完成多少项”。
- 没有预计训练时间。
- 完成后没有在首页形成可见闭环。

### G4：缺少一条真实 Content Pack 的完整产品集成测试

现有测试分别证明内容加载、训练 Service、IndexedDB 原子写入和 Debrief 页面，但缺少一条使用真实 published 案件验证下列完整路径的测试：

```text
Content Pack
  -> active case
  -> correct training path
  -> completed attempt and score
  -> mastery persisted
  -> exact-version debrief available
  -> Dashboard marks today's completion
```

---

## 六、首发 10 个高质量案件

独立内容审查确认：可以从当前 24 个案件中直接选出 10 个首发案件，不需要推翻 Case Schema 或重做内容结构。

| 排名 | Case ID | 难度 | 首发价值 | 发布前局部补强点 |
|---:|---|---|---|---|
| 1 | `agent-approval-boundary-bypass-001` | advanced | 审批竞态、服务端授权、幂等与客户恢复形成完整 Agent 安全闭环 | capability 的签发密钥轮换与 replay 存储可后续增强，不阻断 MVP |
| 2 | `zero-downtime-schema-migration-001` | advanced | expand-migrate-contract、混合版本服务和公共 API 决策真实 | verification 可补回填正确率与未解析项清零门槛 |
| 3 | `multi-region-rag-consistency-001` | advanced | 索引快照、区域路由、数据面健康和授权撤销证据链强 | 必须明确 2 分钟新鲜度目标与 0.1% 超标率的 SLO 关系 |
| 4 | `inference-gpu-oom-capacity-001` | advanced | 从 OOM 诊断推进到 token 准入、异构 GPU 调度和过载控制 | KV-cache 容量推导可后续增强，不阻断 MVP |
| 5 | `rag-permission-filter-gap-001` | intermediate | 身份声明漂移、fail-closed 与服务端授权矩阵完整 | 可后续增加多组、组撤销和授权缓存失效测试 |
| 6 | `api-webhook-idempotency-001` | intermediate | 诊断、历史补救和异步履约架构衔接自然 | 必须明确 eventId 登记与可靠入队的原子边界或 transactional outbox |
| 7 | `warehouse-late-arrival-watermark-001` | intermediate | 迟到事件、水位线、暂定语义与幂等回补贴近真实事故 | 可补看板暂定标签与最终化通知验证 |
| 8 | `llm-eval-dataset-leakage-001` | intermediate | 哈希重叠、去污染得分和独立盲测形成可信评估链 | 可后续补 holdout 样本量、置信区间和发布阈值 |
| 9 | `customer-pilot-production-gap-001` | intermediate | 能识别人工补位、试点指标失真、支持责任和受控扩展 | 必须把修正率、回退率、队列和告警 gate 写成可裁决阈值 |
| 10 | `rag-stale-policy-cache-001` | beginner | 清楚区分正确索引与陈旧回答缓存，适合首次训练 | 可后续补发布事件丢失和其他租户对照验证 |

强备选：

- `agent-tool-timeout-retry-001`
- `inference-quantization-regression-001`
- `k8s-secret-rotation-rollout-001`
- `security-log-pii-exposure-001`

### 推荐的内容处理方式

1. 保留全部 24 个案件在 Content Pack 中，不删除、不隐藏其余 14 个。
2. 将上表 10 个作为本轮人工验收重点，不在 TSX 中硬编码首发 Case ID。
3. 对三个必须补强的案件发布新版本，而不是静默修改 v1：
   - `multi-region-rag-consistency-001`
   - `api-webhook-idempotency-001`
   - `customer-pilot-production-gap-001`
4. 原 v1 继续保留，Manifest 的 active version 指向通过审核的新版本。
5. 其余七个案件只在发现事实错误或阻断性歧义时才升级版本，避免为了改文案制造无价值版本。

审核者需要判断：三个指定案件的局部 v2 补强是否足以达到首发标准，还是存在其他必须在 7 天内修复的内容阻断项。

---

## 七、推荐实施方案

### 7.1 方案 A：Dashboard 内的派生式每日计划（推荐）

不新增页面、数据库表或持久化 Schema，直接复用现有 `recommendCases()`：

```text
active published cases
  + progress
  + mastery
  + mistakes
  + today's completed attempts
  -> buildDailyTrainingPlan()
  -> 1 个 Today focus
  -> 最多 2 个 Next recommendations
```

每日计划规则：

1. 只使用当前 Content Pack 中 active、published、非 expert 的案件。
2. 排序继续使用现有证据层级：
   - 有 Critical 决策的案件或关联技能
   - mastery 低于 40 的薄弱技能
   - 新达到 competent、需要迁移验证的技能
   - 需要复习的旧案件
   - 没有历史时的稳定基线顺序
3. 计划最多包含 3 个不同案件：1 个今日重点，最多 2 个可选加练。
4. 完成至少 1 个案件即达到今日训练目标；UI 同时展示 `completed / planned`。
5. 今天已完成的案件保留在计划中并显示 Completed，链接到当天最新 Debrief。
6. 首个未完成案件成为主 CTA。
7. 计划总预计时间取所列案件 `estimatedMinutes` 之和。
8. 使用用户本地自然日判断“今天”，忽略非法时间戳。
9. 完成案件后 mastery 按现有原子完成事务更新；Dashboard 重新加载时推荐可以根据新 mastery 自适应调整。
10. 不把计划保存到新 Store。当天剩余推荐随 mastery 变化属于有意的自适应行为，不是数据丢失。

优点：

- 最小改动，能在 7 天内交付。
- 不增加内容或用户数据 Schema。
- 直接验证“薄弱技能推荐是否有用”。
- 失败面小，现有推荐与 mastery 逻辑可以复用。

已知取舍：

- 未持久化的剩余推荐可能在完成一个案件后重新排序。
- 没有登录和云同步时，计划只属于当前浏览器的本地用户。
- 本轮不记录曝光、点击或留存分析，只验证可用性和主观复用意愿。

### 7.2 方案 B：把每日计划写入 Settings 或新 Store（不推荐）

优点：同一天的三项顺序完全稳定。

缺点：需要扩展用户数据 Schema、导入导出和迁移测试，增加与核心假设无关的工作。本轮不建议实施。

### 7.3 方案 C：新增独立 Daily Training 页面和 Session 编排器（不推荐）

优点：未来可以支持队列、提醒和完整课程。

缺点：新增路由、页面、计划状态和编排抽象，明显超出 7 天 MVP。本轮不建议实施。

---

## 八、最小代码修改边界

预计只修改或新增以下责任范围：

```text
src/application/product/catalog.ts
  - 增加纯函数 buildDailyTrainingPlan

src/application/product/catalog.test.ts
  - 每日计划排序、今日完成、确定性和边界测试

src/pages/dashboard/DashboardPage.tsx
  - 把现有 Today's training 升级为今日重点、进度和两项后续推荐

src/pages/product-pages.test.tsx
  - Dashboard 每日计划组件测试

src/pages/training/TrainingSessionPage.tsx
  - 完成态增加 Debrief 与返回首页入口

src/pages/training/TrainingSessionPage.test.tsx
  - 精确 Attempt ID 的复盘链接测试

src/pages/training/TrainingRoutePage.tsx
  - 调用已有 resumeAttempt，不创建新训练抽象

src/pages/training/TrainingRoutePage.test.tsx
  - 精确 case/version 恢复测试

src/styles/global.css
  - 只增加今日计划和完成态所需的最小样式

content/cases/**/[三个指定案件].v2.json
content/manifests/content-config.json
content/manifests/content-manifest.json
src/generated/content-index.ts
  - 发布三个局部补强版本并重新生成内容产物

一条 MVP 产品闭环集成测试
  - 使用真实 Content Pack 案件验证训练、评分、mastery、复盘与首页完成状态

docs/agent-state.md
  - 记录本轮边界、修改和最终验证
```

明确不修改：

- Case Schema 和 ContentSource 接口
- ContentInstaller 与 IndexedDB 版本
- 题型引擎
- 节点评分和案件评分公式
- Mastery 更新公式
- Mistake 数据模型
- Debrief 数据模型
- 用户导入导出格式
- 账号、后台、CMS 或网络能力

---

## 九、P0 验收标准

### P0-1：10 个首发案件

- 上表 10 个案件全部可以从 active Content Pack 读取。
- 三个指定内容补强以新版本发布，原版本继续保留。
- 10 个案件通过 Schema、Graph、Duplicate ID、Quality 和 Coverage 门禁。
- 每个案件仍包含场景、证据链、决策节点、错误解析、根因、修复和验证。

### P0-2：完整进入 Content Pack

- Manifest 的 active version 与配置一致。
- `content:check` 不存在生成产物漂移。
- 页面通过 Repository 加载案件，不新增手工 TSX import 或硬编码正式题目。

### P0-3：完整训练、评分和复盘

- 用户能从首页进入案件并完成所有节点。
- 最终 Attempt 包含 caseId、caseVersion、schemaVersion、completedAt、score 和 verdict。
- Progress、Mistakes、Mastery 与 Attempt 在同一完成事务提交。
- 完成态可进入精确 Attempt 的 Debrief。
- Debrief 使用 Attempt 保存的精确 `caseId + caseVersion`。
- 中断后重新进入可以恢复当前版本的进行中 Attempt。

### P0-4：首页今日训练入口

- 首页首屏能看到今日重点案件、原因、预计时间和主 CTA。
- 没有历史时仍能生成稳定的入门计划。
- 有历史时优先显示 Critical 或薄弱技能相关案件。
- 完成后首页能显示今天的已完成状态。

---

## 十、P1 验收标准：每日训练模式

- 计划最多包含 3 个不同的 active published 案件。
- 推荐明确使用 mastery、critical mistakes 和历史进度。
- 完成至少一个案件后今日目标显示完成。
- 今天完成的案件显示分数或 Debrief 入口。
- 首个未完成案件始终有可操作 CTA。
- 完成训练后已有 mastery 记录的 score 和 sampleCount 更新。
- 没有 mastery 时仍提供确定性基线计划。
- deprecated、历史版本和 expert 案件不会进入默认今日计划。
- 不新增 CMS、后台、账号、云同步或远程调用。

---

## 十一、强制测试矩阵

### 11.1 每日计划纯函数

至少证明：

1. 薄弱技能案件排在普通 fallback 之前。
2. Critical mistake 的本案或迁移案件优先。
3. 没有用户历史时结果稳定且无重复。
4. 今天已完成案件被标记并保留复盘入口。
5. 其他日期的 Attempt 不算今日完成。
6. 非法时间戳不会导致页面崩溃。
7. deprecated、非 active 和 expert 案件被排除。
8. 案件少于 3 个时安全返回实际数量。

### 11.2 Dashboard 组件

至少证明：

1. 首屏显示 Today focus 和主 CTA。
2. 显示 `completed / planned` 与预计分钟数。
3. 完成项显示 Completed 和精确 Debrief 链接。
4. 没有案件时提供明确空状态，不生成无效训练链接。

### 11.3 Training 与 Debrief

至少证明：

1. 完成页链接包含实际 `completedAttempt.id`。
2. 返回首页入口可用。
3. 相同 active case/version 的进行中 Attempt 被恢复。
4. 其他版本或其他案件的进行中 Attempt 不被错误恢复。
5. 恢复失败提供可理解错误，不静默覆盖旧 Attempt。

### 11.4 真实 Content Pack 集成测试

必须使用至少一个真实 published 案件和真实 Repository 事务证明：

```text
安装或加载 bundled Content Pack
  -> 查询 active summary
  -> 读取精确 Case Version
  -> 沿正确路径完成训练
  -> 生成有效分数和 verdict
  -> 保存 Completed Attempt
  -> 更新对应 Skill Mastery 的 score 与 sampleCount
  -> 用 Attempt ID 和 Case Version 加载 Debrief
  -> 今日计划识别该 Attempt 已完成
```

不得只用 Mock 分别证明每层。

### 11.5 最终命令

实施完成后至少运行：

```bash
npm run content:validate -- --dry-run
npm run content:graph -- --dry-run
npm run content:duplicates -- --dry-run
npm run content:quality -- --dry-run
npm run coverage:audit -- --dry-run
npm run content:check
npm run test:run
npm run typecheck
npm run lint
npm run format:check
npm run build
git diff --check
```

任何失败都必须修复或明确报告，不能只报告最后一条命令。

---

## 十二、建议的 7 天执行顺序

| 天数 | 目标 | 可独立验收的结果 |
|---:|---|---|
| Day 1 | 人工复核 10 个首发案件，补强三个指定案件 | 新版本通过全部内容门禁，v1 保留 |
| Day 2 | 接通训练完成、Debrief 和已有 Resume 能力 | 一个案件可从开始走到复盘，并能中断恢复 |
| Day 3 | 用 TDD 实现纯 `buildDailyTrainingPlan()` | 薄弱技能、Critical、无历史和今日完成测试通过 |
| Day 4 | 升级 Dashboard 今日训练区 | 首页显示重点、进度、预计时间、下一项和完成态 |
| Day 5 | 增加真实 Content Pack 产品闭环集成测试 | 案件、评分、mastery、复盘、今日状态完整通过 |
| Day 6 | 完整回归、可访问性与响应式人工检查 | 测试、typecheck、lint、format、build 全部通过 |
| Day 7 | 修复体验阻断项并形成体验说明 | 可交给首批 FDE 学习者试用，不扩展新功能 |

如果实际开发在一个自动化会话中完成，可以压缩时间，但不得跳过相同的验收门槛。

---

## 十三、需要审核者重点回答的问题

1. 方案 A 是否足以验证“学习者愿意每天使用”，还是存在真正的 P0 缺口？
2. “每日 1 个重点 + 2 个可选加练，完成 1 个即达标”是否合适？
3. 不持久化每日计划、允许完成后剩余推荐自适应重排，是否是可接受的 MVP 取舍？
4. 现有 24 个案件中选定的 10 个是否足以首发？
5. 三个指定案件发布局部 v2 是否覆盖了发布前最重要的内容歧义？
6. Training 完成页增加 Debrief 链接、路由接入已有 Resume，是否闭合了用户可达训练链路？
7. 测试矩阵是否真正证明 Content Pack、评分、mastery 和复盘集成，而不是只验证 Mock？
8. 本方案是否无意中引入了新的内容双重真相、用户数据兼容风险或无必要抽象？
9. 哪些问题必须在体验版交付前修复，哪些可以在真实用户反馈后再做？
10. 如果结论不是 GO，请给出不超过五项、可在现有文件边界内完成的最小修复清单。

---

## 十四、强制输出格式

审核者必须严格使用以下格式：

```markdown
# FDE Arena 7 天快速 MVP 审核结论

## 1. Verdict

GO / GO_WITH_FIXES / NO_GO

一句话说明是否可以直接开始实施。

## 2. P0 阻断项

| 编号 | 阻断项 | 证据 | 用户影响 | 最小修复文件 | 验收方式 |
|---|---|---|---|---|---|

没有时明确写“无”。

## 3. 训练闭环判断

- 首页入口：通过 / 有条件通过 / 不通过
- 训练与评分：通过 / 有条件通过 / 不通过
- Mastery 更新：通过 / 有条件通过 / 不通过
- Debrief：通过 / 有条件通过 / 不通过
- 中断恢复：通过 / 有条件通过 / 不通过

## 4. 首发 10 案件判断

- 是否足以首发：是 / 有条件 / 否
- 三个 v2 补强是否必要：逐案回答
- 其他必须修复的内容问题：最多列五项

## 5. 每日训练方案判断

- 1 + 2 计划结构：接受 / 修改 / 拒绝
- 派生式、不持久化：接受 / 修改 / 拒绝
- 薄弱技能推荐：是否充分
- 今日完成判定：是否充分

## 6. 数据兼容与架构边界

明确判断方案是否会影响历史 Attempt、Case Version、Mastery 或 Content Pack 单一真相。

## 7. 测试充分性

列出缺失的 P0 测试；没有时写“当前矩阵充分”。

## 8. 最小修改清单

只列本轮允许修改的文件和行为。不得新增 CMS、后台、账号、云同步或新平台抽象。

## 9. 可以延后的事项

列出体验反馈后再决定的事项，不得把它们升级为当前阻断项。

## 10. 最终执行建议

明确写：
- “按推荐方案直接开发”；或
- “完成以下最小修复后开发”；或
- “存在 P0 阻断，暂不实施”。
```

### Verdict 定义

#### GO

没有 P0 阻断项。方案足够小、能闭合用户体验，并可直接实施。

#### GO_WITH_FIXES

方向成立，但有少量必须在开发时一并完成的明确修复。修复不得要求第二轮架构评审。

#### NO_GO

只有在方案无法形成训练闭环、会破坏用户数据/内容版本，或明显无法在 7 天内完成时使用。不得因为缺少 CMS、登录、云同步或分析后台而给出 NO_GO。

---

## 十五、审核包声明

本审核包用于决定是否直接进入快速 MVP 实施，不是代码完成证明。

当前已经确认的方向是：

- 内容平台架构停止扩展。
- 24 个案件继续完整存在于 Content Pack。
- 至少 10 个案件作为首发体验重点。
- 训练完成后必须直接进入可用复盘。
- 每日计划只复用现有推荐、Attempt 和 Mastery 数据。
- 不新增 CMS、后台、账号、云同步、社区或 AI 自动出题。

若审核结论为 GO 或 GO_WITH_FIXES，下一步应直接开发并在完成后运行完整验证，不再进行第二轮方案审核。
