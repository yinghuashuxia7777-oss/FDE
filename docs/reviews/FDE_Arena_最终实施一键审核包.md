# FDE Arena 最终实施一键审核包

> 文档日期：2026-07-13
> 项目：FDE Arena
> 当前分支：`codex/fde-arena-mvp`
> 已提交基线：`a024c84a feat: add product data foundation`
> 审核性质：实施后终验，不是方案预审
> 审核目标：判断内容架构实施是否可验收，以及是否可以进入正式题库编写阶段

---

## 一、一键使用方法

将本 MD 文件直接上传给 ChatGPT，然后只发送下面这段话：

> 请作为资深前端架构师、内容平台架构师、IndexedDB 数据兼容审计员和应用安全审计员，对本审核包进行一次独立终验。请严格区分“内容架构是否完成”与“正式题目是否已编写”，不要虚构本文档没有提供的代码证据。按照末尾的强制输出格式给出 `PASS`、`PASS_WITH_FIXES` 或 `FAIL`，并明确判断是否可以进入正式题库编写阶段。不要重新设计整个网站，不要直接写代码。

---

## 二、给审核者的角色与边界

你审核的是一个已有大量通用训练能力的本地优先 Web 应用。本轮工作的目标是将程序与题库分离，并建立可持续升级的内容包机制。

审核时必须遵守以下边界：

1. 不得建议重新初始化项目、推翻已有题型引擎或重写整个网站。
2. 不得建议删除或重置 attempts、progress、mastery、mistakes 或 settings。
3. 不得以“未实现后端、登录、云同步、CMS、ZIP 包、签名市场”作为本轮不通过的理由，因为这些明确不在 MVP 范围。
4. 不得把“内置正式案件数为 0”误判为内容架构必然失败；但必须把它列为产品内容尚未就绪的真实风险。
5. 如果本文档只提供了测试路径和结果，而没有提供完整源码，请将结论标注为“有实施证据”，不要伪称已逐行审计所有文件。
6. 发现问题时，必须提供最小修复边界，不得使用“建议优化”这类无法执行的空泛表述。

---

## 三、审核结论的判定标准

### PASS

没有会导致用户数据丢失、内容非确定性发布、活动版本误推断、不可信内容执行或页面重度耦合的问题。可直接进入正式题库编写阶段。

### PASS_WITH_FIXES

主架构成立，但存在有明确边界、不需要推翻已有实现的修复项。必须区分“进入题库编写前必须修复”和“发布前修复”。

### FAIL

存在下列任一情况：

- 内容安装可以部分成功或修改用户数据。
- 已发布案件版本可被静默覆盖。
- deprecated 后会自动回退显示历史 published 版本。
- 新增案件或领域必须修改核心页面、评分、错题本或 mastery。
- Manifest、checksum 或生成索引无法确定性复现。
- 未知未来 Schema 可被当作当前版本读取。
- 本地导入可执行 JavaScript、危险 HTML 或 `javascript:` URL。

---

## 四、项目基线与不得推翻的能力

### 4.1 技术栈

- React 19
- TypeScript 6，严格模式
- Vite 8
- React Router 7
- IndexedDB，通过 `idb` 访问
- Zod 4
- Vitest、Testing Library、fake-indexeddb
- 本地优先，固定用户 `local-user`
- 无后端、无账号、无运行时远程 API

### 4.2 本轮之前已存在的能力

- 12 类通用题型渲染器。
- 节点评分、案件评分、分支选择和后果反馈。
- 三次作答、提示、答案揭示和训练恢复。
- Attempt、Progress、Mistake、Mastery、Settings 的 IndexedDB 仓储。
- 用户进度导入导出与事务替换。
- Dashboard、Cases、Training、Debrief、Mistakes、Skills、Profile 等产品页基础。

### 4.3 当前交付状态

- 当前已提交基线为 `a024c84a`。
- 本次 Slice B 和内容架构修改仍在工作区，没有被 reset、删除或重新初始化。
- 本审核包只能证明本文档列出的实施与测试证据；工作区未提交是交付流程风险，不等于架构失败。

