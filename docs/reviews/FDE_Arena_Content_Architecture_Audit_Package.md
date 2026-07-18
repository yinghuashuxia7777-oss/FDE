# FDE Arena 内容架构一键审核包

> 文档日期：2026-07-13
> 项目：FDE Arena
> 当前分支：`codex/fde-arena-mvp`
> 审核目标：判断是否应继续采用“构建时生成 Manifest + 运行时 ContentSource”的最小增量方案。
> 重要限制：不得建议重新初始化项目、推翻现有功能或删除用户历史数据。

## 使用方法

将本文件直接上传给 ChatGPT，然后只需要发送下面一句话：

> 请作为资深前端架构师、内容平台架构师和数据兼容性审计员，严格按照审核包末尾的输出格式进行独立审核，判断 FDE Arena 是否应继续采用推荐方案。不要直接写代码。

---

## 一、给审核者的角色与任务

你正在审核一个已经开发到中期的本地优先 Web 项目。你的任务不是重新设计整个产品，而是判断下面的推荐方案能否以最小必要改动满足“题库、知识领域和技能可以长期增量更新”的强制要求。

请重点检查：

1. 推荐方案是否真正实现程序与题库分离。
2. 新增题目、领域和技能是否只需要修改内容文件。
3. 稳定 ID、内容版本和 Schema 迁移策略是否足以保护历史记录。
4. Manifest、自动索引和校验流程是否存在双重真相或漂移风险。
5. ContentSource 抽象是否足够支持本地文件、URL、数据库或后台服务，而没有过度设计。
6. deprecated、旧版本和新内容包的行为是否一致。
7. 内容包导入是否会损坏或覆盖用户的 attempts、progress、mastery、mistakes、settings。
8. 测试是否能证明要求，而不是只验证实现细节。
9. 是否存在会迫使团队未来重新开发页面、评分引擎或错题本的耦合。
10. 当前方案是否属于“最小必要重构”，还是仍有可以删除的复杂度。

不要因为项目尚无正式案件 JSON 就忽略架构缺口；也不要因为未来可能上云就要求现在实现服务器、账号系统、同步协议或远程 API。

---

## 二、项目现状

### 2.1 技术栈

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- IndexedDB，通过 `idb` 访问
- Zod 4 内容与导入数据校验
- Vitest、Testing Library
- 完全本地优先，固定用户 `local-user`
- 当前没有后端、账号系统或云同步

### 2.2 已完成且不得推翻的能力

- 12 类通用题型渲染器。
- 通用节点评分、分支选择、后果反馈和三次作答规则。
- 案件图可达性、合法终点和闭环校验。
- IndexedDB 案件版本、答题、进度、技能、错题和设置仓储。
- 以 `caseId + caseVersion` 精确读取历史案件。
- 同一案件不同版本可以同时存储。
- 同一 `caseId + version` 若内容不同，会拒绝静默覆盖。
- Dashboard、Cases、Training、Debrief、Mistakes、Skills、Profile 正在按既定计划集成。
- 用户数据导入导出只包含用户拥有的数据，不包含内置题库正文。

### 2.3 当前工作区说明

当前已提交基线为：

```text
a024c84a feat: add product data foundation
```

工作区还有正在收尾的产品页 Slice B 文件，属于此前已批准的开发任务。内容架构重构不得重置、覆盖或删除这些未提交文件。

### 2.4 当前内容目录

```text
content/
├── cases/
│   └── .gitkeep
└── schemas/
    └── fde-case.schema.json
```

当前尚无正式案件 JSON，生成的 `src/generated/case-index.ts` 是空索引。

---

## 三、强制架构要求

以下要求均为绑定要求，不是建议。

### R1 程序与题库彻底分离

- 页面、题型引擎、评分、错题本、能力统计属于程序代码。
- 正式知识内容、题目、答案、解析必须位于独立 `content/` 目录。
- TSX 页面不得硬编码正式题目、正确答案或解析。

### R2 题库支持增量更新

