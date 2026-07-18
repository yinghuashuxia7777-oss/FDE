# FDE Arena Review State

## 2026-07-18 Beta Productization Sprint — PASS

AI Growth OS 的 MVP Capability Loop 已成为可直接操作的 Beta 体验。

### New experiences

- `/practices`：40 个 Practice 列表；
- `/practices/:practiceId`：文本提交、本地规则评估、会话 Evidence；
- `/projects` 与 `/projects/:projectId`：三个 Project、里程碑、Required
  Skills、deliverables 与只读进度；
- `/profile/demo`：完全隔离的公开 Demo Engineer Profile；
- Dashboard Journey：Foundation -> Practice -> Case -> Project -> Evidence
  五步入口，原 Capability Map 与 Dashboard 架构保持不变。

### Content

- 40 reviewed MVP Leaf Skills；
- 40 matching draft Rubrics；
- 40 executable Practice Definitions + authored local runtime rules；
- 全部 50 active Case IDs 的 exact-version Attribution，113 条 node/Leaf
  entries；
- Portfolio 配额：Software 10 / AI Application 15 / Agent 10 / Production
  10 / FDE 5；
- 3 definition-only Project templates。

### Data boundary

Practice Evidence 仅存在于当前 React 会话，用于即时只读 projection；刷新
后清空。没有修改 Legacy Mastery、Mastery algorithm、Attempt、IndexedDB、
Case/Foundation/Concept ID 或历史用户数据，没有 migration、Evidence Ledger、
AI API 或 backend。

### Verification

- V2 validation: PASS, 0 issues;
- Full Vitest: 84 files / 850 tests PASS;
- TypeScript: PASS;
- ESLint: PASS, 0 warnings;
- Schema/content drift: PASS;
- Production build: PASS;
- Vite 仍提示 main chunk 大于 500 kB；这是非阻断性能提示。

---

## 2026-07-18 MVP Capability Loop — PASS

AI Growth OS 已形成可演示、可使用的轻量能力闭环：Knowledge -> Practice
definition -> Case Challenge -> completed Attempt -> read-only Leaf Evidence
projection -> Capability Map / Capability Profile。

交付统计：

- 30 个 reviewed MVP Leaf Skills；
- 30 个 matching draft Rubrics；
- 20 个 exact Case/version mappings，合计 47 条 node/Leaf attribution；
- 30 个单 Concept、单 Skill、单 scored action 的 draft Practices；
- 3 个 definition-only Project templates；
- 隔离 Demo Profile：AI Engineer、72% Readiness、20 Cases、1 Project，
  LLM 85 / Agent 75 / RAG 80 / Cloud 60。

数据边界保持不变：没有修改 Legacy Skill、Foundation/Concept/Case ID 或
Case version、Attempt、Mastery algorithm、IndexedDB、Dashboard layout；没有
历史回填或 Evidence Ledger。MVP projection 是纯只读 read model，secondary
evidence 不获得虚构分数，也不做平均拆分。

验证：V2 content validation PASS（0 issues）；82 Vitest files / 844 tests
PASS；TypeScript PASS；ESLint 0 warnings；Schema drift PASS；production build
PASS。Vite 仅保留既有的 main chunk 大于 500 kB 提示。

---

## Decision

**PASS** — Knowledge Architecture V2 Phase 1 Foundation 已按 Additive
Sidecar Architecture 完成。V2 基础设施可以独立审核，但尚未进入用户能力计算或
生产页面。

- Updated: 2026-07-17
- Scope: Leaf Skill Graph、Rubric、Practice、Attribution 契约与开发工具
- Production impact: 无运行时接入、无历史数据迁移、无用户可见行为变化

## Delivered

1. 独立 V2 Skill Graph Catalog：当前为 7 个 Level 0–6 的 draft 样例，
   明确不冒充最终 70 Leaf Skill。
2. Graph Validator：稳定 ID、重复/悬空 edge、自环、prerequisite cycle、
   canonical rollup/presentation、生命周期和 published completeness 门禁。
3. Read-only Explorer：展示 Legacy Skill → Leaf Skill → prerequisite →
   Rubric 状态，不进入生产 Router。
4. Rubric Catalog Foundation：独立 contract、生命周期、criteria、evidence
   type 与单调阈值；当前只有 1 个 draft 样例。
5. Practice Schema Foundation：一个 Concept、1–3 Foundation、一个 Leaf
   Skill、一个 scored action 与 deterministic answer/scoring contract。
6. Case Leaf Attribution Schema：绑定 exact Case version/node、Leaf、
   Rubric、role、rationale 与 reviewer；当前没有历史回填。
7. 4 个可重建 JSON Schema，以及 V2 validate/check/explorer 命令。

## Preserved Boundaries

- 309 个受保护旧文件的任务前后 SHA-256 完全一致。
- 未修改 15 个 Legacy Skill、Foundation/Concept/Case ID、Case version、
  Attempt/Mistake/Progress/Mastery、IndexedDB、Training、Scoring、
  Dashboard、Capability Profile 或 Content Pack v1。
- Demo/Real Capability 数据流和现有用户历史没有变化。
- 未新增依赖、服务、后端、数据库或生产路由。

## Verification

| Check | Result |
| --- | --- |
| V2 focused regression | **PASS — 8 files / 111 tests** |
| Full Vitest | **PASS — 80 files / 836 tests** |
| Existing content validation | **PASS — 53 Cases / 15 Domains / 15 Skills / 100 Foundations / 50 Concepts / 0 issues** |
| V2 validation | **PASS — 7 draft Leaves / 1 draft Rubric / 0 Practice / 0 Attribution / 0 issues** |
| V2 Schema drift | **PASS — 4 artifacts in sync** |
| TypeScript | **PASS** |
| ESLint | **PASS — 0 warnings** |
| Scoped Prettier | **PASS** |
| `git diff --check` | **PASS** |
| Production build | **PASS** |
| Independent final review | **PASS after publication/explorer hardening** |

Vite 仅保留既有主 JS chunk 大于 500 kB 的非阻断提示。

## Next Gate

Phase 1B 只能另行选择 5–10 个 Case 做 Attribution Pilot，并先以只读
shadow projection 验证。不得直接迁移 Mastery、回填历史 Attempt，或把 draft
Attribution 当作用户能力证据。

完整实施说明：
`docs/knowledge-architecture-v2-phase1-implementation.md`。

未执行 Git stage/commit/reset。
