# Knowledge Architecture V2 — Phase 1 Foundation Implementation

> 实施日期：2026-07-17  
> 状态：Phase 1A 基础设施已实现，尚未接入用户能力计算  
> 架构原则：Additive Sidecar Architecture

## 1. 实施结论

本阶段在不替换现有 15 个 Legacy Skill 的前提下，建立了可独立评审的 V2 旁路基础：

```text
现有生产系统（行为不变）

Foundation / Concept / Case / Attempt / Legacy Skill / Mastery

                         ∥ no runtime write/read integration

V2 Sidecar（开发与内容审核工具）

Draft Leaf Skill Graph
        +
Rubric Catalog Contract
        +
Practice Contract
        +
Case-to-Leaf Attribution Contract
        ↓
Validator / JSON Schema / Read-only Explorer
```

当前用户页面、训练、评分、Mastery、Attempt 和 IndexedDB 都不读取 V2 Sidecar。因此，本次实施对已有用户是无感、可逆且无数据迁移的。

## 2. 已完成内容

### 2.1 Leaf Skill Graph Catalog

新增独立目录：

```text
content/skill-graph/v2/releases/0.1.0/catalog.json
```

当前 Catalog 是明确的 `draft`，只包含 7 个结构样例，覆盖 Capability Level 0–6。它声明未来目标是 70 个 Leaf Skill，但不伪装成已冻结的完整 Catalog。

已实现的类型：

- `LeafSkillDefinition`：稳定 ID、`schemaVersion`、父 Legacy Skill、Capability Level、生命周期、证据类型和 Rubric 版本指针；
- `rolls-up-to`：Leaf 到 Legacy Skill 的显式聚合关系；
- `prerequisite`：Leaf Skill 之间的显式先修关系；
- `presents-as`：Legacy Skill 到 Capability Presentation Node 的显式展示关系。

关系不会从 ID 前缀、文件路径或标题推断。

### 2.2 Skill Graph Validator

Validator 会生成结构化且排序稳定的 issue，已覆盖：

- 非法、缺失或重复 ID；
- Leaf ID 与 Legacy Skill ID 冲突；
- 非法 edge discriminator 或 edge shape；
- 悬空 source / target；
- 重复 edge endpoint；
- 自环；
- prerequisite 有向环；
- 缺失、重复或错误的 canonical `rolls-up-to`；
- 同一 Legacy Skill 多个 canonical presentation target；
- published Catalog 不是 70 个 active Leaf；
- published 上下文不是 15 个唯一 Legacy Skill 和 7 个唯一 presentation target；
- published Catalog 未让每个权威 Legacy Skill 获得至少一个 canonical active Leaf roll-up；
- active Leaf 缺失 published Rubric 指针；
- published Catalog 缺失 Legacy Skill 的 canonical presentation mapping。

Catalog 与 Rubric 按 exact `catalogVersion` 绑定。Published Catalog 必须唯一解析到一个 published Rubric Catalog，不能把两个 Rubric Set 的局部覆盖拼接成一个虚假的完整发布。重复 `catalogVersion`、重复 `rubricSetVersion` 和跨 Set 的歧义都会导致校验失败。

Draft 可以少于 70 个 Leaf，也可以尚未绑定 Rubric；但它已包含的每个非 deprecated Leaf 仍必须内部自洽，即有且仅有一条与 `parentSkillId` 匹配的 canonical `rolls-up-to`。

### 2.3 Read-only Skill Graph Explorer

新增开发工具：

```bash
npm run skill-graph:explore -- --format text
npm run skill-graph:explore -- --format json
```

Explorer 只读本地 sidecar，展示：

```text
Legacy Skill
  └─ Leaf Skill
       prerequisites
       rubric version / status
```

它没有添加开发页面，也没有进入生产 Router 或用户界面。

Explorer 只使用与当前选中 `catalogVersion` 精确匹配的唯一 Rubric Catalog。它会在构建展示索引前运行完整 Graph semantic validation；重复 Catalog release、重复 canonical mapping、环或悬空引用都会直接失败，不会跨 release 合并或采用 first/last-wins。

### 2.4 Rubric Catalog Foundation

新增：

```text
content/skill-rubrics/v1/draft-example.json
src/domain/skills/rubric-types.ts
src/content/skill-rubric-schema.ts
```