新增题目只应需要：新增案件 JSON、更新技能与覆盖矩阵、运行校验脚本、构建或发布新内容版本。不得修改答题页面、评分引擎或错题本。

### R3 永久稳定 ID

- Case、Node、Option、Evidence、Domain、Skill 都必须使用稳定 ID。
- 标题、文本或目录变化不得改变已发布 ID。
- 用户历史不得依赖数组下标、标题或文件路径。

### R4 内容版本管理

每个案件必须包含：

- `version`
- `status`
- `createdAt`
- `reviewedAt`
- `applicableVersions`
- `author`
- `reviewer`

状态必须支持：`planned`、`draft`、`reviewed`、`published`、`deprecated`。修改已发布案件必须增加 version，不得静默覆盖原版本。

### R5 Schema 版本和迁移

- Manifest 和每个案件都必须包含 `schemaVersion`。
- 加载器必须按 `schemaVersion` 解析。
- 未来升级通过纯迁移函数逐级兼容，不能要求批量手工改写旧题。
- 建立 `src/content/migrations/migrate-v1-to-v2.ts` 与 `src/content/migrations/index.ts`。
- 当前不得虚构未知 v2 的字段或转换规则。

### R6 Manifest

生成 `content/manifests/content-manifest.json`，至少包含：

- `contentVersion`
- `schemaVersion`
- `generatedAt`
- `caseCount`
- `caseIds`
- `domains`
- `checksum` 或内容摘要

应用启动必须通过 Manifest 加载题库，不能依赖人工维护的 import 列表。

### R7 自动索引

脚本必须自动扫描 `content/cases/**`。新增案件不能要求修改多个入口文件。应提供：

- `npm run content:index`
- `npm run content:validate`
- `npm run coverage:audit`

### R8 内容校验

必须检查：

- 重复或缺失的稳定 ID
- 正确答案引用
- 选项解析完整性
- 分支可达性
- 死循环
- 合法终点
- 技能和领域引用
- `version` 与 `schemaVersion`
- deprecated 不进入默认题库
- 覆盖矩阵同步
- Manifest 与内容文件一致

### R9 用户进度前向兼容

- 新增题目不能删除旧历史。
- 已完成案件仍可识别。
- 新案件自动表现为未开始。
- deprecated 案件不在默认库显示，但历史记录仍保留。
- 新版本不得覆盖旧版本答题记录。
- 新 Attempt 保存 `caseId`、`caseVersion`、`schemaVersion`、`completedAt` 和 `score`。

### R10 Content Pack 与 ContentSource

内容包至少包括 Manifest、Cases、Skills、Domains、Coverage。第一版读取本地包，但接口必须允许未来替换来源。

```ts
interface ContentSource {
  loadManifest(): Promise<ContentManifest>;
  loadCases(): Promise<FdeCase[]>;
  loadSkills(): Promise<SkillDefinition[]>;
  loadDomains(): Promise<DomainDefinition[]>;
}
```

### R11 更新边界

- 新题和新领域只更新内容。
- 只有新增题型才修改题型引擎和 UI，并保持旧题型兼容。
- Schema 升级只走迁移函数。
- 云端题库只替换 ContentSource 或 Repository，不重写页面。

### R12 设置页题库信息

设置页显示题库版本、Schema、题目总数、最近更新时间、各领域题数、内容来源、内容包导入以及导出或内容状态。MVP 必须至少支持只读信息和本地导入。

### R13 必须证明的测试

1. 新增案件 JSON 后，无需修改页面代码即可显示。
2. 新增题目后旧进度仍存在。
3. deprecated 默认隐藏，但历史仍存在。
4. 旧 `schemaVersion` 内容可以加载。
5. Manifest 与实际题目数量一致。
6. 重复 ID 导致校验失败。
7. 新增领域后能力地图自动显示。

---

## 四、当前实现审查结果

