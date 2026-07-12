---
title: FDE Arena 最终产品与实施规格书
aliases:
  - FDE实战题库
  - FDE刷题库
  - FDE Arena
tags:
  - FDE
  - AI工程
  - 题库
  - 产品规划
  - 实施规格
  - Codex
created: 2026-07-12
status: final
---

# FDE Arena 最终产品与实施规格书

> 本文是可以直接提交给 Codex 的最终版产品需求、内容蓝图、技术架构、UI 要求和实施计划。  
> Codex 阅读完本文后，应直接开始执行，不需要再逐项向用户确认。只有遇到真正无法继续的硬性阻塞时，才允许提问。

---

# 1. Codex 执行指令

你现在要实现一个面向 FDE（Forward Deployed Engineer，前线部署工程师）的实战刷题网站。

请严格遵守以下执行规则：

1. 完整阅读本文后再动手。
2. 先在项目中创建实施计划、目录结构和任务清单。
3. 立即调用当前环境中最合适的 **UI / UX / Frontend Design Skill**：
   - 先运行 `/skills` 查看已安装技能。
   - 选择最适合网页产品设计、设计系统、响应式布局或前端体验的 Skill。
   - 在最终总结中说明实际使用了哪个 Skill。
4. UI Skill 必须先产出：
   - 视觉方向
   - 设计原则
   - Design Tokens
   - 页面结构
   - 组件清单
   - 桌面端与移动端布局
5. 完成 UI 设计方案后直接进入开发，不再等待用户确认。
6. 使用计划模式拆分工作，不要一次性无控制地吞下整个项目。
7. 每一阶段都必须：
   - 先完成最小范围修改
   - 运行测试
   - 运行类型检查
   - 运行构建
   - 查看 Diff
   - 汇报实际结果
8. 禁止修改无关文件。
9. 禁止引入没有明确价值的依赖。
10. 禁止使用长期运行、不可控或会占满终端的任务。
11. 单个命令预计超过 2 分钟时：
    - 先拆分任务，或
    - 编写可中断脚本，提供进度输出和限制参数。
12. 禁止直接操作生产环境、真实用户数据或真实密钥。
13. 不要自动部署到公开互联网，除非用户之后明确要求。
14. 所有题库内容与 UI 代码必须分离。
15. 所有正式题目必须通过 Schema 校验和题目质量检查。
16. 第一版不使用 AI 在用户答题时实时生成正式题目。
17. 不允许为了赶进度生成大量低质量、重复、答案模糊的题目。
18. 所有关键结论都要用真实测试或可复现证据验证。
19. 最终必须交付可本地运行、可构建、可静态部署的完整项目。
20. 完成后给出：
    - 项目结构
    - 启动方式
    - 测试结果
    - 构建结果
    - 已实现功能
    - 未实现功能
    - 下一阶段建议

---

# 2. 项目名称与定位

## 2.1 工作名

**FDE Arena**

中文名称：

> FDE 实战题库

未来公开发布时可重新命名，开发期间统一使用 `FDE Arena`。

## 2.2 产品定位

FDE Arena 是一个面向 FDE 学习者、求职者和在职工程师的实战训练网站。

第一版只供单个用户本地使用，但从架构上预留未来公开部署、多用户账号、云端同步、内容后台和职业评估能力。

产品不做普通“知识点选择题网站”，而是通过真实客户现场、生产事故、系统集成、AI 工程和项目推进场景，把以下内容融合到一次训练中：

```text
学习
面试
排障
架构判断
客户沟通
事故处理
复盘
```

核心价值：

> 用户全部通过点击完成客观题，但训练结果应接近真实 FDE 面试和客户现场决策，而不是只会背答案。

## 2.3 目标用户

第一阶段：

- 用户本人
- 非传统工程背景、希望进入 AI 行业的人
- 想成为 FDE 或 AI Solutions Engineer 的学习者

未来公开版：

- FDE / FDSE 求职者
- AI 应用工程师
- Solutions Engineer
- AI 产品经理
- 技术售前
- AI 创业团队
- 企业内部 AI 落地团队
- 面试官和招聘团队

---

# 3. 产品目标与非目标

## 3.1 核心目标

用户持续训练后，应具备以下能力：

- 能快速看懂陌生项目结构和运行方式。
- 能理解终端、进程、端口、依赖、环境变量和日志。
- 能看懂 Git Diff、PR 和高风险改动。
- 能根据 HTTP 状态码、日志、指标和命令输出缩小问题范围。
- 能理解 API、认证、权限、限流、超时、重试和幂等。
- 能识读基础 Python、JavaScript、SQL、Docker 和 CI/CD 配置。
- 能理解云、容器、Kubernetes、网络和部署问题。
- 能理解 RAG、Agent、Tool Calling、Eval、Guardrails 和 Loop Engineering。
- 能根据客户需求做架构与交付判断。
- 能处理真实事故中的止损、回滚、验证、沟通和复盘。
- 面对没有见过的问题时，仍然能通过证据和优先级找到方向。

## 3.2 明确非目标

第一版不做：

- 注册登录
- 云端同步
- 排行榜
- 社交互动
- 评论区
- 付费订阅
- 多语言
- 自由输入主观题
- 主观题 AI 评分
- 在线代码执行沙盒
- AI 实时生成正式题目
- 企业管理后台
- 候选人监考
- 公开部署
- 原生 App
- 复杂游戏化系统

---

# 4. 产品核心原则

## 4.1 全部使用客观题

第一版所有作答必须通过点击、拖拽、排序或匹配完成。

支持题型：

- 单选题
- 多选题
- 判断题
- 排序题
- 匹配题
- 结论与证据双层选择题
- 日志识读题
- 命令选择题
- Git Diff 风险识别题
- 配置片段识读题
- 架构方案比较题
- 连续分支决策题
- “下一步最优动作”题
- 修复方案题
- 验证方案题
- 客户沟通回复选择题

## 4.2 客观题必须训练实战判断

不能只问：