当前只包含一个明确的 draft Rubric 样例，不代表 70 个 Rubric 已编写或发布。

Rubric Contract 包含：

- stable Rubric ID、Leaf Skill ID 与 version；
- `draft / reviewed / published` 生命周期；
- stable criterion ID；
- evidence type；
- criterion weight（总和必须为 1）；
- `learning < competent < proficient` 的单调阈值；
- author / reviewer 元数据。

Published Rubric Catalog 必须非空，不能包含 draft/reviewed item，必须绑定 exact published Skill Catalog，并必须为权威上下文中每个已指定 active Rubric version 的 active Leaf 提供恰好一个 published Rubric。单个 Catalog 及同一 release 的跨 Set 聚合都会同时拒绝重复 `skillId@version` 和重复 `rubricId@version`；不同 Skill Catalog release 可以复用未变化的同一 Rubric ID/version，而不被迫制造新版本。只有 Skill Catalog 与 Rubric Catalog 都处于 `published` 且版本精确匹配时，Rubric 才会提供给 published Practice 或 approved Attribution；任何歧义都会 fail closed。

### 2.5 Practice Schema Foundation

新增：

```text
content/practices/README.md
src/domain/practices/types.ts
src/content/practice-schema.ts
```

Practice 只是未来 authored content 契约，本阶段没有 Practice 内容、页面、Attempt 或运行引擎。

契约和交叉校验强制：

- 恰好一个 scalar `primaryConceptId`；
- 1–3 个 Foundation ID；
- 恰好一个 `primaryLeafSkillId`；
- 恰好一个 authored action，且 `scored: true`；
- 3–8 分钟的预计时长；
- Concept / Foundation / Leaf / Rubric / criterion 引用完整；
- deterministic evaluation 必须有 authored answer contract 与 scoring rule；
- evidence output field 和 deterministic expected field 必须能由 action response contract 产生；
- evidence artifact type 必须与 Rubric / Leaf 允许的 evidence type 一致；
- authored JSON 不允许保存用户 outcome、score 或 completion state。

### 2.6 Attribution Prototype

新增：

```text
content/skill-attribution/README.md
src/content/case-leaf-attribution-schema.ts
```

当前只定义 sidecar schema，没有对历史 Case 做任何回填。

每条 attribution 显式保存：

- `caseId + caseVersion + nodeId`；
- `leafSkillId + rubricVersion`；
- primary / secondary role；
- rationale；
- reviewer。

校验会检查 exact Case version、node 归属、Leaf/Rubric 引用和重复 attribution。同一 Case/version/node/Leaf 不能同时标成 primary 与 secondary，但同一节点可以显式关联不同 Leaf。Approved map 还必须引用 active Leaf 及其当前 active published Rubric version。

### 2.7 JSON Schema 和自动门禁

生成的 V2 JSON Schema：

```text
content/schemas/skill-catalog.schema.json
content/schemas/skill-rubric.schema.json
content/schemas/practice.schema.json
content/schemas/case-leaf-attribution.schema.json
```

工具命令：

```bash
npm run knowledge:v2:schemas
npm run knowledge:v2:check
npm run knowledge:v2:validate
```

`build` 现在会以只读方式执行 `knowledge:v2:validate` 和 `knowledge:v2:check`。这两个门禁不会修改 Content Pack v1、Manifest 或 generated Case index。

Catalog 发现只扫描 release 目录中的 `**/catalog.json`；未来放在同一目录的 `release.json` 或其他 sidecar 不会被错认为 Catalog。直接传入一个 JSON 文件仍用于定向校验。

## 3. 数据边界

### 3.1 仍然是权威事实的 v1 资产

- 100 个 Foundation；
- 50 个 Concept；
- 15 个 Legacy Skill；
- 已有 Case ID 和 Case version；
- Attempt / Mistake / Progress / SkillMastery 历史；
- IndexedDB 现有 stores；
- Content Pack v1 的 Manifest、checksum 与加载行为。

V2 validator 只读取这些权威来源作为 cross-reference context，不回写它们。

### 3.2 本阶段没有接入的内容