| 要求 | 当前状态 | 关键事实 |
|---|---|---|
| R1 程序/题库分离 | 部分满足 | 页面结构没有正式题目正文，但 `content/` 目前只有 Schema，没有完整内容目录和正式案件。 |
| R2 增量 JSON | 部分满足 | 已能递归扫描 JSON 并生成索引；构建只执行 `content:index --dry-run`，不会检测已提交索引漂移。 |
| R3 稳定 ID | 部分满足 | Case/Node/Option/Evidence 有 ID 和重复检查；缺少 ID 格式、跨版本稳定性和 Skill/Domain 注册表校验。 |
| R4 元数据/status | 基本满足 | 已有五种状态与案件 metadata；需明确未审阅状态下 `reviewedAt/reviewer` 的存在形式。 |
| R5 Schema/迁移 | 不满足 | 案件没有顶层 `schemaVersion`；IndexedDB 数据库迁移不能替代内容 Schema 迁移。 |
| R6 Manifest | 不满足 | 当前没有 Manifest；运行时直接依赖生成的 `caseIndex`。 |
| R7 自动索引 | 基本满足 | 已有扫描和生成器；需增加 `coverage:audit` 别名及生成物漂移检查。 |
| R8 校验 | 部分满足 | 已覆盖 JSON、答案引用、图、终点、闭环、重复 ID 和部分覆盖率；缺 Manifest、注册表、跨版本和矩阵同步检查。 |
| R9 进度兼容 | 部分满足 | 案件版本和历史记录只增不删；Attempt 缺 `schemaVersion`，旧 IndexedDB 中曾发布案件可能不会被新 deprecated 状态隐藏。 |
| R10 ContentSource | 不满足 | 当前启动逻辑直接遍历 `caseIndex` 并 seed，没有内容来源端口。 |
| R11 更新边界 | 部分满足 | 新案件不依赖页面；新增领域仍需修改硬编码 `FDE_DOMAINS`。 |
| R12 设置页 | 不满足 | `/settings` 仍是占位页，没有内容信息或内容包导入。 |
| R13 测试 | 部分满足 | 重复 ID 已证明；其余六项只有部分或没有端到端证明。 |

### 4.1 已确认可复用的代码

- `scripts/files.ts`：递归发现内容 JSON，并稳定排序。
- `scripts/validate-content.ts`：Zod 校验和跨文件 Case ID/slug 检查。
- `scripts/validate-graph.ts`：可达性、终点、闭环和可执行分支检查。
- `scripts/detect-duplicate-ids.ts`：Case/Node/Option/Evidence 重复检查。
- `scripts/audit-coverage.ts`：领域、等级、状态和跨领域覆盖统计。
- `scripts/build-case-index.ts`：生成懒加载索引。
- `src/storage/seed.ts`：只增不删地保存案件版本，并拒绝同版本静默覆盖。
- `src/repositories/indexeddb/case-repository.ts`：精确读取案件历史版本。
- `src/application/product/runtime.tsx`：当前仓储启动入口，可改为依赖 ContentSource。

### 4.2 已确认的主要缺口

1. `src/application/product/catalog.ts` 中硬编码 14 个 `FDE_DOMAINS`。
2. `src/domain/cases/types.ts` 与 `src/schemas/case.schema.ts` 没有 `schemaVersion`。
3. 没有 `ContentManifest`、`ContentPack`、`ContentSource` 或 `LocalContentSource`。
4. 没有 Domain/Skill/Coverage 的独立内容定义。
5. `content:index --dry-run` 不会阻止索引与内容漂移。
6. 生成索引只包含 published，导致 deprecated 状态可能无法同步到已有 IndexedDB。
7. Attempt 没有内容 Schema 版本。
8. 设置页未实现。

---

## 五、待审核的推荐方案

### 5.1 方案选择

推荐采用：**构建时生成 Manifest 与加载映射，运行时通过 ContentSource 加载，并通过现有 IndexedDB 保存所有历史案件版本。**

未采用方案：