---

## 五、本轮强制要求

| 编号 | 必须满足的要求 |
|---|---|
| R1 | 正式题目、答案、解析、Domain、Skill、Coverage 位于 `content/`；TSX 不硬编码正式题目。 |
| R2 | 新增题目只需新增 JSON、更新内容矩阵、校验和生成，不修改答题页、评分或错题本。 |
| R3 | Case、Node、Option、Evidence、Domain、Skill 使用永久稳定 ID；历史不依赖标题、路径或数组下标。 |
| R4 | 案件包含内容版本、状态、创建/审核时间、适用版本、作者和审核人；已发布版本不静默覆盖。 |
| R5 | 内容 Schema 版本与案件内容版本分离；未来升级通过迁移；v2 未定义前不注册假迁移。 |
| R6 | Manifest、contentHash、checksum、Coverage Report 和 Loader Map 可确定性生成，不使用当前时间写已提交产物。 |
| R7 | `content:index` 自动扫描内容；`content:check` 发现字节漂移就失败。 |
| R8 | 校验覆盖 Schema、ID、答案引用、选项解析、图可达性、死循环、终点、Domain/Skill 引用、Coverage、状态和 Manifest 一致性。 |
| R9 | 新内容不丢历史；deprecated 默认隐藏但旧历史仍可解释；Attempt 保存案件与 Schema 版本。 |
| R10 | 运行时读取一个完整不可变 Content Pack 快照，而不是分别读取后拼接多个可变快照。 |
| R11 | ContentInstaller 在写入前完成校验，并使用单一 IndexedDB 事务安装内容。 |
| R12 | 本地内容包是不可信输入：文件限制、危险内容拒绝、未知版本拒绝、安全渲染。 |
| R13 | 设置页展示题库信息、checksum、领域统计、本地内容包预览/安装和恢复内置题库。 |
| R14 | 用户进度导入导出与 Content Pack 导入使用独立数据格式、按钮和文案。 |
| R15 | 页面只通过应用服务或 Repository 查询内容；未来来源通过替换 ContentSource/Repository 扩展。 |

---

## 六、已实施架构

### 6.1 整体数据流

```text
content-config.json + cases/domains/skills/coverage
  -> content:index
  -> Manifest + Coverage Report + JSON Schemas + generated loader map
  -> LocalContentSource / JsonFileContentSource
  -> one immutable ContentPack snapshot
  -> ContentInstaller prepare/validate/preview
  -> user confirmation
  -> one IndexedDB transaction
  -> ActiveContentCatalog + append-only case versions + installed pack snapshot
  -> Repository
  -> Dashboard / Cases / Training / Debrief / Mistakes / Skills / Profile / Settings
```

### 6.2 内容目录

```text
content/
├── cases/
│   ├── beginner/
│   ├── intermediate/
│   └── advanced/
├── domains/                 # 15 个 DomainDefinition
├── skills/                  # 15 个 SkillDefinition
├── case-families/
├── coverage/
│   └── coverage-plan.json      # 362 案件长期规划
├── manifests/
│   ├── content-config.json     # 人工维护的发布元数据
│   ├── content-manifest.json   # 生成
│   └── coverage-report.json    # 生成
└── schemas/                  # 生成 JSON Schema
```

当前 Manifest 事实：

```json
{
  "packId": "fde-arena-bundled",
  "displayName": "FDE Arena 内置题库",
  "contentVersion": "1.0.0",
  "schemaVersion": 1,
  "releasedAt": "2026-07-13T00:00:00.000Z",
  "activePublishedCaseCount": 0,
  "caseVersionCount": 0,
  "activeCases": [],
  "activeCaseIds": [],
  "allCaseIds": [],
  "domains": ["15 个内容定义 ID"],
  "checksum": "sha256:abfba0774e49a0dc6f32800a4cd1b5b05c9ed980e3020763d44a6d9cf8dc784b"
}
```

注意：`domains` 上面使用了摘要表达，实际 Manifest 包含 15 个稳定 Domain ID，不是字面字符串 `15 个内容定义 ID`。

### 6.3 核心契约

