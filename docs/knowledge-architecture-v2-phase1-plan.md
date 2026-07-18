# Knowledge Architecture V2 — Phase 1 Implementation Plan

> 状态：实施设计，尚未执行  
> 目标：在不破坏现有资产的前提下，为 70 个 Leaf Skill、证据归因与 Practice Layer 建立可实施基础  
> 依据：`docs/knowledge-architecture-v2.md` 与当前仓库代码（审查日期：2026-07-17）

## Executive Decision

Phase 1 采用 **additive sidecar → shadow projection → dual-read → leaf-primary** 的演进路径，而不是替换现有 15 个 Skill。

当前审查基线为：100 Foundation、50 Concept、50 active Case（53 个 Case version 文件）、15 个 active legacy Skill。Phase 1 不改变这些数量或现有运行口径。

```text
现有系统（继续工作）

Case v1 + Attempt v1 + Legacy Mastery
                    │
                    │ exact CaseVersion + roundHistory
                    ▼
V2 旁路能力层（先只读）

70 Leaf Skill Catalog
        +
Versioned Rubrics
        +
Reviewed Case Attribution Map
        │
        ▼
Leaf Evidence Projection
        │
        ├── Legacy-only evidence（保留、可见、不拆分）
        └── Reviewed leaf evidence（可审计、不双计）
```

核心决定：

1. 15 个现有 Skill 永久作为 legacy aggregate 保留，70 个 Leaf Skill 是新增能力层，不是替换层。
2. Phase 1A 不修改 `ContentPack` v1、Case Schema、Attempt、Mastery、IndexedDB 或 Profile；先冻结机器可校验的 Catalog、Rubric 与 5–10 个 Case 的人工归因试点。
3. 历史 `SkillMasteryRecord` 是不可逆聚合，不能平均拆成 Leaf Skill；历史叶子证据只能从 exact CaseVersion 与 `CompletedAttempt.roundHistory` 严格重放。
4. Practice 是独立内容类型，不伪装成 Case，不复用完整 Case graph，也不把阅读完成当 Mastery Evidence。
5. 历史 Attempt 已经形成的 legacy mastery 事实永久保留；但在任何 V2 Leaf estimator、mixed readiness 或 roll-up 中，同一个 `sourceEvidenceKey` 只能选择 native leaf、reviewed backfill leaf 或 legacy-only 其中一个计算分支，禁止再次混合计分。

---

# 1. Current Architecture Boundary

## 1.1 当前真实边界

| 资产 | 当前权威来源 | Phase 1 约束 |
|---|---|---|
| Foundation | `content/foundation/**/*.json`、`src/domain/foundation/types.ts`、`src/content/foundation-schema.ts` | 100 个稳定 ID 不改；不新增字段；不改已有关系 |
| Concept | `content/concepts/**/*.json`、`src/domain/concepts/types.ts`、`src/content/concept-schema.ts` | 50 个稳定 ID 不改；不把 V2 字段直接塞入 strict v1 JSON |
| Legacy Skill | `content/skills/*.json`、`SkillDefinition` in `src/content/contracts.ts` | 15 个 ID、含义、status 与历史标签永久保留 |
| Domain | `content/domains/*.json`、`DomainDefinition` in `src/content/contracts.ts` | 现有 Domain 继续服务旧内容与聚合视图 |
| Case | `content/cases/**/*.vN.json`、`src/domain/cases/types.ts`、`src/schemas/case.schema.ts` | 相同 `(caseId, version)` 永不原地改写；语义变化必须新增版本 |
| Active Case | `content/manifests/content-config.json.activeCases` | 不因 V2 试点改变默认题库 |
| Content Pack | `ContentPack` in `src/content/contracts.ts`、`src/content/validate-content-pack.ts` | Phase 1A 保持 format/schema v1，不静默扩字段 |
| Attempt | `src/repositories/contracts/models.ts` | 不重写、不回填 Leaf Skill 字段、不改变历史 score/verdict |
| Legacy Mastery | `SkillMasteryRecord` 与 `src/domain/mastery/**` | 不拆分、不作为 Leaf score 初值、不改变 0.7/0.3 现有算法 |
| Mistake | `MistakeRecord` | 只可作为同一 Attempt round 的负面注释，不能另算一份证据 |
| Profile / Dashboard | `src/pages/profile/**`、`src/application/product/capability-evidence.ts`、`src/pages/dashboard/capability-map-data.ts` | Phase 1A 不改；Phase 1B 只通过新 read model 双读 |
| Local export | `src/schemas/export.schema.ts` | v1 严格兼容；新数据若需导出，必须新 envelope version |

Foundation 与 Concept 当前由 generated index 本地加载，不进入 `ContentPack` checksum 或 IndexedDB；Domain、Legacy Skill、Case 与 Coverage 才进入当前 Content Pack。这个事实可以用于低风险试点，但不能成为长期绕过内容完整性校验的理由。

## 1.2 Immutable Assets

以下资产视为不可变：

- Foundation ID；
- Concept ID；
- Legacy Skill ID；
- Case ID；
- 已发布 Case version 及其 content hash；
- Attempt ID、`caseId`、`caseVersion`、`roundHistory`、score、verdict 与完成时间；
- 现有 `SkillMasteryRecord`；
- 现有 CaseProgress、Mistake 与用户设置；
- 现有 IndexedDB store 名称、旧 keyPath 与历史记录；
- 当前 export format v1 的含义。

“不可变”不等于永远不能增加新版本，而是：

- 不能给旧 ID 重新定义含义；
- 不能修改相同版本的已发布内容；
- 不能把旧聚合结果改写成看似更精确的新证据；
- 不能通过一次数据库 migration 静默改变历史事实。

## 1.3 为什么不能直接迁移

### `SkillMasteryRecord` 不包含来源

它只有：

```text
userId + skillId + score + sampleCount + updatedAt
```

没有 `attemptId`、Case version、node、rubric version、evidence provenance、独立 Case 数或 archetype 多样性，因此无法逆推出 70 个 Leaf Skill。

### 当前三套 evidence 口径并不相同

- 正式 legacy mastery 使用 node `skillWeights`；
- Mistake 保存 node 命中的 Skill ID，但丢失权重；
- Profile timeline 使用整个 `caseContent.skills`，可能比用户实际访问的节点更宽。

所以当前 `CapabilityEvidenceRecord.skillIds` 只能继续作为 legacy 展示，不能升级为 reviewed leaf attribution。

### 直接把 70 个 Leaf Skill 放入现有 `content/skills` 会污染旧视图

当前 active Skill 会直接进入 Profile、Domain signal、readiness 与推荐逻辑。如果立即新增 70 个 active definition：

- Profile 会同时展示 15 legacy + 70 leaf；
- readiness 与 Domain 聚合可能混合两种统计语义；
- 新叶子大量显示空证据；
- 同一训练可能被 legacy 与 leaf 双计。

因此 Phase 1 必须使用独立 Catalog。

## 1.4 不可破坏的系统不变量