- 直接在页面或运行时到处使用 `import.meta.glob`：代码少，但把内容来源绑定到 Vite，不利于文件包或远端来源。
- 立即实现 ZIP 插件市场、云端同步或内容服务：超出 MVP，增加不必要依赖和状态复杂度。

### 5.2 推荐目录

```text
content/
├── cases/
│   ├── beginner/
│   ├── intermediate/
│   └── advanced/
├── domains/
├── skills/
├── case-families/
├── coverage/
│   └── coverage-matrix.json
├── manifests/
│   ├── content-config.json
│   └── content-manifest.json        # 自动生成
└── schemas/
    ├── fde-case.schema.json
    ├── content-manifest.schema.json
    ├── domain.schema.json
    ├── skill.schema.json
    └── coverage.schema.json

src/content/
├── contracts.ts
├── schemas.ts
├── parse-content.ts
├── local-content-source.ts
├── content-pack-source.ts
├── installer.ts
└── migrations/
    ├── migrate-v1-to-v2.ts
    └── index.ts

src/generated/
└── content-index.ts                # 自动生成，不手改
```

正式题目、正确答案、反馈、解析、领域说明和技能说明只能位于 `content/`。`src/tests/fixtures/` 中允许保留用于单元测试的最小合成数据，但不得作为正式题库来源。

### 5.3 稳定 ID 与版本规则

1. 现有 `FdeCase.id` 就是规范中的 `caseId`，不再增加重复字段。
2. 一个案件版本的唯一键为 `(caseId, metadata.version)`。
3. 同一个 caseId 可以在内容包中出现多个版本。
4. 不同 caseId 之间，Node/Option/Evidence ID 必须全局唯一。
5. 同一案件的不同版本可以复用原有 Node/Option/Evidence ID，代表同一逻辑实体。
6. 已发布实体只改文本时必须保留 ID；新增实体分配新 ID；不得复用已删除 ID 表示另一含义。
7. Skill 与 Domain ID 由独立定义文件注册，案件只能引用已注册 ID。
8. 标题、文件名和目录都不是用户历史关联键。
9. 同一 `(caseId, version)` 内容不同即校验失败或安装失败，不能覆盖。

建议 ID 格式：

```text
case:     rag-permission-leak-001
node:     rag-permission-leak-001-node-03
option:   rag-permission-leak-001-node-03-option-b
evidence: rag-permission-leak-001-node-03-evidence-log-a
skill:    rag.metadata-filter
domain:   rag-search
```

### 5.4 案件 Schema 策略

- 当前内容 Schema 版本定义为 `1`。
- 每个案件顶层增加 `schemaVersion: 1`。
- `metadata.version` 继续表示案件内容版本，不能与 `schemaVersion` 混用。
- 解析顺序固定为：读取版本 → 拒绝未来未知版本 → 逐级迁移 → 当前 Zod Schema 校验 → 语义/图校验。
- `src/content/migrations/index.ts` 提供迁移注册表和逐级执行器。
- `migrate-v1-to-v2.ts` 在 MVP 中只保留类型安全的未注册占位，不伪造 v2 字段或转换。
- v1 内容直接加载；只有未来 `CURRENT_SCHEMA_VERSION` 变为 2 后，才实现并注册 v1→v2。

待审核的元数据决定：

- `createdAt`、`applicableVersions`、`author` 必须始终存在。
- `reviewedAt` 和 `reviewer` 字段也必须始终存在；对 `planned/draft` 使用 `null`，对 `reviewed/published/deprecated` 要求合法值。这样满足“字段存在”，同时不伪造尚未发生的审阅。

### 5.5 Manifest

建议结构：