实施文件：`src/content/contracts.ts`

```ts
interface ContentSource {
  readonly sourceKind: "bundled" | "file" | "url" | "database";
  loadPack(): Promise<ContentPack>;
}

interface ContentPack {
  formatVersion: 1;
  manifest: ContentManifest;
  cases: FdeCase[];
  skills: SkillDefinition[];
  domains: DomainDefinition[];
  coverage: CoveragePlan;
}

interface ActiveContentCatalog {
  packId: string;
  contentVersion: string;
  schemaVersion: number;
  sourceKind: "bundled" | "file" | "url" | "database";
  activeCases: Array<{ caseId: string; version: number }>;
  activeDomainIds: string[];
  activeSkillIds: string[];
  installedAt: string;
  checksum: string;
}
```

与早期草案中分开的 `loadManifest/loadCases/loadSkills/loadDomains` 相比，最终实施使用一次 `loadPack()`。这是有意的调整：它避免在一次安装中读到多个不一致快照。

### 6.4 稳定 ID、版本和哈希

- 案件内容键：`caseId + metadata.version`。
- 用户历史键：`caseId + caseVersion`。
- 每个 Case、Node、Option、Evidence、Domain、Skill 都有 ID。
- 同一案件不同版本可以保留同一逻辑实体 ID。
- 同一 `(caseId, version)` 若 `contentHash` 相同，安装幂等；如果哈希不同，整包拒绝。
- 规范化使用 UTF-8、对象 key 排序、集合型数组排序、业务顺序数组保序和 SHA-256。
- checksum 计算排除 checksum 本身和运行时 `installedAt`。

### 6.5 Schema 与迁移

- `CURRENT_CONTENT_SCHEMA_VERSION = 1`。
- 案件顶层必须有 `schemaVersion: 1`。
- `metadata.version` 是案件内容版本，不是 Schema 版本。
- `src/content/migrations/index.ts` 存在顺序迁移框架。
- `src/content/migrations/migrate-v1-to-v2.ts` 是未注册的类型安全占位，没有伪造未知 v2。
- 未知未来 `formatVersion`、Manifest `schemaVersion` 或 Case `schemaVersion` 都在写入前拒绝。

### 6.6 生成和漂移机制

人工维护的内容包发布元数据位于：

```text
content/manifests/content-config.json
```

`content:index` 是生成入口，生成：

- `content-manifest.json`
- `coverage-report.json`
- 六类 JSON Schema
- `src/generated/content-index.ts`
- 每个案件的 contentHash
- 完整 Content Pack checksum

`content:check` 在内存中重新生成并与已提交产物按字节比较，不修改文件。生产 build 只执行 `content:check`，不静默重写源码。

生成的 JSON Schema 和 Loader Map 被 Prettier 忽略，但字节漂移由 `content:check` 独立强制。审核者应判断这个责任分离是否合理，不应仅因为生成物被 Prettier 忽略就判定存在漂移。

### 6.7 ContentSource 与不可信内容

已实现：

- `LocalContentSource`：从构建时 Loader Map 读取内置包。
- `JsonFileContentSource`：读取用户选择的单 JSON Content Pack。

安全边界：

- 读取文本前先检查 10 MiB 文件限制。
- JSON 只做数据解析，不执行表达式。
- Envelope 使用严格 Zod Schema，多余 attempts 等用户字段会被拒绝。
- 拒绝 `<script>`、危险原始 HTML、事件属性和 `javascript:` URL。
- 限制每包案件数、节点数、选项数、Evidence 数、文本长度和分支深度。
- React 以文本节点渲染日志、Diff、配置和解析，没有通过 Content Pack 执行代码的设计入口。

### 6.8 ContentInstaller 和原子性

实施文件：`src/content/installer.ts`

`prepare()` 完成：

1. 读取完整快照。
2. 未知版本检查。
3. 迁移。
4. Zod 校验。
5. 危险文本和规模限制。
6. 稳定 ID、Domain、Skill 和 Coverage 引用校验。
7. 图、终点和闭环校验。
8. Manifest 条目、contentHash、domainCaseCounts 和 checksum 校验。
9. 已安装不可变版本冲突检查。
10. 生成安装预览。

