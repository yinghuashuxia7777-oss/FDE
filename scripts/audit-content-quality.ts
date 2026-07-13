import type {
  DomainDefinition,
  SkillDefinition,
} from '../src/content/contracts';
import {
  compareContentIssues,
  type ContentIssue,
} from '../src/content/validate-case-graph';

import { parseCliArgs } from './cli';
import {
  emitJsonReport,
  isDirectRun,
  printCliError,
  PROJECT_ROOT,
  readContentBundleSources,
  resolveSafeProjectPath,
  writeCliReport,
} from './files';
import {
  type ContentBundleTextSources,
  type ValidatedCaseSource,
  validateContentBundleSources,
} from './validate-content';

const MINIMUM_NODE_COUNT = {
  beginner: 2,
  intermediate: 3,
  advanced: 4,
} as const;

const PLACEHOLDER_PATTERN =
  /(?:\b(?:todo|tbd|placeholder|replace(?:-with)?|xxx+)\b|待补充|待填写|请填写|占位|暂无)/i;
const TERMINOLOGY_PROMPT_PATTERN =
  /^\s*(?:define\b|(?:what|which)\s+(?:(?:is|are)\s+)?(?:the\s+)?(?:best\s+)?(?:definition|meaning|term|concept|principles?)\b|什么是|请定义|解释(?:一下)?.{0,24}(?:术语|概念)|.{1,40}是什么意思)/i;
const DECISION_PROMPT_PATTERN =
  /(?:\b(?:should|next|best|which action|how would|what would|choose|decide|respond|diagnose|verify|remediate)\b|应|应该|哪|如何|怎样|下一步|第一项|最合适|最能|证据链|行动|方案|处置|处理|判断|修复|验证|发布|结论|决定|选择)/i;
const CAUSAL_EXPLANATION_PATTERN =
  /(?:\b(?:because|therefore|since|thus|hence|so|while|evidence|risk|constraint|otherwise|causes?|leads?|prevents?|preserves?|exposes?|ignores?|removes?|addresses?|follows?|supports?|establishes?|verifies?|avoids?|blocks?|reduces?|increases?|breaks?|retains?|restores?|fails?|cannot|without)\b|由于|因为|因此|从而|导致|证明|证据|风险|约束|否则|同时|但是|不改变|不能替代|说明|表明|显示|支持|避免|防止|阻止|保留|恢复|修复|暴露|忽略|无法|不能|不会|移除|消除|降低|提高|保证|提供|建立|满足|使|让|依赖|代表|缺少|缺失|难以|扩大|放大|破坏|确保|区分|捕获|覆盖|验证|回滚|隔离|拒绝|失去|丢失|绕过|替代|违反|形成|造成|等于|改变|中断|移出|掩盖|看不到|问题是|会)/i;
const ROOT_CAUSE_MECHANISM_PATTERN =
  /(?:\b(?:because|due\s+to|caused?\s+by|causes?|led\s+to|leads?\s+to|resulted?\s+in|results?\s+in|failed?\s+to|did\s+not|does\s+not|missing|absent|stale|mismatch|incorrect|misconfigured|bypass(?:ed)?|overload|race|changed|without)\b|由于|因为|导致|造成|使|源于|缺失|缺少|没有|未|错误|不一致|不匹配|过期|竞态|绕过|覆盖|超时|回退|优先于|替代|误当|丢失|变为|不代表|不包含|不读取|不约束|依赖|允许|假设|遗留)/i;