```json
{
  "contentVersion": "1.0.0",
  "schemaVersion": 1,
  "generatedAt": "2026-07-13T00:00:00.000Z",
  "caseCount": 2,
  "caseIds": [
    "rag-permission-leak-001",
    "agent-tool-loop-001"
  ],
  "domains": ["rag-search", "agents-evals"],
  "domainCaseCounts": {
    "rag-search": 1,
    "agents-evals": 1
  },
  "cases": [
    {
      "id": "rag-permission-leak-001",
      "version": 1,
      "schemaVersion": 1,
      "status": "published",
      "path": "content/cases/beginner/rag-permission-leak-001.v1.json"
    }
  ],
  "checksum": "sha256:<64-lowercase-hex>"
}
```

约束：

- `contentVersion` 从 `content-config.json` 读取，由内容发布者显式增加。
- `caseCount` 表示 Manifest 内案件版本条目数，还是逻辑 caseId 数量，必须固定。推荐使用“默认可用逻辑案件数”，另增 `caseVersionCount` 表示所有版本数，避免歧义。
- `checksum` 对规范化后的 cases、domains、skills、coverage 和 content-config 计算，排除 Manifest 自身的 `generatedAt` 与 `checksum`，避免递归。
- `content:index` 是唯一生成入口，同时生成 Manifest 与 `src/generated/content-index.ts`。
- `content:check` 必须比较当前生成结果与已提交 Manifest/索引，发现漂移就失败；生产 build 不应静默写文件。
- 生成的 loader map 可以存在，但必须完全由 Manifest/扫描脚本生成，禁止手写维护。

### 5.6 ContentSource

```ts
interface ContentSource {
  readonly sourceKind: 'bundled' | 'file' | 'url' | 'database';
  loadManifest(): Promise<ContentManifest>;
  loadCases(): Promise<FdeCase[]>;
  loadSkills(): Promise<SkillDefinition[]>;
  loadDomains(): Promise<DomainDefinition[]>;
  loadCoverage(): Promise<CoverageMatrix>;
}
```

MVP 实现：

- `LocalContentSource`：读取自动生成的 Manifest、loader map、Domain、Skill 和 Coverage。
- `ContentPackSource`：读取用户在设置页选择的单个 JSON 文件。

未来 URL 或数据库实现只需满足同一接口。页面、题型引擎、评分和错题本不直接读取文件，也不依赖具体 ContentSource。

### 5.7 Content Pack

第一版使用单个 JSON 包，不引入 ZIP 依赖：

```json
{
  "formatVersion": 1,
  "manifest": {},
  "cases": [],
  "skills": [],
  "domains": [],
  "coverage": {}
}
```

导入顺序：

1. 在读取全文前检查文件大小，建议上限 10 MiB。
2. JSON 解析。
3. 内容包 envelope 校验。
4. Manifest checksum 校验。
5. 案件 Schema 识别和迁移。
6. 稳定 ID、引用、图和覆盖矩阵校验。
7. 向用户显示预览：来源、版本、案件数、领域数、将新增的案件版本和警告。
8. 用户确认后原子安装。
9. 安装失败时保持原内容目录状态和全部用户数据不变。

### 5.8 IndexedDB 与用户数据兼容

现有 `caseVersions` 保持只增不删。

新增一个“当前活动内容目录”记录，至少保存：

- 当前 Manifest
- ContentSource 类型
- 活动的 `(caseId, version, status)` 集合
- Domain 和 Skill 定义
- Coverage 状态

安装内容包时：

- 添加尚不存在的案件版本。
- 同一 `(caseId, version)` 内容完全相同则幂等跳过。
- 同一 `(caseId, version)` 内容不同则整体拒绝。
- 更新活动内容目录。
- 不删除历史 `caseVersions`。
- 不修改 attempts、progress、mastery、mistakes 或 settings。

列表行为：

- Cases 默认只显示活动目录中的最新 published 版本。
- deprecated、draft、planned、reviewed 不进入默认案件库。
- `getVersion(caseId, version)` 仍可读取非活动旧版本，供 Debrief 和 Mistakes 使用。
- Manifest 删除或 deprecated 一个案件时，旧进度和旧案件内容仍保留。
- Manifest 新增案件时，因为没有 progress 记录，页面自然显示为未开始。

Attempt：