1. 旧 Attempt 永不重写。
2. 旧 Mastery 永不拆分。
3. 旧 CaseVersion 永不原地换 Skill。
4. graph edge 不能从点号 ID 或自然语言推断。
5. 同一 source evidence 可以继续存在于不可逆的历史 legacy aggregate 中，但 V2 estimator / mixed readiness 不得再把该 legacy aggregate 与对应 Leaf Evidence 相加或求平均。
6. Foundation / Concept 阅读完成不产生正式 mastery。
7. in-progress / abandoned Attempt 不授予正式能力。
8. exact CaseVersion 缺失时，历史记录仍保留，但只能标为 legacy-only。
9. attribution 被撤销只重建派生结果，不改源 Attempt。
10. Profile 无 Leaf Evidence 时不能显示伪造的 Leaf 分数。

## 1.5 一个必须提前登记、但本阶段不触发的版本风险

当前训练代码会把 `state.caseContent.schemaVersion` 写入 Attempt 的 `schemaVersion`，而 Attempt schema 本身固定为 v1。未来若直接发布 Case schema v2，可能把 Case schema version 错当成 Attempt schema version。

Phase 1 使用独立、版本化 sidecar，不升级 Case schema，因此不会触发该问题；在任何 Case schema v2 实施前，必须先把 Case schema version 与 Attempt schema version 解耦。

---

# 2. Phase 1 Goal

## 2.1 本阶段真正目标

Phase 1 不实现完整 Knowledge Architecture V2，也不批量补内容。它只建立四个可验证基础：

1. **Leaf Skill Graph Design**：冻结 70 个稳定 Leaf Skill 与显式关系；
2. **Skill Rubric Definition**：定义什么证据可以授予 Learning / Competent / Proficient；
3. **Evidence Attribution Design**：定义旧 Case 如何在不改历史的情况下产生 reviewed leaf evidence；
4. **Practice Layer Design**：定义 Foundation / Concept 与 Case 之间的单点可评分活动。

## 2.2 Phase 1 分成两个安全子阶段

### Phase 1A — Contract & Review Pilot

只新增内容侧契约和离线审查能力：

- Leaf Skill Catalog；
- typed edges；
- versioned rubrics；
- reviewed attribution sidecar；
- 5–10 个现有 Case 的人工归因试点；
- Practice schema、loader 与 validator 的设计/实现；
- shadow projection 报告，不改变 UI 或用户数据。

Phase 1A 不需要新 IndexedDB store 或 Repository。

### Phase 1B — Evidence Projection & Dual Read

只有 Phase 1A 门禁通过后才进入：

- 严格重放历史 Attempt；
- 生成可审计的 Leaf Evidence projection；
- 如性能与跨活动持久化确有需要，再以 additive migration 增加 Evidence Ledger / Leaf Estimate store；
- Capability Profile 双读，但 legacy 仍为稳定回退；
- 不改变 Training、Scoring 与现有 Mastery 写入。

## 2.3 明确不在 Phase 1 内

- 不批量新增 Foundation / Concept / Case；
- 不上线 Project Layer；
- 不让新 Case 直接写 Leaf Mastery；
- 不切换 Dashboard readiness 主算法；
- 不替换现有 15 个 Skill；
- 不升级 Content Pack format；
- 不做 CMS、后台、云同步或 AI Mentor；
- 不运行历史数据破坏性 backfill；
- 不修改现有 Profile UI，直到 shadow projection 通过门禁。

## 2.4 Phase 1 Go / No-Go 总门禁

必须全部满足：

- published Release 机器校验恰好 70 个 active Leaf Skill；reviewed Leaf 只允许存在于发布前中间态；
- ID 与 edge 冻结，无重复、悬空引用或先修环；
- 每个 active Leaf Skill 都指向且只指向一个 published rubric；
- 5–10 个 attribution 试点由两名 reviewer 独立审核；
- reviewer 对 primary leaf target 的一致率达到预设门槛（建议 Cohen's kappa ≥ 0.80，且分歧全部闭环）；
- 旧 Attempt 无需重写；
- shadow replay 不改变任何旧 score / verdict；
- 相同 `sourceEvidenceKey` 在 V2 计算中不发生双计；历史 legacy aggregate 不回写、不扣减；
- 无 reviewed attribution 的历史证据仍完整可见为 legacy-only；
- 现有用户页面与数据在 Phase 1A 下完全不变。

---

# 3. Leaf Skill Graph Implementation Plan

## 3.1 方案比较

| 方案 | 优点 | 主要风险 | 决策 |
|---|---|---|---|
| A. 扩展现有 `SkillDefinition` 并把 70 个 Leaf 加入 `content/skills` | 复用 Content Pack 与现有 Repository | strict schema 变化；85 个 active Skill 污染旧 UI/readiness；legacy 与 leaf 易双计 | 拒绝作为 Phase 1 路线 |
| B. 新增独立 versioned Skill Graph Catalog | additive；旧 15 Skill 不变；关系和 rubric 可独立演进 | Phase 1A 暂未进入 Content Pack checksum | **推荐** |
| C. 立即新增数据库表并迁移全部历史证据 | 查询方便 | 在 rubric 和 attribution 未稳定前固化错误语义；迁移不可逆 | 延后到 Phase 1B 门禁之后 |

## 3.2 推荐 Data Model

### Leaf Skill Definition

逻辑模型：

```ts
interface LeafSkillDefinition {
  schemaVersion: 1;
  id: string;                 // 永久稳定 ID
  name: string;
  description: string;
  parentSkillId: string;      // canonical legacy display parent
  capabilityLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  status: 'draft' | 'reviewed' | 'active' | 'deprecated';
  evidenceTypes: EvidenceOutputType[];
  activeRubricVersion: number | null;
}
```

`parentSkillId` 是唯一的导航/展示 parent，并且必须存在一条匹配的 canonical `rolls-up-to` edge。其他 roll-up 与全部 prerequisite 仍由显式 edge 表达，不能从 ID 推断。draft / reviewed Catalog 在 Rubric 编写阶段允许 `activeRubricVersion: null`；只有 published release 才要求所有 active Leaf 指向 published rubric。

### Typed Graph Edge

```ts
type SkillGraphEdge =
  | {
      id: string;
      type: 'rolls-up-to';
      leafSkillId: string;
      legacySkillId: string;
      canonical: boolean;
    }
  | {
      id: string;
      type: 'prerequisite';
      prerequisiteSkillId: string;
      dependentSkillId: string;
    }
  | {
      id: string;
      type: 'presents-as';
      legacySkillId: string;
      presentationSkillId: string;
    };
```

规则：

- `rolls-up-to` 的 `leafSkillId` 必须是 Leaf Skill，`legacySkillId` 必须是现有 15 个 legacy Skill；
- 一个 Leaf 可以有多个 roll-up target，但必须且只能有一个 `canonical: true`，并与 `parentSkillId` 相同；
- `prerequisite` 只连接 Leaf Skill，方向固定为 `prerequisiteSkillId → dependentSkillId`。例如 `eng.python-runtime → eng.python-packaging` 表示前者是后者的先修；
- prerequisite 影响 Competent / Proficient 授予，不阻止用户提前训练；
- `presents-as` 明确承载 15 legacy 到当前 7 个 Capability Map presentation node 的映射；每个 legacy Skill 必须恰好有一个 presentation target；
- 不允许自环或有向环；
- deprecated ID 永不复用。

### Catalog Envelope

```ts
interface SkillGraphCatalog {
  schemaVersion: 1;
  catalogVersion: string;
  status: 'draft' | 'reviewed' | 'published' | 'deprecated';
  createdAt: string;
  reviewedAt: string | null;
  author: string;
  reviewer: string | null;
  expectedLeafCount: 70;
  leaves: LeafSkillDefinition[];
  edges: SkillGraphEdge[];
  checksum: string;
}
```