`install()` 使用一个 IndexedDB `readwrite` transaction，且 transaction 只打开：

```text
caseVersions
contentPacks
appMeta
```

Domain、Skill、Coverage 和 Manifest 作为完整快照保存在 `contentPacks` 记录中，当前活动内容通过 `appMeta` 中的 ActiveContentCatalog 引用。用户数据 Store 不在内容安装事务的 store list 中。

审核者应专门判断：将 Domain/Skill/Coverage/Manifest 保存为一个不可变快照，而不是建立四个独立 Store，是否仍满足原子安装与快照一致性。

### 6.9 ActiveContentCatalog 和 Repository 语义

- `CaseRepository.listActive()` 只读取 ActiveContentCatalog 列出的 `(caseId, version)`。
- `CaseRepository.list()` 保留兼容别名，语义同样是活动目录。
- `getVersion(caseId, version)` 可读取任意已安装历史版本。
- 省略 version 时返回空，不推断最高版本。
- A v2 deprecated 且不在 activeCases 时，不会自动显示 A v1 published。
- 历史 Debrief、Mistakes 和 Profile 都按 Attempt 中的精确 `caseVersion` 读取内容。
- 历史 Domain/Skill 定义可从已安装 Content Pack 快照中查找，用于解释旧 mastery 和案件。

### 6.10 IndexedDB 兼容

- 数据库版本从 v1 升到 v2。
- v2 只新增 `contentPacks` Store。
- 迁移不删除、清空或重建 attempts、progress、mastery、mistakes、settings。
- `caseVersions` 键保持 `[caseId, version]`，并只增不删。
- Attempt 现保存 `schemaVersion`、`caseId`、`caseVersion`、完成时间和分数。
- 导入或读取缺少 `schemaVersion` 的旧 Attempt 时按 v1 归一化。

### 6.11 动态页面和运行时接入

- `FDE_DOMAINS` 等页面内容常量已移除。
- Dashboard、Cases、Skills、Mistakes、Profile 读取 ContentRepository 的 Domain/Skill 定义。
- `App` 在 Router 外层提供 `ProductDataProvider`。
- 默认启动不再遍历旧 `caseIndex` seed，而是通过 ContentManagement 确保内置 Content Pack 已安装。
- `/cases`、`/skills`、`/mistakes`、`/profile`、`/settings`、`/training/:caseId` 和 `/debrief/:attemptId` 已接入真实页面。
- Training 只允许显式活动案件进入，然后按精确版本创建会话。

### 6.12 设置页

设置页已显示：

- 题库名称和 packId
- 内容版本和 Schema 版本
- 当前活动案件数
- 当前包案件版本数
- 历史案件版本总数
- 发布时间
- 内容来源
- checksum 验证状态
- 各领域当前活动案件数
- 内容状态导出
- 本地 JSON Content Pack 选择、预览和确认安装
- 恢复内置题库
- 独立的用户进度导入和导出

---

## 七、关键文件证据地图