- 新记录增加 `schemaVersion`，取自作答时案件。
- 既有缺少该字段的本地记录和 v1 用户导入包按 `schemaVersion: 1` 解释。
- 不通过标题、slug、路径或数组下标回查历史内容。

### 5.9 Domain、Skill 与能力地图

删除程序中的 `FDE_DOMAINS` 内容常量，改由内容目录提供：

```ts
interface DomainDefinition {
  schemaVersion: 1;
  id: string;
  label: string;
  description: string;
  status: 'active' | 'deprecated';
}

interface SkillDefinition {
  schemaVersion: 1;
  id: string;
  domainId: string;
  label: string;
  description: string;
  status: 'active' | 'deprecated';
}
```

能力页面遍历当前活动 DomainDefinition；每个领域的技能通过 `domainId` 关联。新增领域和技能只新增 JSON 并更新 coverage，不改 TSX 或统计逻辑。

保留既有能力分数算法，只改变它接收的领域定义来源，不重写 mastery 数据。

### 5.10 设置页

MVP 设置页新增：

- 当前题库版本
- Schema 版本
- 默认可用案件数与历史版本数
- 最近更新时间
- 各领域题数
- 内容来源：Bundled 或 Imported file
- Manifest checksum/status
- 本地导入 Content Pack
- 导入前预览和确认
- 明确提示“导入不会删除作答历史”

内容包导出可延后；MVP 显示内容状态即可。用户进度导入导出属于另一个现有功能，必须与内容包导入分开，避免误把题库正文放入用户数据导出。

---

## 六、内容更新标准流程

### 6.1 只新增或修改案件

```text
1. 在 content/cases/<level>/ 新增一个 <caseId>.v<version>.json。
2. 若是修改已发布案件，保留旧文件并增加 metadata.version。
3. 更新 content/coverage/coverage-matrix.json。
4. 运行 npm run content:validate。
5. 运行 npm run coverage:audit。
6. 运行 npm run content:index，生成 Manifest 和 loader map。
7. 运行 npm run content:check。
8. 运行 npm test -- --run 和 npm run build。
9. 发布新的 contentVersion。
```

不修改页面、评分、题型渲染器、错题本或能力统计算法。

### 6.2 新增知识领域

```text
1. 新增 DomainDefinition JSON。
2. 新增对应 SkillDefinition JSON。
3. 新增或更新案件 JSON。
4. 更新 coverage matrix。
5. 运行同一套校验、索引和构建命令。
```

不修改能力地图 TSX。

### 6.3 新增题型

只有这种更新允许修改：

- CaseNode union 与 Schema
- 新题型 evaluator/scorer
- 新题型 renderer
- 对应兼容测试

原有题型和旧 Schema 内容必须继续加载。

### 6.4 Schema 升级

```text
1. 定义新 Schema 版本。
2. 实现 migrate-vN-to-vN+1 纯函数。
3. 注册迁移函数。
4. 增加旧 fixture → 当前模型的迁移测试。
5. 保留旧 JSON；不得要求一次性手工重写全部旧题。
```

### 6.5 未来云端题库

实现新的 ContentSource 或 Repository；核心页面继续消费同一领域模型和仓储接口。

---

## 七、计划中的最小实施范围

### 阶段 A：内容契约与迁移入口

- 增加 `schemaVersion`。
- Domain、Skill、Coverage、Manifest、ContentPack 类型与 Zod Schema。
- 迁移注册表和 v1 直接加载测试。
- 更新现有最小测试 fixture，不改题型含义。

### 阶段 B：Manifest、索引和校验扩展

- 扩展现有脚本，不另建重复校验框架。
- 支持多版本 Case ID。
- 校验 Skill/Domain、Coverage、Manifest、checksum 和生成物漂移。
- 增加 `coverage:audit` 脚本别名。

### 阶段 C：ContentSource 与原子安装

- LocalContentSource。
- JSON ContentPackSource。
- 活动内容目录与历史 caseVersions 分离。
- deprecated 同步和用户数据不变测试。