Catalog 的 `checksum` 不是自引用字段：生成时移除顶层 `checksum`，调用现有 `canonicalizeContent()` 规则规范化，再计算 `sha256:<hex>`。Rubric Set、Attribution Map 与 Release Manifest 使用同一规则。

### Rubric Set 与 Release Manifest

```ts
interface SkillRubricSet {
  schemaVersion: 1;
  rubricSetVersion: string;
  catalogVersion: string;
  status: 'draft' | 'reviewed' | 'published' | 'deprecated';
  rubrics: SkillRubricDefinition[];
  checksum: string;
}

interface SkillGraphReleaseManifest {
  schemaVersion: 1;
  releaseVersion: string;
  status: 'draft' | 'reviewed' | 'published' | 'deprecated';
  catalogVersion: string;
  catalogChecksum: string;
  rubricSetVersion: string;
  rubricSetChecksum: string;
  checksum: string;
}
```

Release Manifest 通过 exact version + checksum 把 Catalog 与 Rubric Set 绑定成一个可审核发布单元。Attribution Map 在下一步通过 `skillGraphReleaseVersion + skillGraphReleaseChecksum` 绑定这个已发布单元；这样 Catalog/Rubric 可以先发布，Attribution 试点不会形成循环依赖。

## 3.3 推荐未来文件边界

以下是后续实施时的建议路径，本任务不创建这些文件：

```text
content/
└── skill-graph/
    └── v2/
        ├── active.json
        ├── releases/
        │   └── <releaseVersion>/
        │       ├── catalog.json
        │       ├── rubrics.json
        │       └── release.json
        └── attributions/
            └── <mapId>.v<mapVersion>.json

src/
├── domain/
│   └── skills/
│       └── types.ts
├── content/
│   ├── skill-catalog-schema.ts
│   └── skill-catalog-source.ts
└── generated/
    └── skill-catalog-index.ts

content/schemas/
├── skill-catalog.schema.json
├── skill-rubric.schema.json
├── case-leaf-attribution.schema.json
└── skill-graph-release.schema.json
```

每个 `releases/<releaseVersion>/` 与 `attributions/<mapId>.v<mapVersion>.json` 都是 append-only：一旦 published / approved，禁止原地覆盖或删除。`active.json` 只保存当前明确引用，例如 `releaseVersion` 与 `mapId/mapVersion`；切换 pointer 不影响历史版本。generated index 必须能按 exact release/map version 加载，不能只导出 latest。

这个结构保证旧 derivation 绑定的 Catalog、Rubric 与 Attribution 永久可重放。规模扩大后可以优化目录分片，但不能破坏 exact-version lookup。

## 3.4 是否需要新表、新 JSON、新 Schema、新 Repository

| 项目 | Phase 1A | Phase 1B | 说明 |
|---|---|---|---|
| 新 JSON | 是 | 是 | Append-only Catalog release、rubric set、reviewed attribution 与 active pointer 是新的 authored source |
| 新 Zod Schema | 是 | 是 | runtime / CLI 权威校验；JSON Schema 只是生成物 |
| 新 generated index | 是 | 继续使用 | 保持 bundled local lazy/read-only loading |
| 修改现有 Skill JSON | 否 | 否 | 15 legacy definitions 保持原样 |
| 修改 Content Pack v1 | 否 | 否 | 未来可在 pack format v2 统一纳入 checksum |
| 新 IndexedDB table | 否 | 条件性 | 只有 Evidence Ledger 持久化被门禁批准后才 additive 增加 |
| 新 Repository | 否 | 条件性 | Phase 1A 使用只读 source；Phase 1B 才可能增加 evidence repository |

## 3.5 Catalog 自动校验

未来 validator 至少检查：

1. reviewed draft Catalog 恰好包含 70 个非 deprecated Leaf；published Release 必须恰好包含 70 个 active Leaf，不能含 reviewed/draft Leaf；
2. ID 唯一且符合稳定 ID 格式；
3. L0–L6 数量为 `9 / 10 / 8 / 9 / 9 / 18 / 7`；
4. 所有 edge ID 唯一；
5. edge source/target 存在且类型合法；
6. prerequisite graph 无环；
7. 每个 active Leaf 至少一个 `rolls-up-to`；
8. canonical display parent 恰好一个；
9. draft/reviewed Catalog 可暂时没有 rubric pointer；published release 中每个 active Leaf 必须指向一个 published rubric version；
10. 所有 evidence type 合法且非空；
11. deprecated ID 不被新含义复用；
12. catalog / rubric set / attribution map checksum 均按“移除顶层 checksum → canonicalize → SHA-256”计算；
13. Release Manifest 的 Catalog/Rubric exact versions 与 checksum 全部匹配；Attribution Map 绑定的 release version/checksum 也必须匹配；
14. 15 个 legacy Skill 都有且只有一个 `presents-as` target，target 属于固定 7 节点；
15. generated index 与 authored source 无 drift。

## 3.6 实施前必须消除的 V2 文档漂移

`docs/knowledge-architecture-v2.md` 的实际清单为：

- Level 2：8 个；
- Level 3：9 个；
- Level 4：9 个；
- 总计：70 个。

但 legacy mapping 表中的自然语言写成 9 / 10 / 10。实施时必须以机器可校验 Catalog 为唯一冻结结果，并明确 legacy mapping 是显式 edge 集合，不是可执行的自然语言通配。Catalog 的 exactly-70 与 graph edge 必须先冻结，随后才能编写 Rubric；Catalog 只有在 70 个 Rubric 也通过校验后才可作为完整 release 发布。

---

# 4. Skill Rubric Design

## 4.1 Rubric Definition

每个 Leaf Skill 必须有独立、版本化 rubric：

```ts
interface SkillRubricDefinition {
  schemaVersion: 1;
  id: string;
  skillId: string;
  version: number;
  status: 'draft' | 'reviewed' | 'published' | 'deprecated';
  evidenceTypes: EvidenceOutputType[];
  criteria: RubricCriterion[];
  criticalBlockers: string[];
  thresholds: {
    learning: LearningGate;
    competent: CompetentGate;
    proficient: ProficientGate;
  };
  createdAt: string;
  reviewedAt: string | null;
  author: string;
  reviewer: string | null;
}
```

每个 criterion 必须有稳定 `criterionId`、清晰的可观察行为、评分尺度、必要 evidence output 与 critical 条件。修改已发布 rubric 时增加 version，不静默覆盖。

## 4.2 四级 Mastery Rubric

### Not Verified

满足任一条件：

- 没有可审计、可重放且通过 attribution 的 evidence；
- 只有 Foundation / Concept 阅读记录；
- 只有 legacy aggregate mastery；
- exact CaseVersion 或 approved attribution 缺失；
- evidence 无法通过 replay/integrity gate。

Legacy evidence 可以显示为“已有旧体系证据”，但不能因此授予 Leaf Skill。

### Learning

至少有一个经过评分的 eligible evidence output，但尚未满足 Competent 的质量、独立性、多样性或 critical gate。

错误 Attempt 可以成为“正在学习”的负面证据，但不能当作正向能力样本；揭晓答案的节点也只能进入 learning trace。

### Competent

全局最低门槛：

