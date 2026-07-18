# FDE Case JSON 模板

下面是一份与当前 `schemaVersion: 1` 对齐的完整 `beginner` 示例。它包含全部必填字段和两个决策节点，可复制后替换内容。

使用前：

1. 先分配永久稳定的 Case、Node、Option、Evidence ID。
2. 只使用 `content/domains/` 与 `content/skills/` 中 `status: active` 的 Domain 与 Skill ID；[SKILL_TAXONOMY.md](./SKILL_TAXONOMY.md) 仅作人工阅读摘要。
3. 初稿保持 `status: draft`、`reviewedAt: null`、`reviewer: null`。
4. 不要在 JSON 中添加注释或 Schema 未定义字段。
5. 示例场景是合成且虚构的，不应替换为真实客户材料。

```json
{
  "schemaVersion": 1,
  "id": "rag-access-control-drift-001",
  "slug": "rag-access-control-drift-001",
  "title": "检索结果出现跨租户文档",
  "summary": "调查一次虚构企业知识检索中的访问范围异常，并选择安全处置与客户沟通方式。",
  "level": "beginner",
  "status": "draft",
  "estimatedMinutes": 15,
  "domains": ["rag-search"],
  "skills": ["rag.search"],
  "lifecycleStages": ["operate", "incident-response"],
  "technicalLayers": ["retrieval", "application"],
  "environments": ["staging"],
  "riskTypes": ["privacy", "customer-trust"],
  "behaviorPatterns": [
    "evidence-before-action",
    "minimum-safe-mitigation",
    "transparent-communication"
  ],
  "scenario": {
    "customerProfile": "一家虚构的多租户文档协作平台，员工通过企业搜索查找各自组织内的政策文件。",
    "background": "团队刚把检索请求从旧网关迁移到新的查询服务。嵌入模型、向量索引和文档权限数据均未变更。",
    "initialIncident": "测试租户 Northwind 的一名用户报告，搜索结果摘要中出现了标记为 Southridge 租户的文档标题。",
    "constraints": [
      "不得查看或复制报告中涉及的完整文档正文。",
      "可以临时关闭受影响的搜索路由，但不能停止整个平台。",
      "需要在 30 分钟内向客户提供已确认事实和下一次更新时间。"
    ],
    "confirmedFacts": [
      "异常发生在新的查询服务路径。",
      "旧网关执行相同查询时没有返回跨租户结果。",
      "当前没有证据表明源文档权限数据被修改。"
    ]
  },
  "startNodeId": "rag-access-control-drift-001-node-01",
  "nodes": [
    {
      "id": "rag-access-control-drift-001-node-01",
      "type": "log-analysis",
      "title": "选择第一项安全行动",
      "prompt": "结合请求日志与配置快照，下一步最合适的行动是什么？",
      "skillWeights": {
        "rag.search": 1
      },
      "evidence": [
        {
          "id": "rag-access-control-drift-001-node-01-evidence-01",
          "type": "log",
          "title": "新查询服务请求日志",
          "content": "requestId=req-1042 userTenant=northwind metadataFilter=null resultTenants=[northwind,southridge]",
          "language": "text"
        },
        {
          "id": "rag-access-control-drift-001-node-01-evidence-02",
          "type": "config",
          "title": "查询路由配置快照",
          "content": "{\n  \"route\": \"new-query-service\",\n  \"tenantFilterSource\": \"request-context\",\n  \"fallbackWhenMissing\": \"unfiltered\"\n}",
          "language": "json"
        }
      ],
      "options": [
        {
          "id": "rag-access-control-drift-001-node-01-option-a",
          "label": "临时关闭新查询路由并保留最小必要的请求诊断信息，然后验证租户过滤上下文",
          "explanation": "日志已经显示过滤条件缺失且返回跨租户结果；隔离受影响路径可以立即降低隐私风险，同时保留验证根因所需的最小信息。",
          "errorType": "none"
        },
        {
          "id": "rag-access-control-drift-001-node-01-option-b",
          "label": "立即重建全部向量索引，完成前保持新查询路由开放",
          "explanation": "现有证据指向请求过滤上下文，而不是索引损坏；重建索引影响面大、耗时长，并让跨租户风险继续存在。",
          "errorType": "unsupported-large-remediation"
        },
        {
          "id": "rag-access-control-drift-001-node-01-option-c",
          "label": "导出所有异常结果的完整文档正文进行人工比对",
          "explanation": "导出正文违反最小数据访问约束，并会扩大潜在隐私事件的暴露面；当前日志已足以先隔离路径并验证过滤条件。",
          "errorType": "excessive-sensitive-data-access"
        }
      ],
      "answer": {
        "correctOptionId": "rag-access-control-drift-001-node-01-option-a"
      },
      "feedback": {
        "firstWrong": "先区分已经被证据支持的故障层，并考虑哪项行动能最快缩小暴露面。",
        "secondWrong": "请求日志明确显示 metadataFilter=null；同时注意题目禁止查看或复制完整文档。",
        "revealedAnswer": "应先关闭受影响的新查询路由，保留最小诊断信息，并验证租户过滤上下文。这样先控制隐私风险，再针对证据所指向的过滤缺失进行修复。"
      },
      "scoring": {
        "firstTry": 100,
        "secondTry": 60,
        "thirdTry": 30,
        "weight": 1,
        "criticalErrorOptionIds": [
          "rag-access-control-drift-001-node-01-option-c"
        ]
      },
      "consequences": [
        {
          "optionId": "rag-access-control-drift-001-node-01-option-a",
          "timeDelta": 10,
          "trustDelta": 1,
          "riskDelta": -2,
          "message": "受影响路径被隔离，团队可以在不扩大数据访问的情况下验证过滤上下文。"
        },
        {
          "optionId": "rag-access-control-drift-001-node-01-option-b",
          "timeDelta": 45,
          "costDelta": 2,
          "riskDelta": 2,
          "message": "团队开始了缺乏证据支持的大范围操作，受影响路径仍开放。"
        },
        {
          "optionId": "rag-access-control-drift-001-node-01-option-c",
          "trustDelta": -3,
          "riskDelta": 4,
          "message": "不必要的数据导出扩大了潜在隐私事件。"
        }
      ],
      "branches": [
        {
          "key": "correct",
          "nextNodeId": "rag-access-control-drift-001-node-02"
        },
        {
          "key": "incorrect",
          "nextNodeId": "rag-access-control-drift-001-node-02"
        },
        {
          "key": "critical",
          "nextNodeId": "rag-access-control-drift-001-node-02"
        }
      ]
    },
    {
      "id": "rag-access-control-drift-001-node-02",
      "type": "customer-response",
      "title": "发送第一次客户更新",
      "prompt": "在根因验证仍在进行时，应如何向客户更新？",
      "skillWeights": {
        "rag.search": 1
      },
      "evidence": [
        {
          "id": "rag-access-control-drift-001-node-02-evidence-01",
          "type": "customer-message",
          "title": "客户询问",
          "content": "请确认目前已知影响、你们采取了什么措施，以及下一次更新时间。"
        },
        {
          "id": "rag-access-control-drift-001-node-02-evidence-02",
          "type": "text",
          "title": "当前调查状态",
          "content": "已确认新查询路径可能在过滤上下文缺失时返回其他租户的标题。该路径已关闭；完整影响范围和根因仍在验证。"
        }
      ],
      "options": [
        {
          "id": "rag-access-control-drift-001-node-02-option-a",
          "label": "说明已确认现象、已完成的隔离措施、尚未确认的范围，并承诺具体的下一次更新时间",
          "explanation": "该回复区分事实与未知项，说明风险控制措施，并给客户一个可验证的后续承诺。",
          "errorType": "none"
        },
        {
          "id": "rag-access-control-drift-001-node-02-option-b",
          "label": "宣布根因已经是向量索引损坏，并保证没有任何数据风险",
          "explanation": "现有证据不支持索引损坏，也尚未完成影响范围确认；过早保证会损害信任。",
          "errorType": "premature-root-cause-claim"
        },
        {
          "id": "rag-access-control-drift-001-node-02-option-c",
          "label": "只回复团队正在调查，等根因完全确认后再提供其他信息",
          "explanation": "这省略了已确认影响、已采取措施和下一次更新时间，无法满足客户对风险管理的合理需求。",
          "errorType": "incomplete-customer-update"
        }
      ],
      "answer": {
        "correctOptionId": "rag-access-control-drift-001-node-02-option-a"
      },
      "feedback": {
        "firstWrong": "客户需要的是已确认事实、当前保护措施、未知项和下一次承诺，而不是未经证实的结论。",
        "secondWrong": "把“可能返回跨租户标题”“路径已关闭”“范围仍在验证”分别归入事实、措施和未知项。",
        "revealedAnswer": "应透明说明已确认现象和隔离措施，明确影响范围仍在验证，并给出具体下一次更新时间。"
      },
      "scoring": {
        "firstTry": 100,
        "secondTry": 60,
        "thirdTry": 30,
        "weight": 1,
        "criticalErrorOptionIds": []
      },
      "branches": [
        {
          "key": "correct",
          "nextNodeId": null
        },
        {
          "key": "incorrect",
          "nextNodeId": null
        }
      ]
    }
  ],
  "debrief": {
    "summary": "新查询路径在租户过滤上下文缺失时采用了未过滤回退，造成跨租户标题暴露风险。正确处理先隔离受影响路径，再验证过滤上下文，并向客户区分事实、未知项和后续承诺。",
    "rootCause": "查询路由允许在租户过滤上下文缺失时执行未过滤检索。",
    "correctApproach": [
      "关闭受影响的新查询路由并保留最小必要诊断信息。",
      "验证请求上下文到 metadata filter 的传递和缺失时的失败关闭行为。",
      "使用合成租户数据测试跨租户隔离。",
      "按约定时间向客户更新已确认范围、修复状态和验证结果。"
    ],
    "keyLessons": [
      "权限过滤必须失败关闭，不能在上下文缺失时回退到未过滤查询。",
      "先控制暴露面，再执行与证据匹配的诊断。",
      "客户更新要明确区分事实、假设和未知项。"
    ],
    "interviewerPerspective": "观察候选人是否依据证据缩小故障层、优先采取可逆隔离措施，并避免未经验证的根因声明。",
    "customerRiskPerspective": "错误处置可能扩大隐私暴露并损害客户信任；透明、限时的更新有助于客户管理自身风险。",
    "remediation": [
      "将缺失租户上下文的行为改为拒绝查询。",
      "为查询服务增加租户过滤契约测试和跨租户回归测试。",
      "为 metadata filter 缺失建立告警。"
    ],
    "verification": [
      "确认缺失租户上下文的请求被拒绝。",
      "确认合成租户只能检索自身文档。",
      "确认旧网关和新查询服务的过滤结果一致。",
      "确认告警能捕获过滤上下文缺失。"
    ],
    "knowledgePoints": [
      "RAG metadata filtering",
      "fail-closed authorization",
      "incident containment",
      "evidence-based customer communication"
    ]
  },
  "metadata": {
    "version": 1,
    "sourceType": "synthetic-deidentified",
    "createdAt": "2026-07-13T00:00:00.000Z",
    "reviewedAt": null,
    "applicableVersions": [],
    "author": "replace-with-author",
    "reviewer": null
  }
}
```

完成替换后至少运行 `npm run content:validate` 和 `npm run content:quality`，再生成索引并进行 coverage 审计。

## 字段使用提醒

- 顶层数组 `domains`、`skills`、`lifecycleStages`、`technicalLayers`、`environments`、`riskTypes`、`behaviorPatterns` 均至少需要一个非空字符串。
- 每个节点至少需要一个 Option；Evidence 和 Branch 数组在 Schema 上可以为空，但正式案件必须有足够证据和合法路径。
- `consequences`、Evidence 的 `title`/`language`、Option 的 `errorType`、`sourceReferences` 和 `recommendedCaseIds` 是可选字段。
- `criticalErrorOptionIds` 可省略；若提供，可以是空数组，但每个 ID 必须属于本节点。
- `ordering` 答案必须恰好包含全部 Option 一次；`matching` 中每个 Option 必须恰好参与一个 pair。
- `reviewed`、`published` 或 `deprecated` 必须把 `reviewedAt` 与 `reviewer` 同时改为有效非空值。
- 本模板的 `author` 是待替换占位符，不能直接发布。
