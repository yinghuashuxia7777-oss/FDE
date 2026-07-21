import type { CaseRepository, CaseSummary } from '../repositories/contracts';
import type {
  CaseNode,
  Evidence,
  FdeCase,
  Option,
} from '../domain/cases/types';
import type { ConceptKnowledge } from '../domain/concepts/types';
import type {
  FoundationKnowledge,
  FoundationKnowledgeContent,
} from '../domain/foundation/types';
import type { Language } from './index';

const HAN_PATTERN = /[\u3400-\u9fff]/u;
const HAN_PATTERN_GLOBAL = /[\u3400-\u9fff]+/gu;
const CJK_PUNCTUATION_PATTERN = /[，。；：！？、【】（）《》“”‘’]/gu;

const acronymLabels: Readonly<Record<string, string>> = {
  ai: 'AI',
  api: 'API',
  cli: 'CLI',
  cors: 'CORS',
  cpu: 'CPU',
  dns: 'DNS',
  etl: 'ETL',
  fde: 'FDE',
  gpu: 'GPU',
  html: 'HTML',
  http: 'HTTP',
  https: 'HTTPS',
  id: 'ID',
  json: 'JSON',
  jwt: 'JWT',
  k8s: 'Kubernetes',
  llm: 'LLM',
  oauth: 'OAuth',
  pii: 'PII',
  rag: 'RAG',
  sla: 'SLA',
  slo: 'SLO',
  sql: 'SQL',
  tcp: 'TCP',
  tls: 'TLS',
  url: 'URL',
};

interface FoundationEnglishCopy {
  title: string;
  content: FoundationKnowledgeContent;
}

const foundationEnglishOverrides: Readonly<
  Record<string, FoundationEnglishCopy>
> = {
  'api-basic': {
    title: 'API Basics: Verifiable Contracts Between Systems',
    content: {
      simpleExplanation:
        'An API is a documented boundary that lets two systems exchange requests and results in a predictable way.',
      analogy:
        'Think of an API as a service counter: the menu defines what you may request, the required information, and the result you receive.',
      technicalExplanation:
        'A reliable API contract defines inputs, outputs, authentication, errors, compatibility rules, and observable behavior. Connectivity alone does not prove that the contract is satisfied.',
      example:
        'A customer application sends a valid request to create an order, receives a stable response schema, and can distinguish validation errors from temporary service failures.',
      commonMistakes:
        'Common mistakes include treating an endpoint as the entire contract, ignoring error behavior, and changing fields without considering existing clients.',
    },
  },
  'api.webhook-idempotency': {
    title: 'Webhooks and Idempotency: Safely Handling Duplicate Events',
    content: {
      simpleExplanation:
        'A webhook is an HTTP call pushed by an external system. Senders normally retry when acknowledgement is late, so receivers must treat duplicate delivery as expected behavior.',
      analogy:
        'A webhook is like registered mail. The sender may send the same letter again when no receipt arrives, while the recipient records the tracking number instead of performing the same action twice.',
      technicalExplanation:
        'The receiver validates the signature and time window, records a stable event ID in a durable idempotency ledger, acknowledges quickly, and processes side effects through a recoverable worker.',
      example:
        'A fulfillment service receives the same payment event twice after a timeout. A unique event ID ensures that both deliveries resolve to one fulfillment result.',
      commonMistakes:
        'In-memory deduplication does not survive restarts or multiple instances. Faster responses reduce retries but cannot replace durable idempotency and signature validation.',
    },
  },
  'http.method-semantics': {
    title: 'HTTP Method Semantics: Put Business Intent in the Correct Action',
    content: {
      simpleExplanation:
        'HTTP methods communicate whether a caller intends to read, create, replace, partially update, or delete a resource.',
      analogy:
        'Methods are verbs on a work order. The resource may be the same, but inspect, create, replace, edit, and remove lead to different operational expectations.',
      technicalExplanation:
        'Method semantics influence safety, idempotency, caching, retries, authorization, and intermediary behavior. A request that reaches the server can still violate the contract when it uses the wrong method.',
      example:
        'A client uses GET for retrieval, POST for creation, PUT for full replacement, PATCH for partial change, and DELETE for removal while handling retries according to each contract.',
      commonMistakes:
        'Do not choose methods only because a framework makes them convenient. Avoid side effects in safe reads and document idempotency and retry behavior explicitly.',
    },
  },
};