- 没有将 Leaf Skill 加入 `content/skills/`；
- 没有将 V2 扩展加入 Content Pack v1；
- 没有新 IndexedDB store 或 Repository；
- 没有 Leaf Evidence 计算；
- 没有 Profile V2 或 Capability Map 双读；
- 没有 Practice runtime / Practice Attempt；
- 没有 Attribution backfill；
- 没有修改 Training / Scoring / Mastery；
- 没有修改 Dashboard / Capability Profile。

### 3.3 当前 draft 不是发布单元

当前任务只要求基础契约和 draft 示例，因此没有提前实现完整 release manifest、active pointer 或绑定 checksum 流程。真正 published Catalog 只能在 70 Leaf + 70 个已审核并进入 `published` 状态的 Rubric 冻结后，以 append-only release 完成，不得将当前 draft 原地改成无法回放的发布历史。

## 4. 标准开发流程

### 4.1 审核 Skill Graph draft

1. 在新 release 目录中编辑 Catalog；
2. 为每个新 Leaf 分配永久 ID 和 `schemaVersion: 1`；
3. 显式编写 canonical `rolls-up-to`、prerequisite 和需要的 `presents-as`；
4. 运行 `npm run knowledge:v2:validate`；
5. 运行 `npm run skill-graph:explore -- --format text` 做人工审核。

### 4.2 更新 V2 Schema

```bash
npm run knowledge:v2:schemas
npm run knowledge:v2:check
```

Schema 源仍是 TypeScript / Zod Contract；`content/schemas/*.json` 是可重建产物，不应手工维护。

### 4.3 发布前门禁

Catalog 进入 `published` 前至少要满足：

- 恰好 70 个 active Leaf；
- 15 个权威 Legacy Skill 和 7 个权威 presentation target；
- 每个 active Leaf 有 canonical parent；
- 每个 active Leaf 指向 published Rubric；
- 每个 Legacy Skill 恰好一个 canonical presentation mapping；
- graph 无环、无悬空引用、无 ID 冲突；
- JSON Schema 与 Zod Contract 无 drift。

## 5. Phase 1B 路线

下一步不是立即迁移 Mastery，而是选择 5–10 个现有 Case 做可审计的 Attribution Pilot：

1. 选择覆盖不同 Case archetype 的 5–10 个 exact Case version；
2. 由 reviewer 对 exact node 编写 draft attribution；
3. 完成独立的人工复核与分歧闭环；
4. 生成只读 shadow projection，记录 eligible / legacy-only / rejected reason；
5. 验证 exact CaseVersion、round history、score 和 verdict 可重放；
6. 证明同一 source evidence 不会在 legacy 与 leaf 估算中双计；
7. 只有 shadow 结果稳定后，才评审 dual-read 和 Evidence Ledger；
8. 仍然不重写旧 Attempt，不拆分旧 Mastery，不回填用户数据。

## 6. 验证结果

| 门禁 | 结果 |
|---|---|
| Skill Graph schema / validator | 2 files / 31 tests passed |
| Rubric / Practice / Attribution | 3 files / 37 tests passed |
| V2 CLI / Explorer / Schema artifacts | 3 files / 43 tests passed |
| V2 focused regression | 8 files / 111 tests passed |
| `npm run knowledge:v2:validate` | passed, 0 issues |
| `npm run knowledge:v2:check` | passed, 4 artifacts in sync |
| Existing `npm run content:validate` | passed: 53 Cases / 15 Domains / 15 Legacy Skills / 100 Foundations / 50 Concepts, 0 issues |
| Full Vitest | 80 files / 836 tests passed |
| TypeScript | passed |
| ESLint | passed with 0 warnings |
| Production build | passed; 4 V2 schemas in sync; only the pre-existing chunk-size advisory remains |
| Protected-scope hash audit | 309 pre-existing protected files unchanged |

## 7. 不可越过的下阶段门禁

在 Phase 1B 另行评审前，不得：

- 把 70 Leaf Skill 加入现有 active Skill Catalog；
- 用 Legacy Mastery 平均拆分 Leaf Mastery；
- 把 draft Attribution 当作用户能力证据；
- 让 Practice 伪装成 Case Attempt；
- 把阅读 Foundation / Concept 当作 Mastery Evidence；
- 在没有 export/import 兼容设计前增加不可迁移的用户 Evidence 数据；
- 修改已发布 ID 或原地覆盖历史版本。