```text
504 是什么意思？
Docker 是什么？
RAG 是什么？
```

必须尽量转换为：

```text
客户反馈页面持续转圈。
Nginx 返回 504。
应用日志没有收到请求。
当前最优下一步是什么？
```

或：

```text
这条日志证明了什么？
它不能证明什么？
哪个结论属于过度推断？
哪个动作风险最高？
修复后如何验证？
```

## 4.3 学习和面试融合

不设置割裂的学习模式和面试模式。

统一模式名称：

> FDE 实战训练

每个案件同时是：

```text
课程
面试
真实案例
能力评估
复盘
```

## 4.4 自适应反馈

用户第一次答错时：

- 不直接公布正确答案。
- 只提示错误类型。
- 允许再次选择。

第一次错误提示示例：

- 当前证据不足。
- 该结论属于过度推断。
- 该操作优先级较低。
- 该动作可能扩大事故影响。
- 该答案没有解决当前阻塞。
- 这个操作会破坏现场证据。

第二次错误时：

- 提供更明确的方向提示。
- 仍不直接显示正确答案。

第三次错误时：

- 可以显示正确答案。
- 该节点得分为 0。
- 案件结束后必须完整解释。

## 4.5 证据优先

题目必须区分：

- 已知事实
- 合理推断
- 未验证假设
- 过度推断
- 错误结论

用户不应只因为看到关键词就得分，正确结论必须匹配正确证据。

## 4.6 优先级优先

多个排查动作可能都有用，但题目必须考：

> 当前信息下，哪一个动作信息增益最高、成本最低、风险最小、最应该先做？

## 4.7 真实后果

错误动作不能只是“答错”。

案件中应体现：

- 浪费时间
- 增加成本
- 扩大影响面
- 丢失证据
- 造成数据风险
- 降低客户信任
- 延误上线
- 触发关键错误

---

# 5. 题库覆盖承诺

任何有限题库都不可能穷尽未来所有公司、行业、技术栈和事故。

FDE Arena 不承诺：

> 做完题库后，用户再也不会遇到陌生问题。

FDE Arena 必须承诺：

1. 系统覆盖主流 FDE 能力。
2. 覆盖真实项目完整生命周期。
3. 覆盖常见、高频和高风险事故。
4. 覆盖技术、业务、客户沟通、项目推进和生产运营。
5. 通过覆盖矩阵显示缺口，不能凭感觉宣称完整。
6. 用户面对未见过的问题时，仍能用通用方法排查。

通用方法：

```text
界定问题
→ 确认影响范围
→ 收集证据
→ 建立假设
→ 排除假设
→ 控制风险
→ 选择修复
→ 验证结果
→ 向客户解释
→ 复盘沉淀
```

---

# 6. 题库覆盖矩阵

每个正式案件必须同时标记以下维度。

## 6.1 项目生命周期

- 售前探索
- 需求澄清
- 流程调研
- 数据盘点
- PoC
- 技术设计
- 开发实现
- 系统集成
- 测试验收
- 部署上线
- 灰度发布
- 运营监控
- 故障响应
- 效果评估
- 扩容优化
- 培训交接
- 复盘迭代

## 6.2 技术层

- 用户端
- 浏览器 / App
- DNS
- CDN
- 负载均衡
- API Gateway
- 认证与权限
- 应用服务
- 任务队列
- 缓存
- 数据库
- 对象存储
- 搜索
- 向量数据库
- 第三方 API
- 模型服务
- Agent 工具层
- 云基础设施
- CI/CD
- 日志与监控

## 6.3 客户环境

- 本地开发
- 单台云服务器
- Docker
- Kubernetes
- Serverless
- 私有云
- 混合云
- 本地数据中心
- 隔离 VPC
- 无公网环境
- 气隙环境
- 边缘设备
- 移动网络
- 跨区域部署
- 多租户 SaaS

## 6.4 证据形式

- 客户口述
- 截图
- HTTP 响应
- 终端输出
- 应用日志
- 网关日志
- 数据库结果
- 指标面板
- 分布式 Trace
- 配置文件
- Git Diff
- CI 日志
- 架构图
- 成本账单
- 安全审计日志
- 用户行为数据

## 6.5 决策动作

- 继续询问
- 确认影响范围
- 获取证据
- 复现问题
- 提出假设
- 排除假设
- 止损
- 降级
- 回滚
- 修复
- 补测试
- 扩容
- 限流
- 转人工
- 通知客户
- 更新文档
- 复盘

## 6.6 风险类型

- 可用性
- 数据丢失
- 数据泄露
- 越权访问
- 错误自动执行
- 成本失控
- 性能退化
- 合规违规
- 客户信任损失
- 错误业务决策
- 供应商锁定
- 不可回滚

## 6.7 系统行为模式

- 同步请求
- 异步任务
- 批处理
- 定时任务
- 事件驱动
- 流式处理
- 重试
- 幂等
- 并发
- 事务
- 缓存
- 队列
- 多 Agent
- Human-in-the-loop

## 6.8 难度

- 初级
- 中级
- 高级
- 专家

第一版 UI 只显示初级、中级、高级。专家级在内容结构中预留，不在 MVP 首页显示。

---

# 7. 十四大能力领域

## 7.1 客户发现、需求与业务拆解

必须覆盖：

- 用户是谁
- 当前流程
- 真正痛点
- 输入与输出
- 数据来源
- 使用频率
- 人工成本
- 错误成本
- 成功指标
- 验收标准
- 业务负责人
- 技术负责人
- 决策链
- PoC 边界
- 非目标范围
- 失败兜底
- ROI
- 是否真的需要 AI
- 规则系统与模型的选择
- 如何拒绝不合理需求

典型案件：

- 客户只说“做一个 AI 助手”。
- 客户没有成功指标。
- 多部门成功标准冲突。
- 客户要求 100% 准确。
- 客户要求第一版接全部数据。
- PoC 成功但员工不使用。
- 项目没有明确业务负责人。
- 客户持续增加范围但不调整时间。

