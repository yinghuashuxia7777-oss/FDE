# FDE Arena 内容工程指南

## 1. 目标与边界

FDE Arena 的题库是可独立发布的内容，不是页面代码的一部分。新增案件、领域或技能时，应只修改 `content/` 下的 JSON 与覆盖计划，不得把题干、答案或解析写入 TSX。

属于内容包的材料：

- `content/cases/` 下的案件 JSON。
- `content/domains/` 与 `content/skills/` 下的分类定义。
- `content/coverage/coverage-plan.json`。
- 自动生成的 Manifest、索引和内容摘要。

页面、题型引擎、评分、错题本、进度和能力统计属于程序。只有新增题型才允许修改题型引擎；新增内容不能要求修改页面。

## 2. 高质量 FDE 案件

可发布案件必须同时满足：

- 场景来自具体的客户交付、集成、生产或采用问题，不是孤立术语问答。
- 学员要在时间、成本、安全、信任、权限或可运维性约束下做决策。
- 每个正确结论都有题内证据支持，不要求猜测未写出的假设。
- 错误选项代表真实且可解释的失败模式，不是荒谬陪衬。
- 解析说明为什么对、为什么错、如何验证和何时回滚。
- 分支可达、无死循环，且至少有一个 `nextNodeId: null` 的合法终点。
- Domain、Skill 和权重与当前分类法一致。
- 不含真实客户秘密、身份信息、凭据或可识别的内部系统细节。

## 3. 稳定 ID

ID 是用户历史与内容之间的永久契约。

- Case：`<family>-<sequence>`，例如 `rag-permission-leak-001`。
- Node：`<caseId>-node-<nn>`。
- Option：`<caseId>-node-<nn>-option-<x>`。
- Evidence：`<caseId>-node-<nn>-evidence-<nn>`。
- Domain 与 Skill 必须使用已注册 ID，见 [SKILL_TAXONOMY.md](./SKILL_TAXONOMY.md)。

标题、文案、`slug` 或目录变化时不得修改已发布 ID。同一案件的新版本应保留未改变的逻辑实体 ID。删除过的 ID 不得重新分配给新实体。

## 4. Schema 与内容版本

两个版本字段含义不同：

- 顶层 `schemaVersion` 是数据结构版本；当前只能是 `1`。
- `metadata.version` 是案件内容版本；必须是正整数。

已发布案件一旦修改题干、答案、证据、分支、评分或解析，必须新增更高的 `metadata.version`，不得静默覆盖旧版。旧版用于解释既有 Attempt，必须继续保留。

## 5. 状态与审核元数据

标准流程：

`planned → draft → reviewed → published → deprecated`

- `planned`：已有覆盖缺口和案件构想。
- `draft`：结构完整，但尚未通过内容审核。
- `reviewed`：具名审核已完成，可进入发布准备。
- `published`：可由活动目录显式引用。
- `deprecated`：退出默认题库，但历史内容和用户记录保留。

`planned` 与 `draft` 必须使用 `reviewedAt: null`、`reviewer: null`。`reviewed`、`published` 与 `deprecated` 必须提供 RFC 3339 格式的 `reviewedAt` 和非空 `reviewer`。

`createdAt` 表示案件首次创建时间；内容升级不应伪装成新案件。`applicableVersions` 只写经确认的适用版本，不确定时使用空数组而不是猜测。

## 6. 标准更新流程

1. 从 coverage 缺口选择已注册 Domain 与 Skill。
2. 使用 [CASE_TEMPLATE.md](./CASE_TEMPLATE.md) 创建 `draft`。
3. 按难度放入 `content/cases/beginner/`、`intermediate/` 或 `advanced/`。
4. 若确有新领域，新增 Domain、Skill 并同步 coverage；不要修改页面。
5. 运行 Schema/引用校验、内容质量门禁和索引生成。
6. 由不同于作者的审核者使用 [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md) 复核。
7. 更新状态和审核元数据，在内容配置中显式选择活动 `(caseId, version)`。
8. 生成确定性 Manifest 与内容包，核对数量、摘要和活动版本后发布。

常用命令：

```bash
npm run content:validate
npm run content:quality
npm run content:index
npm run coverage:audit
npm run content:check
```

不要手工维护案件 import 列表，也不要直接改写自动生成的 Manifest。

## 7. 发布责任

- 作者负责场景、证据链、选项和解析的技术正确性。
- 审核者负责可判定性、安全、难度、分类和脱敏。
- 发布者负责活动版本、Manifest、coverage 和生成物一致性。
- 任一校验失败、答案无法由题内证据证明、材料未脱敏或审核未具名，都必须阻断发布。