const CORRECTIVE_ACTION_PATTERN =
  /(?:\b(?:add|remove|implement|configure|enforce|restore|update|deploy|create|establish|migrate|rotate|invalidate|reject|block|pin|limit|bound|split|refactor|replace|define|document|instrument|monitor|require|prohibit|enable|disable|isolate|fix|test|integrate|version|store|persist|route|contain|verify)\b|建立|增加|实现|实施|配置|删除|移除|替代|替换|改为|修复|统一|定义|强制|限制|禁止|禁用|部署|升级|引入|拆分|重构|编写|监控|明确|记录|产品化|申请|批准|签发|修改|恢复|运行|执行|验证|核对|比较|修正|隔离|重放|对账|构建|暂停|保留|阻断|关闭|拒绝|绑定|传播|旁路|清除|收紧|停止|通知|冻结|量化|快照|设计|保持|新增|渐进|失效|触发|撤销|回滚|观察|确认|报告|设置|登记|处理|验签|返回|暴露|决定|扩大|推广|转化|分析|说明|加入|纳入|要求|审查|显示|包含|移入)/i;
const OBSERVABLE_VERIFICATION_PATTERN =
  /(?:\b(?:confirm|verify|assert|observe|measure|compare|replay|simulate|inject|exercise|reproduce|inspect|reconcile|return|reject|succeed|fail|rate|latency|count|threshold|baseline|hash|status)\w*\b|确认|验证|观察|测量|比较|核对|重放|模拟|注入|压测|演练|测试|检查|复现|记录|签署|返回|拒绝|成功|失败|错误率|延迟|计数|阈值|指标|哈希|一致|不含|不存在|为零|恢复|命中|解析|满足|低于|高于|正常|不变|未增加|调用数)/i;

export interface ContentQualityReport {
  casesChecked: number;
  issues: ContentIssue[];
}

function isSubstantive(value: string, minimumLength: number): boolean {
  const normalized = value.trim();
  return (
    normalized.length >= minimumLength && !PLACEHOLDER_PATTERN.test(normalized)
  );
}

function issue(
  file: string,
  path: (string | number)[],
  code: string,
  message: string,
): ContentIssue {
  return { file, path, code, message };
}

function auditCaseScenario(source: ValidatedCaseSource): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const scenarioFields = [
    ['customerProfile', source.case.scenario.customerProfile],
    ['background', source.case.scenario.background],
    ['initialIncident', source.case.scenario.initialIncident],
  ] as const;

  scenarioFields.forEach(([field, value]) => {
    if (isSubstantive(value, 20)) return;
    issues.push(
      issue(
        source.file,
        ['scenario', field],
        'scenario_content_insufficient',
        `Scenario field ${field} must contain substantive incident context.`,
      ),
    );
  });

  if (
    source.case.scenario.constraints.length < 2 ||
    source.case.scenario.constraints.some((value) => !isSubstantive(value, 8))
  ) {
    issues.push(
      issue(
        source.file,
        ['scenario', 'constraints'],
        'insufficient_scenario_constraints',
        'Scenario must contain at least two substantive constraints.',
      ),
    );
  }
  if (
    source.case.scenario.confirmedFacts.length < 2 ||
    source.case.scenario.confirmedFacts.some(
      (value) => !isSubstantive(value, 8),
    )
  ) {
    issues.push(
      issue(
        source.file,
        ['scenario', 'confirmedFacts'],
        'insufficient_confirmed_facts',
        'Scenario must contain at least two substantive confirmed facts.',
      ),
    );
  }
  return issues;
}