## 7.2 软件基础与项目结构

必须覆盖：

- 文件与目录
- 项目
- 依赖
- 运行环境
- 进程
- 端口
- IP
- 主机名
- 环境变量
- 日志
- README
- package.json
- requirements.txt
- pyproject.toml
- `.env`
- `.env.example`
- src
- tests
- config
- Dockerfile
- Compose
- GitHub Actions
- 入口文件
- 构建命令
- 测试命令

## 7.3 终端、操作系统与网络

必须覆盖：

- cd
- pwd
- ls
- cat
- grep
- find
- ps
- top / htop
- kill
- 信号
- lsof
- ss
- netstat
- curl
- tail
- chmod
- CPU
- 内存
- 磁盘
- OOM
- localhost
- 127.0.0.1
- 0.0.0.0
- IPv6
- DNS
- 路由
- 防火墙
- TLS / HTTPS
- 代理
- VPN
- VPC
- 安全组
- 负载均衡

## 7.4 Git、协作与交付

必须覆盖：

- status
- diff
- log
- commit
- branch
- merge
- rebase 基础
- conflict
- revert
- reset 风险
- Pull Request
- Issue
- Code Review
- 最小 Diff
- 单元测试
- 集成测试
- lint
- typecheck
- build
- CI/CD
- 灰度
- 回滚
- Feature Flag
- 版本发布
- Change Log

## 7.5 HTTP、API、认证与集成

必须覆盖：

- URL
- HTTP Method
- Headers
- Body
- JSON
- 2xx / 3xx / 4xx / 5xx
- 400
- 401
- 403
- 404
- 409
- 422
- 429
- 500
- 502
- 503
- 504
- API Key
- Bearer Token
- OAuth 2.0
- Scope
- Refresh Token
- Webhook
- Webhook 签名
- CORS
- Pagination
- Rate Limit
- Timeout
- Retry
- Exponential Backoff
- Jitter
- Idempotency
- API 版本
- Schema 兼容
- 第三方服务降级

## 7.6 数据、数据库与数据工程

必须覆盖：

- 结构化数据
- 非结构化数据
- CSV
- Excel
- JSON
- SQL
- JOIN
- 聚合
- 索引
- 慢查询
- 事务
- 隔离级别基础
- 脏写
- 乐观锁
- 幂等
- 数据重复
- 缺失值
- 格式错误
- 时区
- 编码
- Schema 演进
- ETL / ELT
- 批处理
- 流式数据
- 数据血缘
- 数据质量
- 数据回填
- 备份与恢复
- 读写分离基础

## 7.7 云、容器、Kubernetes 与部署

必须覆盖：

- Image
- Container
- Dockerfile
- Layer
- Compose
- Port Mapping
- Volume
- Container Network
- Registry
- Secret 注入
- Pod
- Deployment
- Service
- Ingress
- ConfigMap
- Secret
- Namespace
- Readiness
- Liveness
- Resource Request
- Resource Limit
- Rolling Update
- Autoscaling
- Serverless
- VM
- 对象存储
- IAM
- 区域
- 可用区
- Terraform 基础

## 7.8 可观测性、可靠性与生产事故

必须覆盖：

- Log
- Metric
- Trace
- Request ID
- Correlation ID
- 健康检查
- 错误率
- 吞吐量
- 延迟
- P50
- P95
- P99
- SLI
- SLO
- SLA
- 告警
- 告警疲劳
- On-call
- 影响面
- Incident Commander
- 止损
- 降级
- 熔断
- 限流
- 回滚
- 根因分析
- 事故复盘
- Runbook

## 7.9 安全、隐私、合规与治理

必须覆盖：

- 最小权限
- IAM
- RBAC
- 多租户隔离
- Secret 管理
- Key Rotation
- PII
- 脱敏
- 加密传输
- 静态加密
- 审计日志
- 数据保留
- 数据删除
- 数据驻留
- 合规边界
- 供应商风险
- SQL 注入
- SSRF 基础
- Prompt Injection
- Data Exfiltration
- Tool 越权
- 高风险人工确认
- 测试环境使用生产数据的风险

## 7.10 LLM 基础、模型选择与 AI 应用

必须覆盖：

- Token
- Context Window
- Temperature 基础
- System / User 指令
- Structured Output
- Tool Calling
- 模型路由
- 大模型与小模型选择
- 延迟
- 成本
- 幻觉
- 多语言
- 视觉
- 语音
- 批量抽取
- 摘要
- 分类
- 生成
- 审核
- Human-in-the-loop
- 回退模型
- 供应商切换

## 7.11 RAG、搜索与企业知识系统

必须覆盖：

- 文档采集
- PDF 解析
- OCR
- 文档解析
- Chunking
- Embedding
- Vector DB
- Keyword Search
- Hybrid Search
- Metadata Filter
- 权限过滤
- Top-k
- Rerank
- Query Rewrite
- 引用
- 新鲜度
- 去重
- 版本
- 知识冲突
- GraphRAG 适用边界
- 检索 Eval
- 答案 Eval

## 7.12 Agent、工具、Eval 与 Loop Engineering

必须覆盖：

- Agent 目标
- 工作流与 Agent 的选择
- Tool 描述
- JSON Schema
- 参数校验
- Tool 权限
- Tool 错误
- Timeout
- Retry
- 幂等
- 终止条件
- 最大步数
- 最大预算
- 状态持久化
- Checkpoint
- Worktree
- Generator / Evaluator
- 独立评估
- 测试集
- 离线 Eval
- 在线 Eval
- Guardrails
- MCP
- Skill
- 自动化调度
- Loop
- 人工审批点

## 7.13 性能、成本、容量与扩展

必须覆盖：

- 端到端延迟
- 并发
- 吞吐
- 队列积压
- 缓存
- 批处理
- 异步
- 并行
- 模型 Token 成本
- 向量库成本
- 日志成本
- 云资源成本
- 配额
- 限流
- 容量规划
- 冷启动
- 热点
- 自动扩缩容
- 成本异常检测