- rubric quality score 达到该 Skill 的阈值（初始建议不低于 70/100）；
- 至少 3 个独立 Case evidence family；
- 至少 2 种 primary archetype；
- 无未修复 critical blocker；
- 所有强制 prerequisite 达到 rubric 指定的最低状态；
- 证据来自至少 2 个不同约束或环境，避免模板记忆。

### Proficient

全局最低门槛：

- rubric quality score 达到该 Skill 的高级阈值（初始建议不低于 85/100）；
- 至少 5 个独立 Case evidence family；
- 至少 3 种 primary archetype；
- 至少一次 Project Evidence 或明确的跨环境迁移证据；
- 无未修复 critical blocker；
- 强制 prerequisite 至少达到 Competent。

具体 Skill 可以比全局门槛更严格，不能更宽松；阈值必须版本化并由 reviewer 审核。

## 4.3 独立样本与重复训练

当前 legacy `sampleCount` 会在重复完成同一 Case 时增加，不能直接用于 V2 rubric。

V2 独立样本使用 reviewer 定义的 `evidenceFamilyId` 去重：

```text
同一 Case 重试                    → 更新同一 evidence family 的质量，不增加独立样本
同一 Case 新 version，决策未改变  → 仍属于同一 family
新 Case，但模板/约束完全同构      → 同一 family 或不计迁移多样性
不同系统、约束、证据和行动结果    → 可成为新 independent family
```

## 4.4 Confidence 与 Mastery 分离

Mastery 表示证据达到的能力门槛；Confidence 表示证据的充分程度与可解释性。二者不能混成一个分数。

Confidence 可考虑：

- independent evidence family 数；
- archetype / environment 多样性；
- evidence recency；
- 是否为 native leaf 或 reviewed backfill；
- rubric 与 attribution reviewer 状态。

Recency 只降低 confidence，不删除历史事实。

## 4.5 明确禁止的 Mastery 输入

- Foundation 阅读完成；
- Concept 浏览时长；
- AI Mentor 文字；
- Demo Profile 数据；
- Case 总分平均拆分；
- legacy `SkillMasteryRecord` 直接复制；
- 没有 exact version 的标题或路径匹配；
- 仅由 AI 自动推断、未经 reviewer 批准的 attribution。

---

# 5. Evidence Attribution Strategy

## 5.1 当前可用的原始证据

历史叶子证据唯一可靠入口是：

```text
CompletedAttempt.roundHistory
       +
exact immutable CaseVersion
       +
approved (caseId, caseVersion, nodeId) attribution
       +
versioned rubric
       ↓
replayable Leaf Evidence
```

`SkillMasteryRecord` 与 `CaseProgressRecord` 都是不可逆聚合，不能参与 leaf backfill 分配。

## 5.2 Reviewed Attribution Map

归因 map 是内容侧、不可变、版本化 sidecar，不写入旧 Case，不改变旧 content hash。

推荐 envelope：

```ts
interface CaseLeafAttributionMap {
  schemaVersion: 1;
  mapId: string;
  mapVersion: number;
  skillGraphReleaseVersion: string;
  skillGraphReleaseChecksum: string;
  catalogVersion: string;
  rubricSetVersion: string;
  status: 'draft' | 'approved' | 'superseded' | 'revoked';
  caseClassifications: CasePortfolioClassification[];
  entries: CaseLeafAttributionEntry[];
  checksum: string;
}
```

Case-level primary archetype 也必须由 reviewer 明确保存，不能从当前多标签 `lifecycleStages` 的第一个值推断：

```ts
interface CasePortfolioClassification {
  caseId: string;
  caseVersion: number;
  caseContentHash: string;
  primaryArchetype:
    | 'build'
    | 'design'
    | 'integrate'
    | 'evaluate'
    | 'deploy'
    | 'operate'
    | 'incident'
    | 'customer';
  status: 'draft' | 'approved' | 'superseded' | 'revoked';
  rationale: string;
  reviews: AttributionReview[];
}
```

Competent / Proficient 的 archetype 多样性只能读取 approved classification；缺失 classification 时该 evidence 可以参与质量解释，但不能增加 archetype diversity count。

Classification 约束：

- natural key 是 `(caseId, caseVersion)`，同一 map version 内必须唯一；
- 每个出现 attribution entry 的 CaseVersion 必须恰好有一个 approved classification；
- approved map 不得包含 draft / revoked classification；
- 两名独立 reviewer 必须对相同 `classificationHash` 同意；
- 同一 CaseVersion 出现两个冲突的 approved archetype 时，整个 map 校验失败；
- classification supersede / revoke 必须通过新 map version，不能原地修改。

推荐 entry：

```ts
interface CaseLeafAttributionEntry {
  caseId: string;
  caseVersion: number;
  nodeId: string;
  caseSchemaVersion: number;
  caseContentHash: string;
  nodeContentHash: string;
  sourceLegacySkillIds: string[]; // 只作审计快照
  evidenceFamilyId: string;
  targets: Array<{
    leafSkillId: string;
    role: 'primary' | 'secondary';
    creditWeight: number | null;
    rubricVersion: number;
  }>;
  evidenceScope: string;
  rationale: string;
  createdAt: string;
  createdBy: string;
  reviews: AttributionReview[];
  approvedAt: string | null;
  approvedBy: string[];
}
```

规则：

- entry natural key 是 `(caseId, caseVersion, nodeId)`；
- lookup 还必须包含明确的 `mapId + mapVersion`；
- approved map 不原地修改；变更创建新 map version；
- 两名独立 reviewer 必须对同一 `targetSetHash` 同意；
- primary target 可以进入 mastery；secondary 仅用于解释和检索；
- 多个 primary 必须有 reviewer 明确给出的 credit weight，且和为 1；
- 如果只能确认 Leaf ID、无法证明权重，只能进入 evidence timeline，不能量化 mastery；
- 不允许缺省平均拆分；
- revoked map 不删除源数据，只使当前 derivation 失效并触发重建。
- map 的 `skillGraphReleaseVersion`、`skillGraphReleaseChecksum`、`catalogVersion` 与 `rubricSetVersion` 必须和 active Release Manifest 精确匹配。

## 5.3 历史 evidence replay gate

旧 Attempt 只有同时满足以下条件才能回填 Leaf Evidence：

1. `status === 'completed'`；
2. Attempt schema 受支持；
3. exact `(caseId, caseVersion)` CaseVersion 存在；
4. CaseVersion hash 与 attribution 锚定 hash 一致；
5. `roundHistory` 非空且完整覆盖访问路径；
6. submission 可由 exact node 重评；
7. stored evaluation、branch、critical、consequence 与重放一致；
8. 重算 node score、Case score 与 verdict 后和历史记录一致；
9. 拟归因 node 存在 approved attribution；
10. attribution 指向的 rubric version 存在且 published；
11. 同一 source evidence 未被另一个 native/reviewed Leaf derivation 计分；历史 legacy aggregate 可以继续存在，但不能再进入该 V2 计算。

现有 `TrustedAttempt` 类型名称不能被当作这个 gate：当前 Profile 只确认 exact CaseVersion 可读取，并没有完成上述 path/evaluation/score/verdict replay。Phase 1 必须复用现有 progression invariant，再补 scoring replay，不能只调用 Profile 的 trusted-attempt loader。