function auditCaseNodes(source: ValidatedCaseSource): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const evidenceTypes = new Set<string>();

  source.case.nodes.forEach((node, nodeIndex) => {
    if (node.evidence.length < 2) {
      issues.push(
        issue(
          source.file,
          ['nodes', nodeIndex, 'evidence'],
          'insufficient_node_evidence',
          `Node ${node.id} must contain at least two evidence items.`,
        ),
      );
    }
    node.evidence.forEach((evidence, evidenceIndex) => {
      evidenceTypes.add(evidence.type);
      if (isSubstantive(evidence.content, 8)) return;
      issues.push(
        issue(
          source.file,
          ['nodes', nodeIndex, 'evidence', evidenceIndex, 'content'],
          'placeholder_evidence_content',
          `Evidence ${evidence.id} must contain substantive, non-placeholder content.`,
        ),
      );
    });

    if (
      !isSubstantive(node.prompt, 10) ||
      TERMINOLOGY_PROMPT_PATTERN.test(node.prompt) ||
      !DECISION_PROMPT_PATTERN.test(node.prompt)
    ) {
      issues.push(
        issue(
          source.file,
          ['nodes', nodeIndex, 'prompt'],
          'non_decision_prompt',
          `Node ${node.id} must ask for a contextual decision, not terminology recall.`,
        ),
      );
    }

    if (node.options.length < 3) {
      issues.push(
        issue(
          source.file,
          ['nodes', nodeIndex, 'options'],
          'insufficient_node_options',
          `Node ${node.id} must provide at least three decision options.`,
        ),
      );
    }
    node.options.forEach((option, optionIndex) => {
      if (
        isSubstantive(option.explanation, 20) &&
        CAUSAL_EXPLANATION_PATTERN.test(option.explanation)
      ) {
        return;
      }
      issues.push(
        issue(
          source.file,
          ['nodes', nodeIndex, 'options', optionIndex, 'explanation'],
          'option_explanation_insufficient',
          `Option ${option.id} needs a substantive causal explanation.`,
        ),
      );
    });
  });

  if (evidenceTypes.size < 2) {
    issues.push(
      issue(
        source.file,
        ['nodes'],
        'insufficient_evidence_type_diversity',
        'Case must use at least two complementary evidence types.',
      ),
    );
  }
  return issues;
}

function auditCaseDefinitions(
  source: ValidatedCaseSource,
  registeredDomainIds: ReadonlySet<string>,
  registeredSkillIds: ReadonlySet<string>,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const usedSkillIds = new Set(
    source.case.nodes.flatMap((node) => Object.keys(node.skillWeights)),
  );

  source.case.domains.forEach((domainId, index) => {
    if (registeredDomainIds.has(domainId)) return;
    issues.push(
      issue(
        source.file,
        ['domains', index],
        'unregistered_domain',
        `Case domain is not registered: ${domainId}.`,
      ),
    );
  });
  source.case.skills.forEach((skillId, index) => {
    if (!registeredSkillIds.has(skillId)) {
      issues.push(
        issue(
          source.file,
          ['skills', index],
          'unregistered_skill',
          `Case skill is not registered: ${skillId}.`,
        ),
      );
    }
    if (!usedSkillIds.has(skillId)) {
      issues.push(
        issue(
          source.file,
          ['skills', index],
          'unused_case_skill',
          `Declared case skill is not used by any node: ${skillId}.`,
        ),
      );
    }
  });
  return issues;
}

function auditDebriefList(
  source: ValidatedCaseSource,
  field: 'correctApproach' | 'remediation' | 'verification',
  code: string,
  semanticPattern: RegExp,
  semanticLabel: string,
): ContentIssue[] {
  const values = source.case.debrief[field];
  if (
    values.length >= 2 &&
    values.every(
      (value) => isSubstantive(value, 8) && semanticPattern.test(value.trim()),
    )
  ) {
    return [];
  }
  return [
    issue(
      source.file,
      ['debrief', field],
      code,
      `Debrief ${field} must contain at least two substantive ${semanticLabel}.`,
    ),
  ];
}

function auditCaseDebrief(source: ValidatedCaseSource): ContentIssue[] {
  const issues: ContentIssue[] = [];
  if (
    !isSubstantive(source.case.debrief.rootCause, 20) ||
    !ROOT_CAUSE_MECHANISM_PATTERN.test(source.case.debrief.rootCause)
  ) {
    issues.push(
      issue(
        source.file,
        ['debrief', 'rootCause'],
        'root_cause_insufficient',
        'Debrief rootCause must explain the substantive causal mechanism.',
      ),
    );
  }
  issues.push(
    ...auditDebriefList(
      source,
      'correctApproach',
      'insufficient_correct_approach',
      CORRECTIVE_ACTION_PATTERN,
      'corrective actions',
    ),
    ...auditDebriefList(
      source,
      'remediation',
      'insufficient_remediation',
      CORRECTIVE_ACTION_PATTERN,
      'corrective actions',
    ),
    ...auditDebriefList(
      source,
      'verification',
      'insufficient_verification',
      OBSERVABLE_VERIFICATION_PATTERN,
      'observable verification outcomes',
    ),
  );
  return issues;
}