## 7.14 FDE 项目推进、采用与客户沟通

必须覆盖：

- Stakeholder Mapping
- 业务负责人
- 技术负责人
- 风险同步
- 周期管理
- 需求变更
- Scope Creep
- 优先级
- 试点用户
- 用户培训
- 使用手册
- Runbook
- 交接
- Adoption
- 用户反馈
- 组织阻力
- 高层汇报
- 事故沟通
- 预期管理
- 反对不合理承诺
- 从定制项目提炼通用产品能力

---

# 8. 跨领域综合案件

至少 40% 的中级与高级案件必须跨越三个以上领域。

必须包含以下综合案件家族：

1. 企业知识助手上线失败
2. AI 客服回复错误
3. Agent 重复创建订单
4. 语音 Agent 延迟过高
5. 私有化部署无法联网
6. 多租户 RAG 数据泄露
7. AI 财务报告数字错误
8. Coding Agent 改坏生产项目
9. OAuth 接入后部分用户 403
10. Docker 正常但云端外部无法访问
11. Kubernetes Pod Running 但服务不可用
12. 模型升级后线上效果回退
13. Webhook 重复触发导致重复写入
14. 第三方模型服务超时引发级联故障
15. AI 成本夜间异常暴涨
16. 数据删除请求未覆盖向量库
17. 客户要求气隙环境部署
18. PoC 成功但业务部门拒绝使用
19. 销售承诺不可实现的上线日期
20. AI 自动审批缺少人工确认

---

# 9. 难度体系

## 9.1 初级

特点：

- 单层问题
- 直接证据
- 单一主要根因
- 干扰项较少
- 4～6 个决策节点

目标：

- 建立工程识读能力
- 掌握基本命令、文件、状态码和流程
- 能做出正确第一反应

## 9.2 中级

特点：

- 跨 2～4 个技术层
- 多个合理假设
- 必须连续排除
- 存在优先级陷阱
- 6～10 个决策节点

目标：

- 根据证据逐步收敛
- 能区分症状、原因和根因
- 能选择修复与验证方法

## 9.3 高级

特点：

- 多服务链路
- 生产环境风险
- 信息不完整
- 存在多个技术可行方案
- 必须做业务和风险权衡
- 8～14 个决策节点

目标：

- 控制事故影响面
- 做架构权衡
- 处理安全、合规和客户沟通
- 完成回滚、验证和复盘

---

# 10. 题型详细设计

## 10.1 连续案件题

核心流程：

```text
客户背景
→ 当前现象
→ 已知事实
→ 第一步行动
→ 新证据
→ 第二步判断
→ 根因
→ 修复
→ 验证
→ 客户沟通
→ 复盘
```

前一步选择可以影响后续：

- 显示什么证据
- 扣除多少分
- 增加什么风险
- 是否触发关键错误
- 案件走向

## 10.2 日志识读题

要求判断：

- 这条日志证明什么
- 不能证明什么
- 最可能原因
- 下一条命令
- 是否过度推断

## 10.3 命令选择题

示例目标：

- 查哪个进程监听端口
- 查容器最近 100 行日志
- 验证 API 是否返回 200
- 查看磁盘
- 查看内存
- 查 Pod 上一次崩溃日志

干扰项必须是真实命令，但作用不同。

## 10.4 排障排序题

评分不只看完整顺序，还看：

- 第一项是否合理
- 高风险操作是否过早
- 关键步骤相对顺序
- 是否先获取证据
- 是否先止损

## 10.5 结论与证据双层题

用户必须同时选择：

```text
结论
+
支持结论的证据
```

只选对结论但选错证据，不得满分。

## 10.6 Git Diff 风险题

要求识别：

- 高风险修改
- 无关修改
- 安全问题
- 是否应合并
- 缺少的测试
- 应否回滚

## 10.7 配置识读题

展示：

- `.env`
- Dockerfile
- Compose
- GitHub Actions
- Nginx
- Kubernetes YAML
- SQL
- IAM Policy

要求识别：

- 密钥泄露
- 端口错误
- 环境变量缺失
- 权限过大
- 版本不可复现
- 资源限制错误
- 路由错误

## 10.8 架构权衡题

必须给出业务约束，例如：

```text
每天 100 个 PDF
允许等待 10 分钟
必须人工复核
预算有限
数据不能出境
```

考察：

- 同步或异步
- 是否需要队列
- 是否需要 RAG
- 是否需要 Agent
- 使用云模型或本地模型
- 人工确认点
- 失败恢复方式

## 10.9 客户沟通题

给出多种回复，区分：

- 甩锅
- 过度承诺
- 模糊回答
- 技术堆砌
- 专业、诚实、能推动下一步的回答

---

# 11. 每个能力点的最低覆盖标准

一个能力点不能因为出现过一道定义题就标记为“覆盖”。

每个重要能力至少需要六种题：

1. 概念识别
2. 正常路径
3. 故障诊断
4. 危险干扰项
5. 修复与验证
6. 跨场景迁移

高风险能力额外需要：

7. 影响面控制
8. 回滚与恢复
9. 审计与客户沟通

示例：“API Key”必须覆盖：

- API Key 是什么
- 放在哪里
- 如何注入程序
- 泄露后怎么办
- 如何轮换
- CI/CD 中如何使用
- 日志中如何避免泄露
- 多环境如何隔离
- 客户为什么不能把 Key 发给个人账号

---

# 12. 防止用户只背答案

## 12.1 同一能力，不同技术外观

例如“端口未开放”分别出现在：

- 云安全组
- 本机防火墙
- Docker 端口映射
- Kubernetes Service
- Nginx
- 企业 VPN

## 12.2 相同现象，不同根因

例如“页面打不开”可以来自：

- DNS
- TLS
- 进程未启动
- 端口未监听
- 只绑定 localhost
- 防火墙
- 网关路由
- 前端配置