重算 node score 时还必须遵守当前真实算法：未完全答对或第三次揭晓为 0，答对才使用 authored first/second/third try score × node weight；不能直接把 `EvaluationResult.scoreRatio` 当历史 node score。

建议 source key：

```text
sourceEvidenceKey = attempt:{attemptId}:visit:{visitOrdinal}
```

不能只使用 `nodeId`，因为 Case graph 可能重复访问同一节点。

派生版本键：

```text
derivationKey =
  sourceEvidenceKey
  + mapId/mapVersion
  + scoringAlgorithmVersion
  + estimatorVersion
```

## 5.4 哪些历史证据可以复用

### 可作为正式 Leaf Evidence

- 通过完整 replay gate 的 Completed Attempt；
- exact CaseVersion 可读取；
- node 有 approved primary attribution；
- rubric 可以从历史 submission / evaluation 计算；
- source key 在 Leaf estimator 中唯一；对应历史 legacy aggregate 不被回写或扣减，也不进入 mixed average。

### 只能作为负面注释

`MistakeRecord` 只有在能匹配同一 Completed Attempt 的 exact wrong round，且 case/version/node/submission/error/critical 全部交叉验证时，才可作为该 source evidence 的风险注释。

它不能成为第二个独立样本；其旧 `skillIds` 只保留为 legacy 标签。

其 `evidenceIds` 也不能直接解释成“用户实际采用的证据”：普通节点保存的是 node evidence 集合，`evidence-conclusion` 保存的是 authored correct evidence；学习者真实选择必须从 submission 恢复。

### 必须标为 Legacy-only

- 不可逆的 `SkillMasteryRecord`；
- `CaseProgressRecord`；
- in-progress 或 abandoned Attempt；
- exact CaseVersion 缺失；
- roundHistory 为空、不完整或无法 resolved；
- replay invariant 失败；
- 重算 score / verdict 不一致；
- case/node hash 不匹配；
- attribution 缺失、superseded 或 revoked；
- 仅凭旧 `skillWeights`、Case-level skills、标题、文件路径或点号 ID 猜测；
- 只从 portable export 取得 Attempt，且无法重新取得 exact CaseVersion；
- standalone mastery/mistake 无法回溯到可信 completion transaction。

建议 reason code：

```text
missing-case-version
missing-reviewed-attribution
unsupported-attempt-schema
non-completed-attempt
incomplete-round-history
replay-invariant-failed
score-verdict-mismatch
case-content-hash-mismatch
attribution-revoked
```

## 5.5 Phase 1A shadow projection

Phase 1A 先实现纯函数 / CLI 报告：

```text
Attempt + CaseVersion + Attribution + Rubric
                 ↓
        LeafEvidenceProjection[]
                 ↓
  eligible / legacy-only / rejected reason report
```

不写 IndexedDB，不改变 Profile，不 backfill 用户数据。这样可以先观察：

- replay 通过率；
- attribution 覆盖率；
- reviewer 分歧；
- double-count 检测；
- legacy-only 原因分布；
- estimator 版本变化影响。

## 5.6 Phase 1B Evidence Ledger（条件性）

只有 shadow 结果稳定且 Practice 将开始产生正式 evidence 时，才新增 append-only store：

```text
masteryEvidence
leafMasteryEstimates
```

要求：

- IndexedDB migration 只 additive；
- 不删除、不改名旧 store 或 keyPath；
- evidence event 保存 provenance、source key、rubric/map/estimator version；
- leaf estimate 可从 ledger 重建，是派生缓存而不是源事实；
- backfill 幂等；
- 新 completion 若原子写 evidence，必须加入现有 completion transaction，不能成功后异步补写；
- 仅由旧 Case Attempt 可重放的派生 ledger 可以不进入 export v1；
- 一旦持久化无法从旧 Attempt 重建的 native Practice/Project evidence，必须先发布包含相应 Attempt/Evidence 的 export format v2 与导入校验，不能让用户先产生不可移植数据。

---

# 6. Practice Layer Design

## 6.1 为什么 Practice 必须存在

当前学习路径大体是：

```text
Foundation / Concept → 多节点真实 Case
```

对零基础用户而言，认知说明与复杂客户情境之间仍有较大跳跃。Practice 的责任是：

> 在低噪声环境中，让学习者执行一个可评分动作，并立刻暴露一个具体错误模型。

Practice 不是短 Case，也不是阅读题。

## 6.2 Practice 与 Case 的区别

| 维度 | Practice | Case |
|---|---|---|
| 目标 | 单点动作迁移 | 多约束综合决策 |
| Primary Concept | 恰好 1 个 | 通常 2–5 个 |
| Foundation | 1–3 个 | 可跨多个知识域 |
| Primary Leaf Skill | 建议恰好 1 个 | 通常 1–3 个 |
| 时长 | 3–8 分钟 | 15–45+ 分钟 |
| 动作 | 恰好 1 个 scored action | 多节点、分支与后果 |
| 情境 | 低噪声、局部 | 真实客户、生产约束与权衡 |
| 输出 | 单一可核验 artifact / decision | 决策路径、修复、验证与复盘 |
| 升级条件 | 多 primary concept、长分支或竞争目标时升级为 Case | 保持完整 Case 语义 |

## 6.3 Practice Schema Proposal

```ts
interface PracticeDefinition {
  schemaVersion: 1;
  id: string;
  version: number;
  status: 'planned' | 'draft' | 'reviewed' | 'published' | 'deprecated';
  title: string;
  summary: string;
  primaryConceptId: string;
  foundationIds: string[];       // 1–3
  primaryLeafSkillId: string;    // exactly 1
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;      // 3–8
  action: PracticeAction;
  evaluation: PracticeEvaluation;
  evidenceOutputContract: PracticeEvidenceOutputContract;
  feedback: PracticeFeedback;
  metadata: {
    createdAt: string;
    reviewedAt: string | null;
    author: string;
    reviewer: string | null;
  };
}
```

### Action

Action 至少描述：

- stable action ID；
- action kind（decision / diagnose / construct / evaluate / configure）；
- prompt；
- 输入 stimulus / scenario evidence；
- response contract；
- 用户必须产出的一个动作。

### Evaluation

Evaluation 至少描述：

- rubric ID/version；
- stable criterion IDs；
- deterministic 或 reviewed 评分方式；
- critical failure；
- correct / partial / incorrect 的可解释反馈；
- 哪些输出有资格形成 Mastery Evidence。

### Evidence Output Contract（静态内容）

`content/practices/*.json` 只声明未来输出必须满足的契约：

- artifact type；
- required fields / response schema；
- eligibility rule；
- required source-reference policy；
- critical failure policy。

它不能重复保存 Leaf Skill 或 Rubric identity，也不能包含用户 outcome、quality score、completedAt 或 estimator version。Leaf 来自 `primaryLeafSkillId`，Rubric 只来自 `evaluation.rubricRef`。

### Practice Evidence Record（运行时用户数据）

用户完成后才生成独立记录：

```ts
interface PracticeEvidenceRecord {
  sourceEvidenceKey: string;
  practiceId: string;
  practiceVersion: number;
  practiceAttemptId: string;
  actionId: string;
  leafSkillId: string;
  rubricVersion: number;
  outcome: 'incorrect' | 'partial' | 'correct';
  qualityScore: number;
  sourceEvidenceReferences: string[];
  completedAt: string;
  provenance: 'native-practice';
  estimatorVersion: string;
}
```