const conceptEnglishOverrides: Readonly<
  Record<
    string,
    Omit<
      ConceptKnowledge,
      | 'schemaVersion'
      | 'id'
      | 'type'
      | 'category'
      | 'order'
      | 'relatedFoundation'
      | 'relatedCases'
    >
  >
> = {
  'concept.api': {
    title: 'API: A Verifiable Collaboration Boundary Between Systems',
    technicalTerm: 'API',
    simpleExplanation:
      'An API is the boundary where two systems agree how to exchange a request and its result.',
    analogy:
      'It works like a restaurant menu: it states what can be ordered, how to order it, and what will be returned.',
    technicalExplanation:
      'An API contract defines inputs, outputs, errors, authorization, compatibility, and observable behavior.',
    whyItMatters:
      'FDE work often requires locating whether a failure belongs to the customer system, the product, or the contract between them.',
    commonMistakes:
      'Successful connectivity does not prove that the business contract, permissions, or failure behavior are correct.',
  },
  'concept.webhook': {
    title: 'Webhook: An Event-Driven Reverse API Call',
    technicalTerm: 'Webhook',
    simpleExplanation:
      'A webhook lets one system notify another by sending an HTTP request when an event occurs.',
    analogy:
      'It is like registered mail: if the receipt is missing, the sender may deliver the same tracked letter again.',
    technicalExplanation:
      'Webhook receivers authenticate the sender, validate freshness, acknowledge within the provider timeout, and process events through recoverable, idempotent handling.',
    whyItMatters:
      'Production integrations must remain correct when delivery is delayed, duplicated, reordered, or retried.',
    commonMistakes:
      'Do not assume one event produces one request, and do not perform irreversible work before durable deduplication.',
  },
  'concept.idempotency': {
    title: 'Idempotency: Repeated Requests Produce One Business Effect',
    technicalTerm: 'Idempotency',
    simpleExplanation:
      'An idempotent operation can receive the same request more than once without repeating its business side effect.',
    analogy:
      'A ticket scanner records the ticket ID: scanning it again shows the existing result instead of admitting a second person.',
    technicalExplanation:
      'A stable idempotency key, durable state, atomic writes, and a stored result make retries safe under concurrency and process restarts.',
    whyItMatters:
      'Networks lose responses and providers retry, so idempotency protects data integrity, money, inventory, and customer trust.',
    commonMistakes:
      'A short-lived memory cache or a longer timeout cannot replace a durable uniqueness boundary.',
  },
};

const caseEnglishOverrides: Readonly<
  Record<string, { title: string; summary: string; scenarioSummary: string }>
> = {
  'api-webhook-idempotency-001': {
    title: 'Webhook Retries Cause Duplicate Fulfillment',
    summary:
      'Diagnose duplicate webhook delivery and design signature validation, a durable idempotency ledger, and recoverable processing.',
    scenarioSummary:
      'The same payment event created two fulfillment jobs after the provider retried a timed-out webhook request.',
  },
};

export function containsHan(value: string): boolean {
  return HAN_PATTERN.test(value);
}

function humanizeIdentifier(value: string): string {
  const normalized = value
    .replace(/\.v\d+$/u, '')
    .replace(/-\d{3}$/u, '')
    .split(/[._/-]+/u)
    .filter((word) => word !== 'concept' && word !== 'foundation')
    .map((word) => {
      const lower = word.toLocaleLowerCase();
      return (
        acronymLabels[lower] ??
        `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`
      );
    });
  return normalized.join(' ') || 'Engineering Topic';
}

function foundationTemplate(item: FoundationKnowledge): FoundationEnglishCopy {
  const topic = humanizeIdentifier(item.id);
  const scope =
    item.track === 'ai-basics'
      ? 'AI application behavior, evaluation, and operational controls'
      : item.track === 'network-api'
        ? 'requests, contracts, failures, and recovery across system boundaries'
        : 'how software is built, executed, observed, and maintained';
  return {
    title: `${topic}: Engineering Foundation`,
    content: {
      simpleExplanation: `${topic} is a foundational engineering concept for reasoning about ${scope}.`,
      analogy: `Treat ${topic} as a clearly labeled component in a working system: its boundary, inputs, outputs, and failure modes must remain understandable to every operator.`,
      technicalExplanation: `Engineers use ${topic} to define observable behavior, explicit contracts, controlled failure handling, and verification criteria before a change reaches production.`,
      example: `In an AI product, a team identifies the ${topic} boundary, records the relevant evidence, applies one controlled change, and verifies both the intended result and regressions.`,
      commonMistakes: `Common mistakes include treating ${topic} as a label without validating its runtime behavior, ignoring failure paths, and declaring success without evidence.`,
    },
  };
}