## 12.3 结论必须绑定证据

只有结论和证据同时正确才得满分。

## 12.4 强调最优下一步

多个选项都可能有用，但只奖励当前最合理的动作。

## 12.5 错误路径有后果

错误选择应影响：

- 时间
- 风险
- 成本
- 客户信任
- 现场证据
- 是否触发关键错误

---

# 13. 题目生产策略

## 13.1 核心固定题库 + 模板化变体

固定：

- 能力目标
- 推理链
- 根因
- 正确答案
- 评分
- 风险边界
- 错误选项逻辑
- 完整解析

允许变化：

- 技术栈
- 端口
- 文件名
- 日志数值
- 客户行业
- 云厂商
- 数据规模
- 业务背景

## 13.2 正式题目禁止实时生成

用户答题时，不让 AI 临时生成正式题目或答案。

AI 只可用于：

- 生成题目初稿
- 生成变体
- 检查歧义
- 补充解析
- 标记知识点
- 审查覆盖缺口

正式题目必须通过审核后发布。

## 13.3 Maker–Checker 内容流程

题目生产采用双角色：

### Generator

负责：

- 生成案件
- 设计节点
- 生成选项
- 编写解析

### Evaluator

必须：

- 假设题目有问题
- 检查是否存在多个合理答案
- 检查证据是否足够
- 检查错误选项是否真实
- 检查是否存在文字陷阱
- 检查答案是否依赖过时产品行为
- 检查是否符合 FDE 实战

没有通过 Evaluator 的题目不得发布。

---

# 14. 题库规模规划

## 14.1 原型阶段

目的：

> 验证网站、题型、评分、错题本和数据架构。

规模：

```text
24 个完整案件
150～200 个决策节点
```

这不代表题库完整。

## 14.2 面试基础版

规模：

```text
160 个核心案件
约 1000～1300 个决策节点
```

要求：

- 十四领域全部覆盖
- 每个领域均有初、中、高级题
- 至少 50 个跨领域案件
- 关键安全错误全部覆盖

## 14.3 完整实战版

目标：

```text
338 个核心案件
约 2200～2800 个决策节点
```

建议分布：

| 领域 | 核心案件数 |
|---|---:|
| 客户发现与需求 | 18 |
| 软件与项目结构 | 16 |
| 终端、系统与网络 | 28 |
| Git 与交付 | 18 |
| HTTP、认证与集成 | 28 |
| 数据与数据库 | 26 |
| 云、容器与部署 | 30 |
| 可观测性与事故 | 28 |
| 安全、隐私与合规 | 28 |
| LLM 应用基础 | 20 |
| RAG 与搜索 | 24 |
| Agent、Eval 与 Loop | 28 |
| 性能、成本与扩展 | 18 |
| 项目推进与客户沟通 | 28 |
| **合计** | **338** |

每个核心案件可有 2～4 个审核后的变体，最终可形成约 700～1000 个可见案件版本。

---

# 15. MVP 必须包含的 24 个案件

## 初级 12 个

1. 识别项目结构和启动入口
2. 本地服务端口与进程
3. `.env` 与 `.env.example`
4. HTTP 401 / 403 / 404 判断
5. HTTP 429 / 500 / 504 判断
6. `curl` 与 `lsof` 输出识读
7. Git Diff 中的无关修改
8. API Key 泄露风险
9. Docker 基础端口映射
10. SQL 查询结果识读
11. 日志中的错误位置识别
12. 客户提出模糊 AI 需求

## 中级 8 个

13. Docker 内部正常但外部无法访问
14. 第三方 API 429 与重试风暴
15. 数据库连接失败与环境变量
16. CI 构建通过但部署失败
17. OAuth Token 有效但 Scope 不足
18. RAG 检索到错误版本文档
19. Tool Calling 参数 Schema 错误
20. AI 成本夜间异常暴涨

## 高级 4 个

21. 多租户 RAG 数据泄露
22. Agent 重复创建订单与幂等
23. 生产服务 504 级联故障
24. 企业知识助手从 PoC 到上线架构决策

每个案件必须至少包含：

- 真实背景
- 4 个以上决策节点
- 至少一个证据题
- 至少一个优先级题
- 至少一个修复或验证题
- 完整解析
- 能力标签
- 难度
- 预计用时

---

# 16. 评分体系

## 16.1 单选题

- 第一次答对：100%
- 第一次错、提示后答对：60%
- 第二次错、更强提示后答对：30%
- 第三次公布答案：0%

## 16.2 多选题

- 正确项加分
- 错误项扣分
- 漏选扣分
- 全选不能获得高分

## 16.3 排序题

根据以下因素评分：

- 第一项
- 关键步骤相对顺序
- 高风险动作是否提前
- 整体顺序相似度
- 是否先获取证据

## 16.4 案件评分维度

所有案件：

- 知识准确性
- 证据使用
- 排障优先级
- 风险意识
- 交付判断

高级案件增加：

- 架构权衡
- 客户沟通
- 成本意识
- 安全边界

## 16.5 关键错误 Critical Error

以下选择触发关键错误：

- 未备份直接改生产数据库
- 将真实密钥提交到 GitHub
- 给 Agent 管理员权限
- 未确认影响面直接重启核心服务
- 长期关闭 TLS 验证
- 自动合并未经审查的生产 PR
- 多租户知识库无权限隔离
- 高风险操作无人工确认
- 删除数据无审计与恢复方案
- 用生产数据随意做测试

出现关键错误时，即使总分较高，案件也不能判为通过。

## 16.6 最终评价

- 优秀通过
- 通过
- 勉强通过
- 未通过
- 存在关键风险

系统生成面试官式评价，例如：

> 能够根据现有证据定位问题，但排障顺序仍偏散。  
> 安全意识基本正确，但缺少回滚与审计意识。

---

# 17. 能力掌握度

每个技能维护 0～100 分。

MVP 使用透明、简单算法：