该记录属于 Evidence Ledger / 用户数据，不进入 authored Practice JSON、内容 checksum 或 generated index。

## 6.4 推荐未来文件边界

```text
content/practices/<concept-category>/*.json
src/domain/practices/types.ts
src/content/practice-schema.ts
src/content/practice-source.ts
src/generated/practice-index.ts
content/schemas/practice.schema.json
```

并接入：

- `scripts/files.ts` 的目录发现；
- `scripts/validate-content.ts` 的 schema / cross-reference 校验；
- `scripts/build-case-index.ts` 的 generated index 与 JSON Schema 生成；
- `content:check` 的 drift 检测。

## 6.5 Practice validator

必须检查：

- stable `(id, version)` 唯一；
- published version 不可原地覆盖；
- exactly 1 primary Concept；
- 1–3 Foundation；
- exactly 1 primary Leaf Skill；
- Concept / Foundation 引用存在，Leaf Skill 引用存在且 active；
- Foundation / Concept 当前没有 status 字段，Phase 1 以“存在于当前 generated catalog”作为可引用。不得为满足本规则直接给旧 strict schema 加 status；
- `evaluation.rubricRef.skillId === primaryLeafSkillId`，且 rubric version 是该 release 中 published、兼容的版本；
- `evidenceOutputContract.artifactType` 必须属于该 Rubric 接受的 evidence type；
- Rubric 的 `evidenceTypes` 必须是 Leaf Definition `evidenceTypes` 的非空子集；
- authored Practice 不得在其他字段重复声明 Leaf/Rubric identity；
- 3–8 分钟；
- exactly 1 scored action；
- answer / criterion / evidence reference 完整；
- critical failure 有明确反馈；
- path category 与 Concept category 一致；
- reverse Concept/Foundation → Practice 由索引生成，不手工双向维护。

“是否非同构”“错误诊断是否有价值”“是否真能迁移”属于 reviewer / quality audit，不能只靠 JSON Schema 判断。

## 6.6 Practice persistence boundary

Practice 仅用于浏览时不需要新 Repository。Practice 真正可以完成并产生 Mastery Evidence 时：

- 不能直接写入现有 `AttemptRecord`，因为它硬编码 `caseId/caseVersion/currentNode/branch graph`；
- 应新增 `PracticeAttemptRecord`，或经独立评审后设计通用 Learning Activity Attempt；
- 结果写入统一 Evidence Ledger，而不是伪装成 Case mastery；
- 在打开 native Practice persistence 前，先完成 export/import format v2、严格 schema、兼容读取与回滚测试；
- 不在 Practice 首批内容发布前抢先抽象通用 Activity Engine。

---

# 7. Capability Profile V2 Impact

## 7.1 当前 Profile 事实

`src/pages/profile/ProfilePage.tsx` 当前：

- 读取 completed Attempt、Mistake、legacy Mastery 与 active Skill definitions；
- 按 exact CaseVersion 补齐历史 Case；
- 为 deprecated / 历史 Skill 补读定义；
- 通过 `src/application/product/capability-evidence.ts` 生成 readiness、Skill Evidence Profile、Evidence Timeline 与 Completed Challenges。

当前 readiness 是 sampled active legacy mastery 的 evidence-weighted average。当前 `SkillEvidenceProfile` 只认识 legacy score / sampleCount / mistake。

Dashboard Capability Map 还在 `src/pages/dashboard/capability-map-data.ts` 固定展示 7 个 legacy Skill，因此不能把 70 个 Leaf Skill 原样塞进现有节点。

当前还存在一个需要在 V2 接入前显式处理的边界：其余 8 个 legacy Skill 虽然不显示为 Map 节点，却会影响全局 readiness 与 real/demo 判定。用户如果只有这 8 个 Skill 的证据，中心可能进入 real mode，而 7 个可见节点仍全部“待验证”。Leaf-only evidence 会放大这个问题，因此 Phase 1B 前必须冻结一张明确的 `15 legacy → 7 presentation nodes` 映射；不得由名称或 Domain 猜测。

## 7.2 V2 read model

未来新增纯 read model，而不是修改源记录：

```text
Legacy read model
  ← SkillMasteryRecord + old mistakes + legacy evidence

Leaf read model
  ← Leaf Catalog + Rubric + approved attribution
    + native/replayed Evidence Ledger

Capability Profile V2
  ← leaf-first presentation
    + legacy-only compatibility section
```

建议新纯函数边界：

```text
projectLeafEvidence(...)
assessLeafMastery(...)
rollUpLeafCapabilities(...)
buildCapabilityProfileV2(...)
```

它们不修改 Training、Scoring 或旧 Repository。

## 7.3 Profile 展示策略

### 有 reviewed Leaf Evidence

Profile 以 Leaf Skill 为主：

```text
Agent Engineering（legacy aggregate）
├── Tool Contracts       Competent · 4 evidence families
├── Memory Lifecycle     Learning · 2 evidence families
├── Agent Evaluation     Not Verified
└── Safety Authorization Competent · 3 evidence families
```

legacy aggregate 只作分组、历史兼容与总体说明，不能与 Leaf 分数混成平均值。

### 只有 legacy evidence

继续显示原 Profile，并明确标记：

- “旧体系证据”；
- “尚未完成 Leaf attribution”；
- 低可解释置信度；
- 不显示假 Leaf 分数。

### 完全无 evidence

保持真实 empty state / Demo 展示隔离。Demo 数据不能进入 Profile、Repository 或 Leaf estimator。

## 7.4 Capability Map 兼容

Capability Map 保持 7 个高层节点，不扩成 70 个节点。provider 只读取显式 `rolls-up-to` 后的聚合 read model：

- 只计 eligible Leaf Evidence；
- 一个 source evidence 在同一高层 roll-up 中只计一次；
- 多 roll-up 必须有明确聚合规则；
- leaf 无证据时回退 legacy-only 状态，不伪造 score；
- 不能把 raw legacy score 与 leaf score 直接平均。

Readiness 也应作为带依据的 read model 返回，例如 `{ value, basis: 'none' | 'legacy' | 'leaf' | 'mixed' }`。在 mixed 规则冻结前继续显示现有 legacy 数值并明确 basis，不先发明一个混合平均分。

## 7.5 双读切换门禁

Profile V2 上线前必须通过：

- shadow projection 与 UI read model 数量一致；
- source evidence 无双计；
- legacy-only records 完整可见；
- revoked/superseded attribution 能重建；
- exact historical CaseVersion 缺失时不崩溃；
- old export/import 后原 Profile 保持一致；
- 关闭 V2 read 时页面与当前版本完全一致；
- Dashboard real/demo mode 判定不受影响。
- `15 legacy → 7 presentation nodes` 映射有机器校验与专门测试。

---

# 8. Migration Strategy

## Phase A — Additive Only

新增：

- versioned Leaf Skill Catalog；
- typed graph edges；
- versioned rubrics；
- reviewed attribution sidecar；
- schema、source、validator 与 generated artifact；
- 5–10 Case attribution pilot；
- shadow replay report。

不改变：

- Legacy Skill；
- Content Pack v1；
- Case v1；
- Attempt / Progress / Mistake / Mastery；
- IndexedDB；
- Profile / Dashboard；
- Training / Scoring。