export function localizeFoundation(
  item: FoundationKnowledge,
  language: Language,
): FoundationKnowledge {
  if (language === 'zh-CN') return item;
  const copy = foundationEnglishOverrides[item.id] ?? foundationTemplate(item);
  return {
    ...item,
    title: containsHan(item.title) ? copy.title : item.title,
    content: {
      simpleExplanation: containsHan(item.content.simpleExplanation)
        ? copy.content.simpleExplanation
        : item.content.simpleExplanation,
      analogy: containsHan(item.content.analogy)
        ? copy.content.analogy
        : item.content.analogy,
      technicalExplanation: containsHan(item.content.technicalExplanation)
        ? copy.content.technicalExplanation
        : item.content.technicalExplanation,
      example: containsHan(item.content.example)
        ? copy.content.example
        : item.content.example,
      commonMistakes: containsHan(item.content.commonMistakes)
        ? copy.content.commonMistakes
        : item.content.commonMistakes,
    },
  };
}

export function localizeFoundations(
  items: readonly FoundationKnowledge[],
  language: Language,
): readonly FoundationKnowledge[] {
  return language === 'zh-CN'
    ? items
    : items.map((item) => localizeFoundation(item, language));
}

function conceptTemplate(item: ConceptKnowledge): ConceptKnowledge {
  const topic = item.technicalTerm.trim() || humanizeIdentifier(item.id);
  const scope =
    item.category === 'ai'
      ? 'AI application quality and behavior'
      : item.category === 'fde'
        ? 'evidence-backed customer delivery'
        : item.category === 'system'
          ? 'reliable production systems'
          : 'service and API boundaries';
  return {
    ...item,
    title: `${topic}: Engineering Concept`,
    simpleExplanation: `${topic} is a core concept used to reason clearly about ${scope}.`,
    analogy: `Think of ${topic} as an explicit rule in a shared operating manual: everyone can inspect the same boundary and expected behavior.`,
    technicalExplanation: `${topic} connects system inputs, runtime behavior, failure modes, and verification evidence so that engineering decisions remain testable.`,
    whyItMatters: `Understanding ${topic} helps an AI engineer diagnose the correct boundary, communicate trade-offs, and verify a safe outcome.`,
    commonMistakes: `Do not rely on the name alone. Confirm how ${topic} behaves under real constraints, failures, retries, and production data.`,
  };
}

export function localizeConcept(
  item: ConceptKnowledge,
  language: Language,
): ConceptKnowledge {
  if (language === 'zh-CN') return item;
  const override = conceptEnglishOverrides[item.id];
  const copy =
    override === undefined ? conceptTemplate(item) : { ...item, ...override };
  return {
    ...item,
    title: containsHan(item.title) ? copy.title : item.title,
    simpleExplanation: containsHan(item.simpleExplanation)
      ? copy.simpleExplanation
      : item.simpleExplanation,
    analogy: containsHan(item.analogy) ? copy.analogy : item.analogy,
    technicalExplanation: containsHan(item.technicalExplanation)
      ? copy.technicalExplanation
      : item.technicalExplanation,
    whyItMatters: containsHan(item.whyItMatters)
      ? copy.whyItMatters
      : item.whyItMatters,
    commonMistakes: containsHan(item.commonMistakes)
      ? copy.commonMistakes
      : item.commonMistakes,
  };
}

export function localizeConcepts(
  items: readonly ConceptKnowledge[],
  language: Language,
): readonly ConceptKnowledge[] {
  return language === 'zh-CN'
    ? items
    : items.map((item) => localizeConcept(item, language));
}

function caseCopy(id: string) {
  const override = caseEnglishOverrides[id];
  if (override !== undefined) return override;
  const topic = humanizeIdentifier(id);
  return {
    title: `${topic}: Engineering Challenge`,
    summary: `Diagnose and resolve a realistic engineering incident involving ${topic} through evidence, controlled changes, and explicit verification.`,
    scenarioSummary: `A production system shows a customer-impacting failure involving ${topic}, and the team must identify the safest evidence-backed response.`,
  };
}