```text
首次出现：
mastery = 本次节点得分

后续更新：
mastery = 旧分数 × 0.7 + 本次得分 × 0.3
```

规则：

- 发生关键错误时，该技能本次最高记为 40。
- 在不同场景连续答对时，掌握度才能稳定提高。
- 单次高分不能直接标记“完全掌握”。
- 长期未练习可以在未来版本加入衰减，MVP 暂不实现。

状态：

- 0～39：薄弱
- 40～59：学习中
- 60～79：基本掌握
- 80～100：熟练

---

# 18. 错题本与推荐系统

## 18.1 错题本保存

- 当时选择
- 正确答案
- 错误类型
- 正确证据
- 为什么被干扰
- 关联技能
- 是否为关键错误
- 历史重做结果

## 18.2 错误类型

- 概念错误
- 证据不足
- 过度推断
- 优先级错误
- 风险意识不足
- 修复方案错误
- 验证不足
- 客户沟通不当
- 架构权衡错误

## 18.3 推荐下一题

优先级：

1. 关键错误相关能力
2. 当前薄弱的重要能力
3. 刚掌握但需要跨场景验证的能力
4. 很久未练习的能力
5. 用户当前目标岗位常考能力

---

# 19. 页面结构

## 19.1 首页 / Dashboard

显示：

- 今日训练
- 当前等级
- 连续训练天数
- 总案件数
- 已完成案件
- 初级 / 中级 / 高级进度
- 十二或十四领域能力概览
- 最近薄弱能力
- 推荐案件
- 最近错题
- 关键风险数量

## 19.2 能力地图

按十四领域展示：

- 未开始
- 薄弱
- 学习中
- 基本掌握
- 熟练

支持点击进入相关案件。

## 19.3 案件库

筛选：

- 难度
- 能力领域
- 技术栈
- 题型
- 是否做过
- 是否通过
- 是否有关键错误
- 预计时长

案件卡片：

- 标题
- 客户场景
- 难度
- 技能标签
- 预计用时
- 历史最高分
- 最近结果
- 是否包含关键风险

## 19.4 实战答题页

桌面端建议三栏。

### 左栏：案件现场

- 客户背景
- 当前现象
- 业务约束
- 已确认事实
- 案件时间线

### 中栏：证据区

- 日志
- 终端输出
- 配置
- Git Diff
- 架构图
- 客户补充信息
- 指标图表

### 右栏：决策区

- 当前问题
- 选项
- 风险提示
- 得分变化
- 时间 / 成本 / 信任影响
- 当前进度

移动端：

```text
场景
→ 证据
→ 问题
→ 选项
```

避免三栏强行压缩。

## 19.5 案件复盘页

必须显示：

- 总分
- 是否通过
- 是否出现关键错误
- 完整决策路径
- 正确路径
- 每个错误选项为什么错
- 哪些结论证据不足
- 哪些动作优先级错误
- 面试官评价
- 客户现场风险评价
- 关联知识点
- 推荐复练案件

## 19.6 错题本

支持：

- 按能力筛选
- 按错误类型筛选
- 只看关键错误
- 重新挑战
- 查看历史选择
- 对比前后进步

## 19.7 个人能力档案

显示：

- 十四领域掌握度
- 初中高级通过率
- 证据判断
- 排障优先级
- 风险意识
- 架构判断
- 客户沟通
- 高频错误
- 面试准备度

## 19.8 设置与数据

第一版必须支持：

- 导出全部本地数据为 JSON
- 从 JSON 导入数据
- 清空进度
- 切换浅色 / 深色 / 跟随系统
- 查看题库版本
- 查看数据存储说明

---

# 20. UI 与视觉要求

## 20.1 视觉定位

关键词：

```text
专业
克制
现代
可信
工程感
高信息密度
清晰
不压迫
```

不要：

- 传统考试后台模板
- 儿童化游戏界面
- 大面积廉价渐变
- 过度霓虹
- 无意义动效
- 拥挤表格
- 页面到处都是边框
- 难以阅读的代码块
- 纯黑背景配高饱和色

## 20.2 设计系统

UI Skill 需要产出：

- 色彩系统
- 字体层级
- 间距系统
- 圆角
- 阴影
- 状态颜色
- 风险颜色
- 成功 / 警告 / 关键错误样式
- 代码与日志样式
- Diff 样式
- 卡片
- 标签
- 按钮
- 答题选项
- 进度
- 能力可视化

## 20.3 可访问性

- 文字对比度达到 WCAG AA。
- 不只通过颜色表达正确和错误。
- 键盘可操作。
- 移动端触控区域足够大。
- 代码和日志支持横向滚动。
- 动效支持减少动态效果偏好。
- 所有图标有可理解文本或辅助标签。

---

# 21. 技术架构

## 21.1 推荐技术栈

- React
- TypeScript
- Vite
- React Router
- IndexedDB
- `idb` 轻量封装库
- Zod 或 JSON Schema 校验
- Vitest
- React Testing Library
- Playwright
- ESLint
- Prettier

原则：

- TypeScript 开启严格模式。
- 依赖版本必须锁定。
- 不使用重量级状态管理，除非有明确必要。
- 题库与应用逻辑分离。
- 避免单个文件承担过多职责。

## 21.2 本地优先

第一版：

```text
无需账号
无需后端
无需数据库服务器
无需网络即可答题
```

本地保存：

- 用户设置
- 训练记录
- 错题
- 掌握度
- 导入导出数据

## 21.3 Repository 抽象

页面禁止直接操作 IndexedDB。

必须定义接口：

```text
CaseRepository
ProgressRepository
AttemptRepository
SkillRepository
SettingsRepository
UserRepository
CoverageRepository
```

第一版实现：

```text
IndexedDbCaseRepository
IndexedDbProgressRepository
...
```

未来公开版可以替换：

```text
ApiCaseRepository
ApiProgressRepository
...
```

## 21.4 未来公开版预留

未来可接入：

- Supabase Auth
- PostgreSQL
- 自建 API
- 云端同步
- 多用户
- 内容后台
- 组织与班级
- 岗位专项路径
- 订阅