Go / No-Go：Catalog、rubric、reviewer agreement、replay、double-count 与 legacy-only gate 全部通过。

## Phase B — Dual Read

新增：

- Leaf Evidence projection；
- Leaf mastery assessment；
- 条件性 Evidence Ledger / Leaf Estimate additive store；
- Profile V2 read model；
- legacy-only compatibility presentation。

读取优先级：

```text
native leaf evidence
  else approved reviewed-backfill leaf evidence
  else legacy-only evidence
```

同一 `sourceEvidenceKey` 在 V2 read model 中只进入一个分支。旧 legacy aggregate 仍作为不可变历史事实存在，但不能与该 source 的 Leaf 结果相加、求平均或增加样本数。

旧 Mastery 继续服务旧页面；Leaf estimator 不以旧分数作为初值。

Go / No-Go：shadow 与 production read 一致，功能关闭可无损回退，用户历史记录数量与内容不变。

## Phase C — Leaf Skill Primary

仅在后续独立任务中实施：

- 新 Case / 新 CaseVersion 直接声明 Leaf attribution 与 graph/rubric version；
- 新 Practice 产生 native Leaf Evidence；
- Profile、planner 与能力门槛以 Leaf Evidence 为主；
- legacy aggregate 从 Leaf 证据投影，作为兼容视图；
- 新证据不再写成第二份 legacy sample；
- 旧 Attempt、Mastery、Mistake 与 deprecated Skill 永久可读。

这一步可能需要 Content Pack format v2，把 Skill Catalog、Rubric、Attribution 与 Practice 纳入 manifest/checksum；不能静默扩充 v1 strict schema。

## Phase D — Project Evidence

后续 Project Layer 将多个 Practice / Case / artifact 组合成 Evidence Pack。Project evidence 使用同一 Leaf rubric 与 Evidence Ledger，不另造一套 XP 或“项目完成度=能力”的算法。

## 8.1 数据迁移原则

数据迁移不是“把旧表转成新表”，而是：

```text
保留 immutable source
        ↓
使用 versioned attribution / rubric 重放
        ↓
生成可丢弃、可重建的 derived evidence / estimate
```

因此：

- source Attempt 是事实；
- reviewed attribution 是内容版本；
- rubric 是评估版本；
- Evidence Ledger 是可审计派生事件；
- Leaf estimate 是可重建 read model；
- legacy mastery 永久保留，不作为 Leaf 数据源。

## 8.2 回滚策略

- Phase A 回滚：停止加载新 Catalog，不影响任何用户数据；
- Phase B 回滚：关闭 V2 read，继续使用 legacy Profile；新增 store 保留但不读取；
- attribution 撤销：切换 active map version，重建 derived records；
- rubric 更新：保留旧 rubric version，生成新 estimator version，不覆盖旧 derivation；
- Content Pack v2 回滚：重新激活已安装的 v1 pack；历史 CaseVersion 继续可读。

---

# 9. Implementation Order

以下是后续真正实施时的严格顺序。本任务不执行这些步骤。

## Step 0 — Freeze Gate

1. 修正或明确 V2 文档的 L2/L3/L4 数量漂移；
2. 冻结 exactly 70 ID；
3. 冻结每个 Leaf 的 capability level；
4. 冻结 explicit prerequisite / roll-up edges；
5. 冻结 `15 legacy → 7 presentation nodes` 显式映射；
6. 生成 draft Catalog digest；
7. reviewer 签字后才能进入 Step 1。

输出：冻结的 Catalog 设计与变更控制规则。

## Step 1 — Leaf Skill Catalog（只新增，不替换）

未来代码变更范围：

- 新建 `src/domain/skills/types.ts`；
- 新建 `src/content/skill-catalog-schema.ts`；
- 新建 `src/content/skill-catalog-source.ts`；
- 扩展内容脚本发现、校验、schema/index 生成与 drift check；
- 新增首个 append-only `content/skill-graph/v2/releases/<releaseVersion>/catalog.json`；Step 1 不更新 `active.json` pointer；
- 保持 `content/skills/*.json` 原样。

Step 1 交付的是 exactly-70、ID/edge 已冻结的 reviewed draft Catalog；Leaf 的 `activeRubricVersion` 可以暂时为 `null`，不能在 Step 2 之前标记为 published release。

测试：

- exactly 70；
- ID / edge uniqueness；
- missing edge target；
- invalid roll-up target；
- prerequisite 方向与 cycle；
- 15→7 presentation mapping 缺失/重复/非法 target；
- deprecated ID reuse；
- generated artifact drift。

## Step 2 — Skill Rubric

1. 定义 versioned rubric contract；
2. 为 70 个 Leaf Skill 写出可观察 criteria；
3. 设置 evidence types、critical blockers 与全局最低门槛；
4. 建立 rubric reviewer checklist；
5. release validator 要求每个 active Leaf 有且只有一个 published rubric version。

Rubric 全部 reviewed 后，把 70 个 Leaf 从 reviewed 转为 active，回填 Catalog 的 `activeRubricVersion`，在同一 append-only release 目录生成 `rubrics.json` 与 `release.json`，并以 exact version/checksum 作为一个原子 release 校验。此时 Catalog 才允许发布并更新 `active.json`；published 目录不得原地覆盖。

测试：

- missing rubric；
- duplicate active version；
- dangling criterion；
- thresholds 逆序；
- published rubric silent overwrite；
- reading completion 被拒绝为 evidence。

## Step 3 — Evidence Attribution Pilot

1. 选 5–10 个结构差异明显的现有 Case；
2. 两位 reviewer 独立标注 `(caseId, caseVersion, nodeId)`；
3. 同时审核 Case-level primary archetype，禁止从 `lifecycleStages` 首标签推断；
4. 对 primary target、weight、family、critical blocker 做一致性审核；
5. 实现 strict replay 与 shadow report；
6. 不写数据库，不改 Profile。

历史 Case 必须通过当前 installed CaseVersion / content repository 或 `src/generated/content-index.ts` 读取；不能把当前为空且不属于默认 artifact 输出的 `src/generated/case-index.ts` 当作运行时权威。

试点样本必须覆盖：

- 多节点 Case；
- critical error；
- evidence-conclusion；
- retry / revealed answer；
- archived version；
- 一个无法安全回填、应为 legacy-only 的负样本。

## Step 4 — Practice Schema

1. 定义 `PracticeDefinition`、Action、Evaluation 与 Evidence Output；
2. 建立独立 loader / generated index；
3. 加入 Concept、Foundation、Leaf Skill cross-reference；
4. 生成反向关系索引；
5. 此时只建立内容能力，不先做通用 Training Engine。

## Step 5 — 第一批 Practice

1. 从 P0 阻断 Concept 选择少量试点；
2. 每个 Practice 恰好一个 primary Concept / Leaf Skill / scored action；
3. 先验证 Foundation → Concept → Practice → Case 的认知桥接；
4. 通过 reviewer quality gate 后再决定是否增加 PracticeAttempt persistence。

## Step 6 — Capability Profile Dual Read

1. 新增 Leaf Evidence projection read model；
2. 先 shadow，后内部 feature gate；
3. 保留 Profile 当前六区信息架构；
4. 以 Leaf 为主、legacy-only 为兼容；
5. Capability Map 继续使用 7 个聚合节点，不直接渲染 70 个 Leaf；
6. 验证关闭 V2 read 后完全回退当前行为。