function stripChineseFromTechnicalEvidence(value: string): string | undefined {
  const candidate = value
    .replace(HAN_PATTERN_GLOBAL, ' ')
    .replace(CJK_PUNCTUATION_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  const technicalCharacters =
    candidate.match(/[A-Za-z0-9_{}[\].:=/\\-]/gu)?.length ?? 0;
  return candidate.length >= 24 &&
    technicalCharacters / candidate.length >= 0.35
    ? candidate
    : undefined;
}

function localizeEvidence(
  evidence: Evidence,
  index: number,
  topic: string,
): Evidence {
  const technicalContent = containsHan(evidence.content)
    ? stripChineseFromTechnicalEvidence(evidence.content)
    : evidence.content;
  return {
    ...evidence,
    title:
      evidence.title === undefined || containsHan(evidence.title)
        ? `${humanizeIdentifier(evidence.type)} evidence ${String(index + 1)}`
        : evidence.title,
    content:
      technicalContent ??
      `This ${humanizeIdentifier(evidence.type).toLocaleLowerCase()} evidence records confirmed behavior relevant to ${topic}. Review it together with the constraints before choosing an action.`,
  };
}

function correctOptionIds(node: CaseNode): ReadonlySet<string> {
  if ('correctOptionId' in node.answer) {
    return new Set([node.answer.correctOptionId]);
  }
  if ('correctOptionIds' in node.answer) {
    return new Set(node.answer.correctOptionIds);
  }
  if ('orderedOptionIds' in node.answer) {
    return new Set(node.answer.orderedOptionIds);
  }
  if ('conclusionId' in node.answer) {
    return new Set([node.answer.conclusionId]);
  }
  return new Set([
    ...Object.keys(node.answer.pairs),
    ...Object.values(node.answer.pairs),
  ]);
}

function localizeOption(
  option: Option,
  index: number,
  correctIds: ReadonlySet<string>,
): Option {
  if (!containsHan(option.label) && !containsHan(option.explanation)) {
    return option;
  }
  const correct = correctIds.has(option.id) || option.errorType === 'none';
  const error = humanizeIdentifier(
    option.errorType ?? 'unsupported assumption',
  );
  const technicalHints = Array.from(
    new Set(option.label.match(/[A-Za-z][A-Za-z0-9_.:/-]*|\d+xx/gu) ?? []),
  )
    .slice(0, 4)
    .join(', ');
  return {
    ...option,
    label: `Option ${String(index + 1)}: Evaluate the proposed operational response${technicalHints === '' ? '' : ` involving ${technicalHints}`}.`,
    explanation: correct
      ? 'This response follows the evidence, preserves operational boundaries, and defines a verifiable outcome.'
      : `This response leaves the ${error.toLocaleLowerCase()} risk unresolved and does not prove that the underlying failure is fixed.`,
  };
}

function localizeNode(node: CaseNode, index: number, topic: string): CaseNode {
  const correctIds = correctOptionIds(node);
  return {
    ...node,
    title:
      node.title === undefined || containsHan(node.title)
        ? `Decision ${String(index + 1)}: ${humanizeIdentifier(node.type)}`
        : node.title,
    prompt: containsHan(node.prompt)
      ? 'Which action best addresses the confirmed evidence at this stage?'
      : node.prompt,
    evidence: node.evidence.map((item, evidenceIndex) =>
      localizeEvidence(item, evidenceIndex, topic),
    ),
    options: node.options.map((option, optionIndex) =>
      localizeOption(option, optionIndex, correctIds),
    ),
    feedback: {
      firstWrong: containsHan(node.feedback.firstWrong)
        ? 'Recheck the confirmed evidence and distinguish the root cause from a partial symptom-level mitigation.'
        : node.feedback.firstWrong,
      secondWrong: containsHan(node.feedback.secondWrong)
        ? 'Use the constraints and the strongest evidence to eliminate actions that introduce new operational risk.'
        : node.feedback.secondWrong,
      revealedAnswer: containsHan(node.feedback.revealedAnswer)
        ? 'The evidence-backed answer addresses the confirmed root cause, preserves safety boundaries, and verifies the outcome.'
        : node.feedback.revealedAnswer,
    },
    consequences: node.consequences?.map((consequence) => ({
      ...consequence,
      ...(consequence.message === undefined || !containsHan(consequence.message)
        ? {}
        : {
            message:
              'The decision changes delivery time, trust, cost, or operational risk according to how well it follows the confirmed evidence.',
          }),
    })),
  };
}

export function localizeCaseSummary(
  item: CaseSummary,
  language: Language,
): CaseSummary {
  if (language === 'zh-CN') return item;
  const copy = caseCopy(item.id);
  return {
    ...item,
    title: containsHan(item.title) ? copy.title : item.title,
    summary: containsHan(item.summary) ? copy.summary : item.summary,
    scenarioSummary: containsHan(item.scenarioSummary)
      ? copy.scenarioSummary
      : item.scenarioSummary,
  };
}

export function localizeCase(item: FdeCase, language: Language): FdeCase {
  if (language === 'zh-CN') return item;
  const copy = caseCopy(item.id);
  const topic = humanizeIdentifier(item.id);
  return {
    ...item,
    title: containsHan(item.title) ? copy.title : item.title,
    summary: containsHan(item.summary) ? copy.summary : item.summary,
    scenario: {
      customerProfile: containsHan(item.scenario.customerProfile)
        ? `A customer operates a production workflow that depends on ${topic}.`
        : item.scenario.customerProfile,
      background: containsHan(item.scenario.background)
        ? `A recent change exposed an operational failure involving ${topic}. The team must separate confirmed evidence from assumptions before changing production behavior.`
        : item.scenario.background,
      initialIncident: containsHan(item.scenario.initialIncident)
        ? copy.scenarioSummary
        : item.scenario.initialIncident,
      constraints: item.scenario.constraints.map((constraint, index) =>
        containsHan(constraint)
          ? ([
              'Preserve existing security and authorization controls.',
              'Avoid destructive changes and keep the response reversible.',
              'Define explicit verification before declaring recovery.',
            ][index] ?? `Respect operational constraint ${String(index + 1)}.`)
          : constraint,
      ),
      confirmedFacts: item.scenario.confirmedFacts.map((fact, index) =>
        containsHan(fact)
          ? `Confirmed fact ${String(index + 1)} is supported by the supplied production evidence.`
          : fact,
      ),
    },
    nodes: item.nodes.map((node, index) => localizeNode(node, index, topic)),
    debrief: {
      summary: containsHan(item.debrief.summary)
        ? `This challenge demonstrates how to resolve ${topic} failures through evidence, controlled remediation, and explicit verification.`
        : item.debrief.summary,
      rootCause: containsHan(item.debrief.rootCause)
        ? `The incident persisted because the system boundary for ${topic} did not safely handle the confirmed production condition.`
        : item.debrief.rootCause,
      correctApproach: item.debrief.correctApproach.map((value, index) =>
        containsHan(value)
          ? ([
              'Confirm the failure boundary with reproducible evidence.',
              'Apply the smallest controlled change that addresses the root cause.',
              'Verify recovery and regression behavior before closing the incident.',
            ][index] ??
            `Complete remediation step ${String(index + 1)} with recorded evidence.`)
          : value,
      ),
      keyLessons: item.debrief.keyLessons.map((value, index) =>
        containsHan(value)
          ? `Lesson ${String(index + 1)}: evidence, safety boundaries, and verification must remain connected.`
          : value,
      ),
      interviewerPerspective: containsHan(item.debrief.interviewerPerspective)
        ? 'A strong answer separates facts from assumptions, explains trade-offs, and defines a safe verification plan.'
        : item.debrief.interviewerPerspective,
      customerRiskPerspective: containsHan(item.debrief.customerRiskPerspective)
        ? 'Customer impact depends on limiting blast radius, preserving trust, and avoiding unverified or irreversible actions.'
        : item.debrief.customerRiskPerspective,
      remediation: item.debrief.remediation.map((value, index) =>
        containsHan(value)
          ? `Remediation ${String(index + 1)}: implement a bounded, auditable change tied to the confirmed root cause.`
          : value,
      ),
      verification: item.debrief.verification.map((value, index) =>
        containsHan(value)
          ? `Verification ${String(index + 1)}: prove the intended outcome and test the relevant regression path.`
          : value,
      ),
      knowledgePoints: item.debrief.knowledgePoints.map((value) =>
        containsHan(value) ? humanizeIdentifier(value) : value,
      ),
      ...(item.debrief.recommendedCaseIds === undefined
        ? {}
        : { recommendedCaseIds: item.debrief.recommendedCaseIds }),
    },
  };
}

export function localizeCaseRepository(
  repository: CaseRepository,
  language: Language,
): CaseRepository {
  if (language === 'zh-CN') return repository;
  return {
    listActive: async (query) =>
      (
        await (query === undefined
          ? repository.listActive()
          : repository.listActive(query))
      ).map((item) => localizeCaseSummary(item, language)),
    list: async (query) =>
      (
        await (query === undefined ? repository.list() : repository.list(query))
      ).map((item) => localizeCaseSummary(item, language)),
    getVersion: async (caseId, version) => {
      const item = await repository.getVersion(caseId, version);
      return item === undefined ? undefined : localizeCase(item, language);
    },
    seed: (cases) => repository.seed(cases),
  };
}