第一版不得绑定具体后端供应商。

---

# 22. 推荐目录结构

```text
fde-arena/
├── docs/
│   ├── product-spec.md
│   ├── ui-design.md
│   ├── architecture.md
│   ├── content-guidelines.md
│   └── coverage-matrix.md
├── public/
├── src/
│   ├── app/
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── cases/
│   │   ├── training/
│   │   ├── debrief/
│   │   ├── mistakes/
│   │   ├── skills/
│   │   └── settings/
│   ├── components/
│   │   ├── layout/
│   │   ├── case/
│   │   ├── evidence/
│   │   ├── question/
│   │   ├── scoring/
│   │   └── ui/
│   ├── domain/
│   │   ├── cases/
│   │   ├── attempts/
│   │   ├── scoring/
│   │   ├── mastery/
│   │   └── coverage/
│   ├── repositories/
│   ├── storage/
│   ├── schemas/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   └── tests/
├── content/
│   ├── cases/
│   │   ├── beginner/
│   │   ├── intermediate/
│   │   └── advanced/
│   ├── domains/
│   ├── skills/
│   ├── case-families/
│   ├── coverage/
│   └── schemas/
├── scripts/
│   ├── validate-content.ts
│   ├── audit-coverage.ts
│   ├── detect-duplicate-ids.ts
│   └── build-case-index.ts
├── tests/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 23. 数据结构

## 23.1 Case

```ts
type CaseLevel = "beginner" | "intermediate" | "advanced" | "expert";
type CaseStatus = "planned" | "draft" | "reviewed" | "published" | "deprecated";

interface FdeCase {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: CaseLevel;
  status: CaseStatus;
  estimatedMinutes: number;

  domains: string[];
  skills: string[];
  lifecycleStages: string[];
  technicalLayers: string[];
  environments: string[];
  riskTypes: string[];
  behaviorPatterns: string[];

  scenario: {
    customerProfile: string;
    background: string;
    initialIncident: string;
    constraints: string[];
    confirmedFacts: string[];
  };

  startNodeId: string;
  nodes: CaseNode[];

  debrief: CaseDebrief;

  metadata: {
    version: number;
    sourceType: string;
    sourceReferences?: string[];
    createdAt: string;
    reviewedAt?: string;
    applicableVersions?: string[];
    author: string;
    reviewer?: string;
  };
}
```

## 23.2 CaseNode

```ts
type NodeType =
  | "single-choice"
  | "multiple-choice"
  | "true-false"
  | "ordering"
  | "matching"
  | "evidence-conclusion"
  | "log-analysis"
  | "command-choice"
  | "diff-review"
  | "configuration-review"
  | "architecture-tradeoff"
  | "customer-response";

interface CaseNode {
  id: string;
  type: NodeType;
  title?: string;
  prompt: string;

  evidence: EvidenceItem[];

  options: CaseOption[];
  correctOptionIds: string[];

  feedback: {
    firstWrong: string;
    secondWrong: string;
    revealedAnswer: string;
  };

  scoring: {
    firstTry: number;
    secondTry: number;
    thirdTry: number;
    weight: number;
    criticalErrorOptionIds?: string[];
  };

  consequences?: {
    optionId: string;
    timeDelta?: number;
    costDelta?: number;
    trustDelta?: number;
    riskDelta?: number;
    message?: string;
  }[];

  next: {
    optionId?: string;
    nodeId: string;
  }[];
}
```

## 23.3 EvidenceItem

```ts
interface EvidenceItem {
  id: string;
  type:
    | "text"
    | "log"
    | "terminal"
    | "http"
    | "json"
    | "diff"
    | "config"
    | "metric"
    | "diagram"
    | "customer-message";
  title?: string;
  content: string;
  language?: string;
}
```

## 23.4 CaseOption

```ts
interface CaseOption {
  id: string;
  label: string;
  explanation: string;
  errorType?: string;
}
```

## 23.5 Attempt

```ts
interface CaseAttempt {
  id: string;
  caseId: string;
  startedAt: string;
  completedAt?: string;
  status: "in-progress" | "completed" | "abandoned";

  nodeAttempts: {
    nodeId: string;
    selectedOptionIds: string[];
    attemptCount: number;
    score: number;
    criticalError: boolean;
  }[];