### 阶段 D：能力地图和设置页

- 能力地图使用 DomainDefinition。
- 设置页只读 Manifest 信息、本地导入、预览和确认。
- 不重写现有评分或 mastery 算法。

### 阶段 E：七项验收测试与全量验证

- 增加后文测试。
- 运行内容校验、全量测试、类型检查、Lint、格式检查和生产构建。

明确不在本次范围：

- 后端服务
- 登录和账号
- 云同步
- URL 内容下载实现
- ZIP 压缩格式
- 自动内容签名或公钥体系
- 内容编辑器 CMS
- 未知 v2 Schema 设计

---

## 八、必须新增的证明测试

### T1 新增案件无需改页面

给临时内容目录增加一个 published 案件 JSON，运行生成器和 LocalContentSource，然后通过真实 CaseRepository 渲染 Cases 页面。断言新案件可见，且页面源码或路由未改。

### T2 新题不删除旧进度

先安装 Pack A、完成案件 A，再安装包含 A+B 的 Pack B。断言 A 的 attempt/progress/mistake/mastery 保持，B 存在且没有进度。

### T3 deprecated 隐藏但历史保留

先完成 published A v1，再安装把 A v2 标为 deprecated 的 Pack。断言默认 Cases 不显示 A，但旧 attempt、progress 和 `getVersion(A, 1)` 仍存在，Debrief 可精确加载 v1。

### T4 旧 Schema 可加载

用 schemaVersion 1 fixture 通过统一解析入口加载。未来新增 v2 后，该测试改为真实 v1→v2 迁移；当前不得假造 v2 字段。

### T5 Manifest 数量与摘要一致

扫描实际内容目录，断言 Manifest 的 caseCount、caseVersionCount、caseIds、domains 和 checksum 与实际规范化内容一致；任意漏文件或多条目都失败。

### T6 重复 ID 失败

覆盖：重复 `(caseId, version)`、不同案件复用 Node/Option/Evidence ID、重复 Skill/Domain ID。允许同一案件跨版本保留同一逻辑实体 ID。

### T7 新领域自动显示

在测试内容包加入新 Domain、Skill 和 Case，不修改 `SkillsPage.tsx`。安装后断言能力地图出现新领域，当前无 mastery 时显示 N/A。

### 额外安全测试

- 同版本不同内容整体拒绝。
- checksum 错误不安装。
- 文件超过大小上限时不调用 `.text()`。
- 导入中途失败时活动 Manifest 与用户数据不变。
- 未知未来 schemaVersion 给出明确错误。
- deprecated 不进入默认推荐列表。
- Manifest 不包含手工不存在的 loader。

---

## 九、已知风险与需要审核者重点裁决的事项

### 风险 1：Manifest 双重真相

如果同时手工维护 Manifest 和生成索引，必然漂移。推荐把 `content-config.json` 作为唯一人工版本输入，其余 Manifest 条目与 loader map 全部生成，并在 build 中检查漂移。

请判断该策略是否充分。

### 风险 2：caseCount 语义

内容包包含历史版本后，`caseCount` 容易混淆。推荐：

- `caseCount`：默认可用 published 逻辑案件数。
- `caseVersionCount`：包内所有案件版本条目数。
- `caseIds`：包内所有逻辑案件 ID 去重列表。

请判断是否应改成其他更明确命名。

### 风险 3：跨版本稳定 ID 校验边界

纯脚本无法判断一个被删除的节点是否是“改名”还是“真的删除”。推荐只强制：

- 同一案件版本内引用一致。
- 不同案件不得复用实体 ID。
- 同一案件跨版本可复用稳定 ID。
- 已删除 ID 不得在后续版本代表另一语义。

语义改变仍需 reviewer 审核。请判断自动化边界是否合理。

### 风险 4：未审阅状态的 reviewer 字段

强制要求字段存在，但 planned/draft 尚未审阅。推荐使用 `reviewer: null` 和 `reviewedAt: null`，而不是假值或省略字段。请判断是否满足原要求。