| 责任 | 关键文件 |
|---|---|
| 案件类型和审核元数据 | `src/domain/cases/types.ts` |
| 案件 Zod Schema | `src/schemas/case.schema.ts` |
| Content Pack、Manifest、Catalog 契约 | `src/content/contracts.ts` |
| Domain、Skill、Coverage、Manifest Zod Schema | `src/content/schemas.ts` |
| Schema 识别和迁移入口 | `src/content/parse-content.ts` |
| 迁移注册表 | `src/content/migrations/index.ts` |
| 未注册 v1→v2 占位 | `src/content/migrations/migrate-v1-to-v2.ts` |
| 确定性规范化 | `src/content/canonicalize.ts` |
| 浏览器 SHA-256 | `src/content/hash.ts` |
| 构建时 SHA-256 | `scripts/content-hash.ts` |
| 内置来源 | `src/content/local-content-source.ts` |
| 本地文件来源 | `src/content/json-file-content-source.ts` |
| 内容包完整校验 | `src/content/validate-content-pack.ts` |
| 原子安装 | `src/content/installer.ts` |
| 自动扫描、Manifest、Loader Map 生成 | `scripts/build-case-index.ts` |
| 内容校验 | `scripts/validate-content.ts` |
| 图校验纯逻辑 | `src/content/validate-case-graph.ts` |
| 重复 ID 纯逻辑 | `src/content/detect-duplicate-ids.ts` |
| Coverage 审计 | `scripts/audit-coverage.ts` |
| IndexedDB v2 | `src/storage/database.ts` |
| 增量数据库迁移 | `src/storage/migrations.ts` |
| 案件仓储 | `src/repositories/indexeddb/case-repository.ts` |
| 内容仓储 | `src/repositories/indexeddb/content-repository.ts` |
| 默认启动和 Provider | `src/application/product/runtime.tsx` |
| ContentManagement 应用服务 | `src/application/product/content-management.ts` |
| 真实页面路由 | `src/app/router.tsx` |
| 设置页 | `src/pages/settings/SettingsPage.tsx` |
| 架构静态边界 | `src/architecture/content-boundaries.test.ts` |
| 真实内容生命周期集成测试 | `src/content/content-lifecycle.integration.test.tsx` |

---

## 八、T1–T18 验收证据矩阵

| 测试 | 实施证据 | 要求审核者确认的事实 |
|---|---|---|
| T1 新案件不改页面 | `content-lifecycle.integration.test.tsx`: `T1/T7/T18 imports JSON... through unchanged pages` | 真实 JsonFile 预览/安装、fake IndexedDB、真实 Repository 和 CaseLibraryPage 组成一条链。 |
| T2 新题保留旧进度 | 同文件：`T2 keeps every user store unchanged...` | Pack A 后写入五类用户数据，再安装 A+B，前后快照一致，B 没有 Progress。 |
| T3 deprecated 隐藏但历史保留 | 同文件：`T3/T14 hides a deprecated case...` | 活动列表为空，v1/v2 和 v1 Attempt 仍可精确读取。 |
| T4 旧 Schema 可读取 | `content-contracts.test.ts`: `loads schema version one...` | 当前 Schema v1 正常读取，未知未来版本拒绝，没有假 v2 迁移。 |
| T5 Manifest 与实际案件一致 | `build-case-index.test.ts`: `keeps the committed manifest identical...` | 直接扫描真实 `content/cases` 并对比 cases、allCaseIds 和 caseVersionCount。 |
| T6 重复 ID 必须失败 | `detect-duplicate-ids.test.ts` 与 `validate-content.test.ts` | 覆盖 Case、Node、Option、Evidence、Domain、Skill，并允许同案件跨版本保留稳定实体 ID。 |
| T7 新领域自动显示 | T1/T7/T18 真实安装链 | 安装新 Domain、Skill、Case 后 SkillsPage 出现新领域和技能。 |
| T8 确定性生成 | `build-case-index.test.ts`: `generates ... deterministically` | 两次生成 files、Manifest、Coverage Report、checksum 和 contentHash 字节一致。 |
| T9 显式活动版本 | `installer.test.ts`: `uses only explicit active versions...` | A v2 deprecated 不导致 A v1 回退显示，历史版本仍可读。 |
| T10 原子安装回滚 | `content-lifecycle.integration.test.tsx` 与 `installer.test.ts` 的故障注入 | 中途抛错后三个内容写入回滚，五类用户 Store 前后相同。 |
| T11 恢复内置题库 | `content-lifecycle.integration.test.tsx`: `T11 restores bundled content...` | Catalog 切回 bundled，导入版本和用户快照仍保留。 |
| T12 不可信内容 | `installer.test.ts` 恶意输入矩阵；`content-sources.test.ts` 超限文件 | `<script>`、事件属性、`javascript:` 和超限文件都在安装前拒绝。 |
| T13 同版本冲突 | `installer.test.ts`: `rejects a changed immutable case version...` | 同 `(caseId, version)` 不同内容在写入前整包拒绝。 |
| T14 历史 Domain/Skill | T3/T14 集成测试和 `keeps deprecated definitions...` | deprecated 定义仍能为历史案件和 mastery 提供名称。 |
| T15 未知未来版本 | `content-sources.test.ts` 和 `installer.test.ts` | 未知 format、Manifest Schema 和 Case Schema 都明确拒绝且零写入。 |
| T16 数据边界 | `content-sources.test.ts`、`progress-portability.test.ts`、`content-management.test.ts` | Content Pack 拒绝 attempts；用户导出不含 caseVersions/正文；内容状态导出不含节点正文或用户记录。 |
| T17 架构解耦 | `content-boundaries.test.ts` | pages 不 import 正式 cases、generated content index、storage 或 IndexedDB 实现；题型和 Evidence 渲染器不 import 正式题目。 |
| T18 能力地图自动扩展 | 真实 T1/T7/T18 集成测试和 `dynamic-content-pages.test.tsx` | 真实包安装与页面边界测试同时覆盖。 |