## Step 7 — 扩充 Foundation / Concept / Case

只有前六步通过后才补内容：

- Foundation 只补会阻断 Practice / Case 的 P0 原语；
- Concept 必须有 decision question 与 Practice 消费者；
- 新 Case / CaseVersion 必须产生明确 Leaf Evidence；
- 不以条目数量代替能力覆盖。

## 每一步的验证命令

具体实施阶段，在预计不超过安全时限时运行：

```bash
npm run content:validate
npm run content:quality
npm run content:check
npm run test:run
npm run typecheck
npm run lint
npm run build
```

若完整测试或构建可能超过 2 分钟，应先运行针对性测试，再由用户手动运行完整命令；本设计任务不执行这些命令。

---

# 10. Risks

## Risk 1 — Skill Explosion

**问题：** Leaf 数量继续扩张，能力图变成术语清单。

**控制：**

- Phase 1 冻结 exactly 70；
- 新 Leaf 必须证明独立 rubric、独立错误模式与独立 evidence；
- 只能通过 catalog version 评审增加；
- UI 仍以 7/15 个高层聚合展示，70 个用于诊断与证明。

## Risk 2 — 历史数据污染

**问题：** 把 legacy score 平均拆分后制造虚假精度。

**控制：**

- 不迁移旧 mastery；
- exact version + replay + approved map；
- 无法证明的记录明确 legacy-only；
- source key 去重；
- derived data 可重建。

## Risk 3 — AI 生成内容泛滥

**问题：** 批量生成 Leaf、Rubric、Practice 或 Case，但没有可验证决策。

**控制：**

- rubric 先于内容；
- 双 reviewer；
- Evidence Gate；
- 一个 Practice 只能一个动作；
- 不能进入 Practice / Case / Evidence 的知识不发布。

## Risk 4 — 知识百科化

**问题：** 用 Foundation/Concept 数量代替能力成长。

**控制：**

```text
Knowledge → Decision → Practice/Case → Evidence → Leaf Skill → Project
```

缺任何一段的内容不能进入正式能力路线。

## Risk 5 — Legacy / Leaf 双计

**问题：** 同一 Attempt 同时提高 legacy 与 leaf readiness。

**控制：**

- source-level exclusive selection 只约束 V2 estimator / mixed readiness，不要求回写或扣减不可逆 legacy mastery；
- `sourceEvidenceKey` 唯一；
- native > reviewed backfill > legacy-only；
- roll-up 时按 source 去重，不按 edge 数累加。

## Risk 6 — Attribution 审核漂移

**问题：** reviewer 对同一 node 归因不同，或新版 map 静默改变历史。

**控制：**

- 两人独立审核；
- target set hash；
- approved map immutable；
- supersede / revoke 有审计记录；
- Profile 显示使用的 graph/rubric/map version。

## Risk 7 — Content Pack 完整性分裂

**问题：** Phase 1 sidecar 长期游离于 manifest/checksum，导致导入内容与能力解释不一致。

**控制：**

- Phase 1A 只允许 bundled local pilot；
- catalog 自有 checksum 与 generated drift check；
- 进入外部导入或 leaf-primary 前必须设计 Content Pack format v2；
- 不静默扩充 v1。

## Risk 8 — Profile 信息爆炸

**问题：** 70 个 Leaf 直接铺满页面，降低可理解性。

**控制：**

- 高层按 legacy/domain 聚合；
- Leaf 按需展开；
- 默认突出 evidence-backed strengths / risks；
- Not Verified 与 legacy-only 分开；
- Capability Map 保持 7 个品牌节点。

## Risk 9 — Evidence Ledger 成为第二真相

**问题：** 派生 store 与源 Attempt 不一致。

**控制：**

- Attempt + CaseVersion 仍是 source；
- ledger 保存 provenance 与 derivation version；
- estimate 可删除重建；
- replay mismatch 必须降级 legacy-only，而不是自动修复源数据。

## Risk 10 — Practice 被做成另一套 Case Engine

**问题：** 为复用代码加入多节点、分支和完整故事，重新制造认知跳跃。

**控制：**

- exactly one scored action；
- exactly one primary Concept / Leaf Skill；
- 3–8 分钟；
- 超过边界即升级为 Case；
- Practice persistence 在内容质量验证后再做。

---

# Final Answers

## 1. 下一步代码应该改什么？

第一个真正实施任务只应新增独立的 Leaf Skill Catalog 能力：

1. `src/domain/skills/types.ts`；
2. `src/content/skill-catalog-schema.ts`；
3. `src/content/skill-catalog-source.ts`；
4. 内容脚本对 Catalog 的发现、校验、index/schema 生成与 drift check；
5. 首个 reviewed-draft `content/skill-graph/v2/releases/<releaseVersion>/catalog.json`；Rubric 完成前不更新 `active.json`。

它不得修改现有 15 个 Skill、Profile、Training、Mastery、Attempt、Case Schema、Content Pack 或 IndexedDB。Catalog exactly-70 门禁通过后，才进入 Rubric 与 Attribution。

## 2. 什么不能改？

不能改写稳定 ID、已发布 CaseVersion、历史 Attempt、历史 Mastery、Mistake、Progress、旧 export format、当前 Scoring 语义和 Content Pack v1。不能把 70 个 Leaf 直接加入旧 active Skill 列表，也不能把阅读完成或 AI 解释当作能力证据。

## 3. 数据如何迁移？

不做破坏性表迁移。保留旧事实，通过 exact CaseVersion、roundHistory、approved attribution 与 versioned rubric 生成派生 Leaf Evidence。不能安全重放的记录标为 legacy-only。若后续需要持久化，只新增 append-only Evidence Ledger / Leaf Estimate store，源 Attempt 与旧 Mastery 永不重写。

## 4. 如何保证历史用户不受影响？

- Phase 1A 不读写用户数据库、不改 UI；
- 旧 Profile 与 Dashboard 继续读 legacy mastery；
- dual-read 可以关闭并完整回退；
- 无 Leaf 归因的历史证据仍保留、可见；
- deprecated Case/Skill 定义继续用于历史标签；
- 同一证据只选一个正式来源，避免 readiness 突然膨胀；
- 新 store 只 additive，旧 export/import 保持有效。

## 5. 如何逐步演进到 AI Engineer Capability OS？

```text
冻结 70 Leaf Skill
        ↓
冻结 Rubric 与 Evidence Gate
        ↓
人工审核旧 Case Attribution
        ↓
建立 Practice bridge
        ↓
Profile 双读并展示可审计 Leaf Evidence
        ↓
新 Practice / Case 原生产生 Leaf Evidence
        ↓
Project Evidence Pack 证明跨能力交付
        ↓
Mentor 只基于真实缺口推荐下一步
```

这条路线保护现有 100 Foundation、50 active Case、历史 Attempt 与 legacy Mastery，同时把产品从“宏观训练分数”逐步推进到“可解释、可复核、可迁移的 Production AI Engineer 能力档案”。

---

## 本任务变更声明

本任务只新增本实施设计文档：

`docs/knowledge-architecture-v2-phase1-plan.md`

没有修改代码、Schema、Foundation、Concept、Case、Skill、Content Pack、Manifest、数据库、Mastery 或 Attempt；没有运行生成器、测试、构建、服务或 git 提交。