function auditCaseLevel(source: ValidatedCaseSource): ContentIssue[] {
  const level = source.case.level;
  const supportedLevel = level in MINIMUM_NODE_COUNT;
  const requiredNodes = supportedLevel
    ? MINIMUM_NODE_COUNT[level as keyof typeof MINIMUM_NODE_COUNT]
    : MINIMUM_NODE_COUNT.advanced;
  const issues: ContentIssue[] = [];

  if (!supportedLevel) {
    issues.push(
      issue(
        source.file,
        ['level'],
        'unsupported_level',
        `Only beginner, intermediate, and advanced quality levels are supported; received ${level}.`,
      ),
    );
  }
  if (source.case.nodes.length < requiredNodes) {
    issues.push(
      issue(
        source.file,
        ['nodes'],
        'insufficient_decision_nodes',
        `Level ${level} requires at least ${requiredNodes} decision nodes.`,
      ),
    );
  }
  return issues;
}

export function auditContentQuality(
  cases: readonly ValidatedCaseSource[],
  domains: readonly DomainDefinition[],
  skills: readonly SkillDefinition[],
): ContentQualityReport {
  const registeredDomainIds = new Set(
    domains.filter(({ status }) => status === 'active').map(({ id }) => id),
  );
  const registeredSkillIds = new Set(
    skills.filter(({ status }) => status === 'active').map(({ id }) => id),
  );
  const issues = cases.flatMap((source) => [
    ...auditCaseLevel(source),
    ...auditCaseScenario(source),
    ...auditCaseNodes(source),
    ...auditCaseDefinitions(source, registeredDomainIds, registeredSkillIds),
    ...auditCaseDebrief(source),
  ]);

  return {
    casesChecked: cases.length,
    issues: issues.sort(compareContentIssues),
  };
}

function scopeBundleConfigToSelectedCases(
  sources: ContentBundleTextSources,
): ContentBundleTextSources {
  return { ...sources, partial: true };
}

export function runContentQualityCli(args: readonly string[]): number {
  try {
    const options = parseCliArgs(args, {
      dryRun: true,
      limit: true,
      input: true,
      output: true,
    });
    const bundleSources = readContentBundleSources(PROJECT_ROOT, {
      ...(options.input === undefined ? {} : { casesInput: options.input }),
      ...(options.limit === undefined ? {} : { limit: options.limit }),
    });
    const validation = validateContentBundleSources(
      options.input === undefined && options.limit === undefined
        ? bundleSources
        : scopeBundleConfigToSelectedCases(bundleSources),
    );
    const quality = auditContentQuality(
      validation.cases,
      validation.domains.map(({ value }) => value),
      validation.skills.map(({ value }) => value),
    );
    const issues = [...validation.issues, ...quality.issues].sort(
      compareContentIssues,
    );
    const report = {
      ok: issues.length === 0,
      casesChecked: validation.cases.length,
      validDomains: validation.domains.length,
      validSkills: validation.skills.length,
      validationIssueCount: validation.issues.length,
      qualityIssueCount: quality.issues.length,
      issues,
    };
    const output =
      options.output === undefined
        ? undefined
        : resolveSafeProjectPath(PROJECT_ROOT, options.output);
    const content = emitJsonReport(report, {
      dryRun: options.dryRun,
      output,
    });
    writeCliReport(content, report.ok);
    return report.ok ? 0 : 1;
  } catch (error) {
    return printCliError(error);
  }
}

if (isDirectRun(import.meta.url)) {
  process.exitCode = runContentQualityCli(process.argv.slice(2));
}