  totalScore?: number;
  verdict?: string;
  criticalErrors: string[];
}
```

---

# 24. 题库覆盖审计

必须生成覆盖矩阵，不允许凭人工感觉判断是否完整。

## 24.1 Coverage Registry

每个领域、能力、难度和场景记录：

```text
planned
draft
reviewed
published
deprecated
```

## 24.2 覆盖状态

- 未覆盖
- 仅概念覆盖
- 部分场景覆盖
- 已覆盖
- 需要更新
- 高风险缺口

## 24.3 自动审计内容

脚本必须检测：

- ID 重复
- 缺少正确答案
- 缺少错误选项解析
- 分支不可达
- 死循环
- 没有终点
- 缺少技能标签
- 缺少版本号
- 缺少来源类型
- 缺少 reviewer
- 同领域缺少难度层级
- 高风险技能只有定义题
- 跨领域案件不足 40%
- 关键错误没有覆盖
- Deprecated 题仍出现在索引

## 24.4 第一版 Coverage Backlog

Codex 必须创建一个 338 个核心案件的覆盖清单。

每条至少包含：

- ID
- 题目标题
- 领域
- 难度
- 核心能力
- 生命周期阶段
- 技术层
- 风险
- 状态

第一阶段只实现 24 个案件，其余标记为 `planned`。

---

# 25. 内容质量标准

每个正式案件必须满足：

1. 场景真实。
2. 不依靠文字陷阱制造难度。
3. 正确答案唯一，或明确存在最优答案。
4. 所有干扰项都有现实依据。
5. 每个选项都有解析。
6. 明确当前证据能证明什么。
7. 明确哪些结论属于过度推断。
8. 包含排障优先级。
9. 包含修复与验证。
10. 高级题包含业务约束。
11. 安全题遵循最小权限。
12. 技术事实可验证。
13. 可能变化的产品行为标注版本。
14. 不编造命令。
15. 不编造不存在的 API。
16. 题目通过 Generator–Evaluator 审核。
17. 历史版本不可被静默覆盖。
18. 题目更新不得破坏历史答题记录。

---

# 26. 测试要求

## 26.1 单元测试

覆盖：

- 节点评分
- 多选部分得分
- 排序题评分
- Critical Error
- Mastery 更新
- 分支跳转
- 导入导出
- Repository
- Schema 校验
- Coverage 审计

## 26.2 组件测试

覆盖：

- 题目选项
- 自适应提示
- 日志与代码显示
- Diff 显示
- 移动端折叠
- 复盘路径
- 错题卡片

## 26.3 E2E 测试

至少覆盖：

1. 从首页进入案件库。
2. 打开案件。
3. 第一次答错。
4. 获得提示。
5. 第二次答对。
6. 完成案件。
7. 查看复盘。
8. 查看错题本。
9. 刷新后进度仍在。
10. 导出数据。
11. 清空数据。
12. 导入数据并恢复。

## 26.4 内容测试

每个案件必须通过：

- Schema
- Branch Reachability
- Unique ID
- Answer Validity
- Explanation Completeness
- Coverage Tags
- Version Metadata

---

# 27. 实施阶段

## Phase 0：初始化与设计

交付：

- 项目初始化
- Git
- README
- UI Skill 输出
- `docs/ui-design.md`
- `docs/architecture.md`
- 文件结构
- 测试框架
- CI
- Design Tokens

## Phase 1：核心领域模型

交付：

- Case Schema
- Node Schema
- Attempt
- Score
- Mastery
- Coverage
- Repository 接口
- IndexedDB 实现
- 内容校验脚本

## Phase 2：核心页面

交付：

- Dashboard
- 能力地图
- 案件库
- 训练页
- 复盘页
- 错题本
- 设置页

## Phase 3：题型引擎

交付：

- 单选
- 多选
- 判断
- 排序
- 匹配
- 证据结论
- 日志识读
- 命令选择
- Diff 审查
- 配置识读
- 架构权衡
- 客户沟通

## Phase 4：24 个 MVP 案件

交付：

- 12 个初级
- 8 个中级
- 4 个高级
- 完整解析
- 覆盖标签
- Evaluator 审查记录

## Phase 5：覆盖矩阵与内容后台基础

第一版不做可视化后台，但必须交付：

- 338 个核心案件 Backlog
- Coverage Registry
- Coverage Audit Report
- 缺口报告
- 内容编写指南
- 内容模板

## Phase 6：质量与验收

交付：

- 单元测试
- 组件测试
- E2E
- 类型检查
- lint
- build
- 性能检查
- 可访问性检查
- 移动端检查
- 最终 Diff Review

---

# 28. 验收标准

MVP 必须满足：

- 可本地启动。
- 可构建静态文件。
- 无需登录即可使用。
- 首页可进入案件库。
- 可筛选初、中、高级。
- 能完成连续分支案件。
- 首次答错不立即公布答案。
- 有分层提示。
- 有完整复盘。
- 每个错误选项有解析。
- 进度保存在 IndexedDB。
- 刷新后数据不丢。
- 有错题本。
- 有能力档案。
- 有关键错误机制。
- 有数据导入导出。
- 手机和电脑均可使用。
- 代码块和日志可读。
- UI 不像传统后台模板。
- 24 个案件全部通过内容校验。
- 338 个核心案件 Backlog 已建立。
- Coverage Audit 可运行。
- 单元测试通过。
- E2E 通过。
- lint 通过。
- typecheck 通过。
- build 通过。
- 浏览器控制台无严重错误。

---

# 29. Definition of Done

只有同时满足以下条件，才能宣布项目第一版完成：

1. 代码已实现。
2. 测试真实通过。
3. 构建真实通过。
4. 24 个案件可完整作答。
5. 题目分支没有死路。
6. 所有答案有解析。
7. 进度可持久化。
8. 数据可导出和导入。
9. 移动端可用。
10. 338 个案件覆盖清单已生成。
11. 覆盖矩阵可以识别缺口。
12. 文档完整。
13. 没有未说明的 TODO。
14. 没有用假数据冒充已实现功能。
15. 最终报告如实说明剩余工作。

---

# 30. 最终交付物

Codex 最终必须交付：

- 完整源代码
- README
- 产品规格
- UI 设计文档
- 架构文档
- 内容编写规范
- 题目 JSON Schema
- 24 个 MVP 案件
- 338 个核心案件 Backlog
- Coverage Registry
- Coverage Audit 脚本
- 内容校验脚本
- 单元测试
- E2E 测试
- 构建产物
- 导入导出说明
- 后续公开部署说明
- 最终测试报告
- 未完成项清单

---

# 31. Codex 开始执行

阅读完本文后，请直接执行：

1. 检查当前目录是否已有项目。
2. 如果目录为空，初始化新项目。
3. 创建 `docs/product-spec.md`，内容使用本文。
4. 调用 UI / UX / Frontend Design Skill。
5. 创建 UI 设计文档。
6. 创建架构文档。
7. 创建实施任务清单。
8. 完成 Phase 0。
9. 按阶段继续实现。
10. 每完成一个阶段，运行验证并记录结果。
11. 遇到非阻塞性设计问题时，自主选择最合理方案，不要反复询问用户。
12. 只有出现以下硬性阻塞时才提问：
    - 无法访问必要文件
    - 需要真实密钥
    - 需要用户决定不可逆范围
    - 现有项目存在严重冲突
13. 其余情况直接推进。

> 项目的最终标准不是“页面能打开”，而是：题库架构能够持续覆盖 FDE 真实工作，训练用户基于证据、优先级和风险控制解决问题。