---

## 九、最终实际验证结果

以下命令均在 `/Users/charles/Documents/FDE网页题库` 中实际执行：

| 命令 | 最终结果 |
|---|---|
| `npm run content:validate` | 通过：0 cases、15 domains、15 skills、0 issues。 |
| `npm run coverage:audit` | 通过：362 案件长期规划，当前 0 published，产生信息级缺口而不是校验错误。 |
| `npm run content:index` | 成功写入 Manifest、Coverage Report、6 类 JSON Schema 和 Loader Map，共 9 类生成产物。 |
| `npm run content:check` | 通过：`drift: []`。 |
| `npm test -- --run` | 通过：50 个测试文件，507 项测试全部通过。 |
| `npm run typecheck` | 通过。 |
| `npm run lint` | 通过：0 error，0 warning。 |
| `npm run format:check` | 通过。 |
| `npm run build` | 通过：Vite 转换 4,777 个模块并生成生产构建。 |
| `git diff --check` | 通过。 |

生产构建体积：

```text
dist/index.html                  0.50 kB / gzip 0.32 kB
dist/assets/index-*.css         30.37 kB / gzip 5.84 kB
dist/assets/index-*.js         570.16 kB / gzip 163.65 kB
```

Vite 对原始压缩后的 JS chunk 给出默认 500 kB 提示，但 gzip 体积为 163.65 kB，低于项目文档的 250 kB gzip 目标。

验证过程中曾发现 Case JSON Schema 的旧生成器与新 `content:index` 存在字节排序差异。实施后已统一为同一确定性规范化算法，然后重新执行 507 项测试和生产构建并通过。

---

## 十、已知风险与必须专门审核的争议点

### 10.1 正式题库尚未编写

- 当前内置 active case 数为 0。
- 15 个 Domain、15 个 Skill 和 362 案件长期 Coverage Plan 已建立。
- 这表示“内容平台架构已可用，题目编写尚未开始”，不表示产品已有可对外训练的正式题库。

### 10.2 未执行浏览器 E2E 和人工辅助技术检查

- 本轮没有启动本地服务器或 watch 进程。
- 完成了单元、组件、fake IndexedDB 集成、静态架构和生产构建验证。
- 正式发布前仍应执行浏览器路由、真实 IndexedDB、键盘、屏幕阅读器和窄屏检查。

### 10.3 工作区尚未提交

- 当前分支正确，但本轮实施仍是 dirty worktree。
- 审核者应将其列为交付和可回滚性风险，而不是架构功能缺陷。

### 10.4 `activeDomainIds` / `activeSkillIds` 的权威语义

当前事实：

- `ContentConfig` 仍包含 `activeDomainIds` 和 `activeSkillIds`。
- 构建校验检查其中列出的 ID 存在且为 active。
- 运行时 `catalogFor()` 是根据 Domain/Skill definition 的 `status === "active"` 推导 Catalog 列表。
- Manifest 不包含独立 `activeDomainIds` / `activeSkillIds`。

请审核者判断：这是否形成了一个可能漂移的双重真相。如果认为是，最小修复应在以下两种方式中选择一种，不应重写架构：

