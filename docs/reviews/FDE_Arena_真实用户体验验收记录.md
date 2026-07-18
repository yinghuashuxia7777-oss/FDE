# FDE Arena 真实用户体验验收记录

日期：2026-07-13
范围：中文化终验后的 Dashboard → 今日训练 → 案件作答 → 评分 → Mastery → Debrief → 返回首页闭环

## 1. 结论边界

- 自动化预验：通过。核心闭环、中文/英文程序界面、训练反馈、历史版本复盘、Mastery 持久化和 10 个首发案件均有自动化或静态证据。
- 真实浏览器视觉验收：未执行。项目安全规则禁止本任务自行启动 `npm run dev`、浏览器自动化或长驻服务，因此本文不会把 jsdom、CSS 契约测试或代码审查描述为真实浏览器结果。
- 架构与数据边界：未调整 Content Pack、Case Schema、Training Engine、Scoring、Mastery、Attempt 或 IndexedDB。
- 发布判断：没有内容 P0/P1 阻断；代码可进入人工桌面、平板、手机走查。平板旋转时未提交草稿可能丢失，仍是明确的 P1 体验风险。

## 2. 自动化预验结果

| 验收项 | 结果 | 证据 |
| --- | --- | --- |
| 首页 5 秒可理解性 | PASS | 今日重点案件、推荐原因、已完成/计划、预计分钟数与唯一训练 CTA 均由 Dashboard 测试覆盖 |
| 中文默认与中英切换 | PASS | i18n 默认、持久化、同步控制、词典完整性和页面中文渲染测试 |
| 完整训练与评分 | PASS | 真实 Training Service 的正确、错误、重试、第三次揭示、完成与保存测试 |
| Mastery 更新 | PASS（MVP） | 完成事务原子更新 Attempt/Progress/Mastery；完成页明确提示已更新并提供技能地图入口 |
| Debrief | PASS | 精确案件版本、每轮提交、正确提交、选项解析、根因、修复、验证与返回今日计划均有测试 |
| 内部 ID 隔离 | PASS | 未注册 errorType 回退为通用标签；有准确内容时路径与严重风险显示节点标题/选项文案 |
| 移动端反馈邻近性 | PASS | 错误反馈与重试控件位于同一 Options disclosure；证据默认展开 |
| 训练页路由标题与焦点 | PASS | 作答态与完成态均提供 `#page-title`，初次进入和完成时单次聚焦 |
| 10 个首发案件 | PASS | 10/10 活跃版本通过 Schema、图、重复 ID、技能、质量与人工内容检查 |
| 真实浏览器无裁切/无溢出 | NOT RUN | 必须由用户手动启动服务后在真实设备尺寸核验 |

## 3. 本轮修复的体验问题

1. 训练完成页现在明确说明本次训练已更新 Mastery 与今日计划，并提供“复盘决策”“查看 Mastery”“返回今日计划”三个明确出口。
2. 完整 Debrief 末尾增加“返回今日计划”，闭合训练循环。
3. 复盘的实际路径、推荐路径和严重风险使用作者编写的节点标题与选项文案，不再在正常路径暴露 `nodeId`/`optionId`。
4. 案件专用错误分类不再把内部英文 slug 泄露到中文界面；未知分类显示通用决策错误标签。
5. 移动端默认展开 Evidence；错误提示移动到 Options 区域，与“再试一次/继续”保持同一区域。
6. 真实案件作答态和完成态补齐页面标题标识及一次性焦点，避免异步路由进入后主区域失去可访问名称与焦点目标。

## 4. 首发 10 案件检查

| 难度 | 案件与活跃版本 | 结果 | 核心质量判断 |
| --- | --- | --- | --- |
| 高级 | `agent-approval-boundary-bypass-001@1` | PASS | 审批竞态、服务端 capability、幂等重放、客户恢复闭环完整 |
| 高级 | `zero-downtime-schema-migration-001@1` | PASS | expand-migrate-contract、双写兼容、API 演进和回滚路径完整 |
| 高级 | `multi-region-rag-consistency-001@2` | PASS | 120 秒/99.9% SLO、ACL 撤销和发布门禁可裁决 |
| 高级 | `inference-gpu-oom-capacity-001@1` | PASS | OOM 证据、token 准入、调度与过载保护形成因果链 |
| 中级 | `rag-permission-filter-gap-001@1` | PASS | fail-open、跨组暴露、授权正负矩阵与跨层契约完整 |
| 中级 | `api-webhook-idempotency-001@2` | PASS | event ledger 与 transactional outbox 原子边界、恢复与去重完整 |
| 中级 | `warehouse-late-arrival-watermark-001@1` | PASS | 迟到语义、幂等、影响界定、观测与回补闭环完整 |
| 中级 | `llm-eval-dataset-leakage-001@1` | PASS | 重叠证据、盲测、holdout 隔离、污染扫描与血缘完整 |
| 中级 | `customer-pilot-production-gap-001@2` | PASS | 连续 14 天量化门禁、回退、队列与 P1 响应标准完整 |
| 初级 | `rag-stale-policy-cache-001@1` | PASS | 版本证据定位缓存层，发布失效与合成回归闭环清楚 |

