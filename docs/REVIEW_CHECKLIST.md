# FDE 案件发布审核清单

> 每个候选版本都应逐项复核。任何标记为“阻断”的项目未通过时，不得进入 `published`。

## A. Schema、ID 与版本（阻断）

- [ ] 顶层 `schemaVersion` 存在且为 `1`。
- [ ] `id` 是永久稳定 ID，不依赖标题、路径或数组下标。
- [ ] `slug` 只含小写字母、数字及分隔段的单个连字符。
- [ ] `metadata.version` 是正整数；已发布内容的实质修改创建了新版本。
- [ ] Node、Option 和 Evidence ID 在案件内唯一。
- [ ] 未因文案或目录调整修改已发布实体的 ID。
- [ ] 未跨案件复用 Node、Option 或 Evidence ID。
- [ ] 所有必填非空字符串、非空列表和对象均已填写。
- [ ] 未增加当前 Schema 不存在的字段。

## B. 状态与元数据（阻断）

- [ ] `planned`/`draft` 的 `reviewedAt`、`reviewer` 都为 `null`。
- [ ] `reviewed`/`published`/`deprecated` 有 RFC 3339 `reviewedAt` 和非空 `reviewer`。
- [ ] `createdAt` 是 RFC 3339 时间，内容升级未伪造首次创建时间。
- [ ] `applicableVersions` 只写经确认的适用版本；不确定时未猜测。
- [ ] `sourceType` 与来源性质一致；`sourceReferences` 没有伪造引用。
- [ ] `author`、`reviewer` 不是占位符，且审核者不同于作者。

## C. 脱敏与安全（阻断）

- [ ] 组织、人物、域名、地址、日志和数据均为虚构、合成或充分脱敏。
- [ ] 不含真实密钥、Token、Cookie、身份信息、未公开客户信息或内部定位线索。
- [ ] 无法从上下文重新识别真实客户或事故。
- [ ] 命令和操作不会鼓励未授权、破坏性或不可逆行为。
- [ ] 安全、隐私、合规和客户承诺被视为真实决策约束。

## D. 场景质量

- [ ] `customerProfile` 说明业务目标和受影响使用者。
- [ ] `background` 提供必要上下文但未提前泄露根因。
- [ ] `initialIncident` 描述可观测现象，不把推测写成事实。
- [ ] `constraints` 会真实影响后续决策。
- [ ] `confirmedFacts` 只包含已经确认的事实。
- [ ] 案件有客户价值、风险和成功标准，不是术语记忆题。

## E. 分类、技能与难度（阻断）

- [ ] `domains` 中每个 ID 都存在于当前 Domain 注册表。
- [ ] `skills` 中每个 ID 都存在于当前 Skill 注册表。
- [ ] Skill 所属 Domain 与案件的 `domains` 一致。
- [ ] 每个节点 `skillWeights` 只引用顶层 `skills`，值为正数且总和为 `1`。
- [ ] 标签反映实际测量的行为，没有为 coverage 过度标注。
- [ ] 难度来自推理、证据与约束，不来自含糊文案。
- [ ] `beginner` 建议至少 2 个决策节点，`intermediate` 至少 3 个，`advanced` 至少 4 个；例外有明确教学理由。
- [ ] `estimatedMinutes` 经过实际试做校准。

## F. 证据链与可判定性（阻断）

- [ ] 每个正确答案都能由题内证据和确认事实推出。
- [ ] 每个错误选项都能被证据、约束或安全原则明确排除。
- [ ] 时间、时区、单位、采样窗口、基线与对照组一致。
- [ ] 不依赖题内未提供的厂商版本细节或外部记忆。
- [ ] 噪声可以辨别，不会让两个选项同样合理。
- [ ] Evidence 的 `type` 与内容匹配，材料无秘密或个人数据。
- [ ] `evidence-conclusion` 的 `conclusionId` 和 `evidenceIds` 都引用本节点实体。

## G. 题型、答案与选项（阻断）

- [ ] `type` 与 `answer` 形状正确匹配。
- [ ] 单选家族的 `correctOptionId` 存在于本节点。
- [ ] `multiple-choice.correctOptionIds` 非空、无重复且均存在。
- [ ] `ordering.orderedOptionIds` 恰好包含本节点所有选项一次。
- [ ] `matching.pairs` 使每个选项恰好参与一次，右侧值无重复。
- [ ] 错误选项是真实、有吸引力但可证伪的失败模式。
- [ ] 选项在长度、语气和细节层级上不会泄露答案。
- [ ] 每个 `Option.explanation` 都解释具体因果，而非只写“对/错”。
- [ ] `errorType` 稳定、语义清晰，相同失败模式未产生多个近义 ID。

## H. 反馈、评分与后果

- [ ] `firstWrong` 给方向提示但不直接报答案。
- [ ] `secondWrong` 给出更具体的证据或约束提示。
- [ ] `revealedAnswer` 提供因果链、正确行动和验证方法。
- [ ] `firstTry`、`secondTry`、`thirdTry` 均在 0–100，`weight > 0`。
- [ ] `criticalErrorOptionIds` 只引用本节点选项，且每项都有严重损害理由。
- [ ] `consequences[].optionId` 引用本节点选项，数值方向、单位和消息一致。

## I. 分支图（阻断）

- [ ] `startNodeId` 存在。
- [ ] 所有非空 `nextNodeId` 都引用存在的节点。
- [ ] 从起点可达所有应达节点，不存在孤岛。
- [ ] 不存在死循环。
- [ ] 至少存在一个 `nextNodeId: null` 的合法终点。
- [ ] 分支后续情节与学员刚做出的决定一致。

## J. Debrief（阻断）

- [ ] `summary` 概括完整决策链，而非题目列表。
- [ ] `rootCause` 能被题内证据支持。
- [ ] `correctApproach` 按安全、可验证的顺序给出处置方法。
- [ ] `keyLessons`、`remediation`、`verification`、`knowledgePoints` 均非空且不重复灌水。
- [ ] `interviewerPerspective` 描述可观察的候选人行为和推理质量。
- [ ] `customerRiskPerspective` 说明对结果、信任、安全或合规的影响。
- [ ] 如有 `recommendedCaseIds`，每个值都是真实存在的稳定 Case ID。

## K. 机械校验与发布门槛（阻断）

- [ ] `npm run content:validate` 通过。
- [ ] `npm run content:quality` 通过，难度、场景、证据、选项、Skill 和 Debrief 均达标。
- [ ] `npm run content:index` 已生成当前索引与 Manifest。
- [ ] `npm run coverage:audit` 通过，新案件进入正确 Domain 统计。
- [ ] `npm run content:check` 通过，不存在生成物漂移。
- [ ] 活动目录显式指向正确 `(caseId, version)`，没有推测“最高版本”。
- [ ] 待发布状态、审核人、审核时间和内容版本已最终确认。

## 审核结论

- [ ] 通过：可以发布。
- [ ] 有条件通过：只剩非阻断编辑修改，完成后由审核者确认。
- [ ] 退回：存在一项或多项阻断问题。

审核者：`____________________`

审核时间（RFC 3339）：`____________________`

案件 ID 与版本：`____________________ @ ______`

备注：`____________________________________________________________`