1. 删除 ContentConfig 中冗余的两个列表，明确 definition status 为唯一来源；或
2. 强制 ContentConfig 的列表与所有 active definitions 完全相等，并使其语义与 Catalog 一致。

请说明该问题是否阻塞进入题库编写。

### 10.5 definitions 作为 Content Pack 快照保存

当前 Domain、Skill、Coverage 和 Manifest 保存在 `contentPacks` 中，不是独立 IndexedDB Store。这使得它们与 packId/contentVersion 严格绑定，也避免了跨 Store 快照错配。

请审核者确认：

- 这是否满足“原子保存 Domain、Skill、Coverage、Manifest”的要求。
- 历史定义查找是否会在安装包数量增加时出现可接受范围以外的性能风险。
- MVP 是否有必要现在就引入独立 Store，还是应保留当前最小快照实现。

### 10.6 空题库时 Coverage Audit 为通过

当前 `coverage:audit` 对空正式题库返回 `ok: true`，但同时输出：

- `remainingCaseCount: 362`
- `no_published_cases`
- 信息级 coverage gap

请审核者判断：

- 对于“内容架构基线”，信息级是否合理。
- 在第一个正式内容版本发布前，是否应另外增加“至少一个 active published case”的发布门禁，而不改变架构建设阶段的 audit 语义。

---

## 十一、审核者必须回答的问题

### A. 程序与内容边界

1. 当前实施是否真正使得新案件和新领域无需修改页面、评分、错题本或 mastery？
2. 生成 Loader Map 是否属于合理的构建产物，而不是手工 import 列表？
3. 页面通过 Repository 读取 Domain/Skill 是否足以支持未来来源替换？

### B. 确定性和版本

1. content-config、Manifest、contentHash、checksum 和 content:check 的责任分工是否清晰？
2. ActiveContentCatalog 是否彻底消除了“最高版本即当前版本”的隐式推断？
3. 同版本哈希冲突是否能防止已发布内容被静默改写？
4. Schema v1 和内容版本的分离是否正确？

### C. 原子性和用户数据

1. prepare 在 transaction 前完成全部不可信内容校验是否有证据？
2. install 的 transaction store list 是否足以证明用户 Store 不会被内容包修改？
3. 故障注入、Pack A→A+B、deprecated 和 restore bundled 测试是否覆盖了主要兼容风险？
4. 是否仍存在必须在正式题库编写前修复的数据丢失路径？

### D. 不可信输入

1. 文件大小、Schema、未知版本、checksum、危险字符串和内容规模限制的顺序是否合理？
2. 是否存在可以通过 Markdown、日志、Diff、配置或选项解析触发脚本执行的未覆盖路径？
3. 安全检查是否足以支持 MVP 开放本地 JSON 导入？

### E. 测试证据

1. T1–T18 中哪些是真实集成证据，哪些只是静态或 mock 证据？
2. 哪些测试可能出现“测试通过但不能证明要求”的情况？
3. 是否需要在进入题库编写前补浏览器 E2E，还是可以在第一个正式内容包发布前补？

### F. 最小必要性

1. 当前 ContentSource、ContentInstaller、Repository 和页面边界是否属于最小必要重构？
2. 是否存在应删除的双重真相或无必要抽象？
3. 未来 URL/数据库来源是否可以只新增 ContentSource，而不重写页面？

---

## 十二、本轮之后的标准内容更新流程

### 只新增或修改案件

1. 在 `content/cases/<level>/` 新增案件 JSON。
2. 已发布逻辑实体保持稳定 ID；修改已发布内容时增加 `metadata.version`。
3. 更新 Domain/Skill 引用和 `coverage-plan.json`。
4. 在 `content-config.json` 选择精确活动案件版本，更新内容版本和固定发布时间。
5. 运行 `content:validate`、`coverage:audit`、`content:index`、`content:check`、测试和 build。
6. 不修改页面、评分、错题本或 mastery。

### 新增知识领域

1. 新增 DomainDefinition。
2. 新增属于该 Domain 的 SkillDefinition。
3. 在 Coverage Plan 中加入领域。
4. 新增引用该 Domain/Skill 的案件。
5. 页面和能力地图不改代码。