历史 `multi-region-rag-consistency-001@1`、`api-webhook-idempotency-001@1`、`customer-pilot-production-gap-001@1` 继续保留以兼容旧记录，但不是首发活跃版本；对应 v2 才是本次 PASS 的发布版本。

## 5. 人工真实浏览器核验清单

### 启动与停止

请用户在项目目录手动运行：

```bash
npm run dev
```

打开终端显示的本地 URL（通常为 `http://localhost:5173`）。完成后在同一终端按 `Ctrl+C` 停止服务。本任务未代为启动该服务。

### 视口矩阵

- Desktop：1440 × 900
- Tablet landscape：1024 × 768
- Tablet portrait：768 × 1024
- Mobile：390 × 844
- Narrow mobile：360 × 800

### 中文闭环

1. 首次打开确认文档与程序界面为简体中文。
2. 首页顶部 5 秒内确认能回答：今天练什么、为什么推荐、预计多久、从哪里开始。
3. 点击今日训练；确认场景、Evidence、问题、选项和提交按钮无遮挡。
4. 先选错误项；确认提示出现在选项区域，能理解为什么错并能重试。
5. 完成案件；确认分数、结果、Mastery 更新说明和三个后续入口可见。
6. 打开 Mastery，确认相关技能已有样本或分值变化。
7. 打开 Debrief，确认实际/推荐路径、每轮答案、正确答案、选项解析、根因、修复、验证和返回今日计划均可理解。
8. 返回首页，确认今日进度和复盘入口已更新。

### 英文程序界面

1. 在首页、Training、Debrief 与 Settings 分别切换到 English。
2. 确认导航、按钮、状态、可访问名称和错误提示均为英文，且没有中文程序文案泄漏。
3. Content Pack 的案件正文是作者内容，不属于程序词典；当前英文 UI 中仍可能显示中文案件正文，这是已知产品边界，不是界面漏译。

### 响应式与可访问性

1. 每个视口检查横向滚动、裁切、按钮重叠和固定导航遮挡。
2. Training 的长日志、JSON、Diff 与配置内容应只在证据块内部横向滚动。
3. 使用键盘完成导航、选项选择、提交、重试、复盘与返回首页。
4. 从案件库进入 Training 后，页面焦点应落到当前决策标题；完成后应落到“案件完成”。
5. 在 DevTools Console 检查：

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

预期为 `true`。

## 6. 剩余风险

- P1：iPad 竖屏与横屏跨越 64rem 断点时，TrainingLayout 会替换移动/桌面 DOM；题型草稿保存在组件本地，未提交选择可能丢失。本轮没有为此重构布局或题型状态。
- MVP 限制：完成页能确认 Mastery 已更新并进入技能地图，但不显示明确的 before → after 数值差。
- 真实视觉证据待补：没有真实浏览器截图、像素溢出检查、平板旋转或触屏操作记录。
- 英文界面仍呈现中文作者案件内容；若需要双语案件，应发布带版本的翻译 Content Pack，不能在程序层改写现有题目。
- 生产主包仍有 Vite 非阻断 chunk-size advisory；不影响本轮体验闭环结论。

## 7. 最终门禁

- `npm run content:validate`：27 个有效案件版本、15 个领域、15 个技能，0 issue。
- `npm run content:quality`：27 个案件版本，validation 0、quality 0。
- `npm run content:graph`：27 个案件版本，0 issue。
- `npm run content:duplicates`：27 个案件版本，无重复 ID。
- `npm run coverage:audit`：24 个活跃发布案件，362 规划剩余 338，跨域比例通过。
- `npm run content:check`：`drift=[]`。
- `npm test -- --run`：54 个测试文件、563 个测试全部通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过，0 warning。
- `npm run format:check`：通过。
- `npm run build`：通过；主包 664.37 kB minified / 185.42 kB gzip，保留 Vite 非阻断体积提示。