### 风险 5：v1→v2 占位文件

用户要求现在建立 `migrate-v1-to-v2.ts`，同时明确不设计未知 v2。推荐保留未注册的类型安全占位，并让当前迁移表为空。请判断这是否优于抛错假实现或提前定义 v2。

### 风险 6：本地导入后的启动优先级

推荐：用户显式导入的 Content Pack 保持为活动来源，应用升级后的 bundled pack 不自动覆盖；设置页显示来源并允许以后恢复内置包。请判断 MVP 是否必须立即提供“恢复内置题库”。

### 风险 7：活动目录与历史版本分离

只增不删的 caseVersions 不能单独表达“当前默认可见内容”。推荐另存活动 Manifest，并让 list 查询受活动目录约束，而 exact-version 查询不受约束。请检查这会不会破坏现有 CaseRepository 契约。

---

## 十、审核问题

请逐项回答：

1. 推荐方案能否满足 R1–R13？每项给出 `满足 / 有条件满足 / 不满足`。
2. 是否同意继续采用方案 1？
3. 哪些问题是开工前必须修改的 Blocker？
4. 哪些问题可在实现过程中修正？
5. 是否存在不必要的抽象或范围膨胀？
6. ContentSource 与 IndexedDB Repository 的职责边界是否清楚？
7. Manifest 是否只有一个权威来源？
8. 多版本、deprecated 和活动目录的语义是否完整？
9. Attempt 的旧数据兼容策略是否可靠？
10. Content Pack 导入是否能做到失败时不改变用户数据？
11. 七项验收测试是否足以证明目标？还缺哪类关键测试？
12. 最终给出明确 Go/No-Go 结论。

---

## 十一、强制输出格式

请严格按以下格式输出，不要只给泛泛建议：

```markdown
# 审核结论

Verdict: APPROVE | APPROVE_WITH_CHANGES | REJECT
Go/No-Go: GO | NO-GO
Confidence: High | Medium | Low

## 一句话结论

<一句话说明是否应该继续方案 1>

## R1–R13 追踪表

| 要求 | 结论 | 依据 | 必须修改 |
|---|---|---|---|
| R1 | 满足/有条件满足/不满足 | ... | 是/否 |
...

## Blockers

1. <若无则写 None>

## Important changes

1. <必须在实现计划中调整的问题>

## Minor improvements

1. <不阻断实施的改进>

## 对 7 个已知风险的裁决

1. Manifest 双重真相：接受/修改/拒绝，原因...
2. caseCount 语义：...
3. 跨版本稳定 ID：...
4. reviewer null：...
5. v1→v2 占位：...
6. 本地导入优先级：...
7. 活动目录：...

## 测试缺口

1. <若无则写 None>

## 最小修订后的推荐架构

<只列必要变更，不重新设计项目>

## 开工条件

- [ ] <条件 1>
- [ ] <条件 2>

## 最终决定

<明确说明：可以继续 / 修改后继续 / 不应继续，并给出原因>
```

### 严重级别定义

- Blocker：不解决就会造成数据丢失、无法增量更新、必须重写核心页面，或直接违反 R1–R13。
- Important：不会立即破坏数据，但会造成明显兼容性、维护性或验证缺口。
- Minor：命名、文档、非关键测试或实现简化建议。

---

## 十二、审核边界

审核者不得把下列内容作为继续方案的前置条件：

- 重新创建 React/Vite 项目。
- 删除或改写已完成题型引擎。
- 删除 IndexedDB 或改用服务器数据库。
- 添加账号系统。
- 建立云端后台。
- 实现 CMS。
- 引入 ZIP、签名服务或插件市场。
- 预先设计未知 Schema v2。
- 删除旧案件版本或用户历史。

如果审核者认为方案不可行，必须指出一个无法通过当前架构增量修复的具体技术原因，并给出比推荐方案改动更小的替代方案。