### 新增题型

只有这种情况允许扩展题型引擎、Schema 和 UI，并必须保持已有题型兼容。

### Schema 升级

先定义新 Schema，然后在 `src/content/migrations/` 实现和注册逐级纯迁移，不批量手工覆盖历史 JSON。

### 未来云端题库

实现新的 URL 或 Database ContentSource，复用现有 Installer、Repository 和页面。

---

## 十三、强制审核输出格式

审核者必须严格使用以下顺序输出，不得只给出笼统意见。

### 1. Verdict

只能选择：

- `PASS`
- `PASS_WITH_FIXES`
- `FAIL`

### 2. Go / No-Go

只能选择：

- `GO_TO_CONTENT_AUTHORING`
- `GO_AFTER_REQUIRED_FIXES`
- `NO_GO`

### 3. Confidence

给出高、中或低置信度，并用一句话说明证据局限。

### 4. Executive Summary

用不超过 10 句话回答：

- 核心架构是否成立。
- 用户数据是否安全。
- 是否真正支持内容增量更新。
- 是否可以开始编写正式题库。

### 5. Requirements Matrix

对 R1–R15 逐项给出：

- `PROVEN`
- `PARTIAL`
- `NOT_PROVEN`
- `FAILED`

每项必须引用本文档中的具体文件或测试证据。

### 6. T1–T18 Evidence Assessment

对每个测试标注：

- 真实集成证据
- 单元/组件证据
- 静态边界证据
- 证据不足

必须说明是否存在假阳性风险。

### 7. Findings

按下列优先级分组：

- `P0`：用户数据丢失、可执行不可信内容或核心架构无法成立。
- `P1`：进入正式题库编写前必须修复。
- `P2`：第一个正式内容包发布前修复。
- `P3`：可后续改进，不阻塞当前阶段。

每个 finding 必须包含：

1. 可验证的问题。
2. 本审核包中的直接证据。
3. 实际影响。
4. 最小修复。
5. 是否阻塞题库编写或发布。

如果某一级没有问题，必须明确写“无”。

### 8. User Data Compatibility Verdict

单独回答：

- 新题是否保留旧进度。
- deprecated 是否保留历史。
- 案件新版本是否覆盖旧 Attempt。
- 恢复 bundled 是否删除导入内容或用户历史。
- 数据库 v1→v2 是否是增量迁移。

### 9. Content Update Workflow Verdict

判断新增案件、新增 Domain/Skill、新增题型、Schema 升级和未来云端来源的边界是否清晰。

### 10. Scope Separation

必须分开列出：

- 内容架构完成度。
- 正式题库完成度。
- 浏览器交付验证完成度。

### 11. Final Recommendation

最后必须用明确句子回答：

- 是否可以继续当前架构。
- 是否可以立即开始编写正式题目。
- 如果不能，阻塞项只能是哪些具体事项。
- 哪些事项可以推迟到第一个内容包发布前。

---

## 十四、审核者不得忽略的事实

1. 本实施没有重新初始化项目。
2. 原有题型、评分、分支、错题本和 mastery 未被重写。
3. 数据库迁移和内容安装没有删除用户 Store。
4. 当前正式题库为空，不得将 362 案件 Coverage Plan 误写为已完成 362 道题。
5. `PASS` 只表示内容架构可验收，不表示 FDE Arena 已有可对外发布的正式题库。
6. 如果给出 `PASS_WITH_FIXES`，必须说明修复项是否阻塞内容编写，不得默认所有 P2/P3 问题都阻塞。
7. 如果给出 `FAIL`，必须引用能导致数据损坏、安全执行、版本错误或页面强耦合的直接证据。

---

## 十五、审核包声明

本文档是可独立上传的实施证据摘要，不包含整个代码库的逐行 diff。如果审核者认为某一结论必须依赖本文档未提供的具体实现，应将该项标记为 `NOT_PROVEN`，并精确指明需要查看的文件或测试，而不是虚构问题或虚构通过。
