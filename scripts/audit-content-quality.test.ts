import { describe, expect, it } from 'vitest';

import type {
  DomainDefinition,
  SkillDefinition,
} from '../src/content/contracts';
import type {
  CaseLevel,
  ChoiceCaseNode,
  FdeCase,
} from '../src/domain/cases/types';
import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { auditContentQuality } from './audit-content-quality';

const domain: DomainDefinition = {
  schemaVersion: 1,
  id: 'quality-domain',
  label: 'Quality domain',
  description: 'A registered domain used by content quality tests.',
  status: 'active',
};

const skill: SkillDefinition = {
  schemaVersion: 1,
  id: 'quality.skill',
  domainId: domain.id,
  label: 'Quality skill',
  description: 'A registered skill used by content quality tests.',
  status: 'active',
};

function highQualityCase(
  level: CaseLevel = 'beginner',
  nodeCount = level === 'advanced' ? 4 : level === 'intermediate' ? 3 : 2,
): FdeCase {
  const candidate = createMinimalValidCase();
  candidate.id = `quality-${level}`;
  candidate.slug = candidate.id;
  candidate.level = level;
  candidate.domains = [domain.id];
  candidate.skills = [skill.id];
  candidate.scenario = {
    customerProfile:
      'A fictional operations team uses a local service for scheduled work.',
    background:
      'A reversible deployment changed one observable runtime behavior.',
    initialIncident:
      'Synthetic requests now fail after the deployment while the baseline stays healthy.',
    constraints: [
      'Use only synthetic evidence and preserve the healthy baseline.',
      'The first action must be reversible and observable.',
    ],
    confirmedFacts: [
      'The failure started with the candidate deployment.',
      'The unchanged baseline still completes the same request.',
    ],
  };
  candidate.debrief = {
    ...candidate.debrief,
    rootCause:
      'The candidate deployment changed the request contract used by the service.',
    correctApproach: [
      'Contain the candidate deployment while retaining diagnostic evidence.',
      'Verify the request contract with a synthetic canary before resuming.',
    ],
    remediation: [
      'Restore the documented request contract.',
      'Add a contract regression test to the release gate.',
    ],
    verification: [
      'Confirm the synthetic request succeeds on the canary.',
      'Confirm the baseline error rate remains unchanged during rollout.',
    ],
  };

  const base = candidate.nodes[0] as ChoiceCaseNode;
  base.prompt =
    'Given the deployment evidence and constraints, which action should the team take next?';
  base.skillWeights = { [skill.id]: 1 };
  base.evidence = [
    {
      id: 'quality-evidence-a',
      type: 'log',
      title: 'Candidate request log',
      content: 'candidate=true request_status=failed contract_version=2',
    },
    {
      id: 'quality-evidence-b',
      type: 'metric',
      title: 'Baseline comparison',
      content: 'candidate_error_rate=1.0 baseline_error_rate=0.0',
    },
  ];
  base.options = [
    {
      id: 'quality-option-a',
      label: 'Contain and verify the candidate',
      explanation:
        'This follows both the deployment boundary and the comparative evidence while preserving rollback.',
    },
    {
      id: 'quality-option-b',
      label: 'Change the healthy baseline',
      explanation:
        'The baseline is the healthy control, so changing it removes the comparison without addressing the candidate.',
      errorType: 'unsupported-baseline-change',
    },
    {
      id: 'quality-option-c',
      label: 'Publish without verification',
      explanation:
        'Publishing a failing candidate ignores the observed error and exposes users to a known regression.',
      errorType: 'unsafe-unverified-release',
    },
  ];
  base.answer = { correctOptionId: base.options[0].id };
  base.scoring.criticalErrorOptionIds = [base.options[2].id];

  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const node = structuredClone(base);
    const prefix = `${candidate.id}-node-${String(index + 1).padStart(2, '0')}`;
    node.id = prefix;
    node.evidence = node.evidence.map((evidence, evidenceIndex) => ({
      ...evidence,
      id: `${prefix}-evidence-${String(evidenceIndex + 1).padStart(2, '0')}`,
    }));
    node.options = node.options.map((option, optionIndex) => ({
      ...option,
      id: `${prefix}-option-${String.fromCharCode(97 + optionIndex)}`,
    }));
    node.answer = { correctOptionId: node.options[0].id };
    node.scoring.criticalErrorOptionIds = [node.options[2].id];
    node.consequences = undefined;
    node.branches = [
      {
        key: 'correct',
        nextNodeId:
          index === nodeCount - 1
            ? null
            : `${candidate.id}-node-${String(index + 2).padStart(2, '0')}`,
      },
    ];
    return node;
  });
  candidate.nodes = nodes;
  candidate.startNodeId = nodes[0].id;
  return candidate;
}

function audit(
  candidate: FdeCase,
  definitions = {
    domains: [domain],
    skills: [skill],
  },
) {
  return auditContentQuality(
    [{ file: `${candidate.id}.json`, case: candidate }],
    definitions.domains,
    definitions.skills,
  );
}

function codes(candidate: FdeCase): string[] {
  return audit(candidate).issues.map(({ code }) => code);
}

describe('auditContentQuality', () => {
  it.each([
    ['beginner', 2],
    ['intermediate', 3],
    ['advanced', 4],
  ] as const)(
    'accepts a substantive %s case with %s decisions',
    (level, count) => {
      const report = audit(highQualityCase(level, count));

      expect(report).toEqual({ casesChecked: 1, issues: [] });
    },
  );

  it('rejects unsupported levels and too few decision nodes', () => {
    const candidate = highQualityCase('expert', 1);

    expect(codes(candidate)).toEqual(
      expect.arrayContaining([
        'unsupported_level',
        'insufficient_decision_nodes',
      ]),
    );
  });

  it('requires substantive scenario fields, constraints, and facts', () => {
    const candidate = highQualityCase();
    candidate.scenario.customerProfile = 'TODO';
    candidate.scenario.background = 'placeholder';
    candidate.scenario.initialIncident = 'TBD';
    candidate.scenario.constraints = ['Only one constraint'];
    candidate.scenario.confirmedFacts = ['Only one fact'];

    expect(codes(candidate)).toEqual(
      expect.arrayContaining([
        'scenario_content_insufficient',
        'insufficient_scenario_constraints',
        'insufficient_confirmed_facts',
      ]),
    );
  });

  it('requires complementary, non-placeholder evidence on every node', () => {
    const candidate = highQualityCase();
    candidate.nodes[0].evidence = [
      { id: 'only-evidence', type: 'text', content: 'TODO' },
    ];
    candidate.nodes[1].evidence = candidate.nodes[1].evidence.map(
      (evidence) => ({ ...evidence, type: 'text' }),
    );

    expect(codes(candidate)).toEqual(
      expect.arrayContaining([
        'insufficient_node_evidence',
        'placeholder_evidence_content',
        'insufficient_evidence_type_diversity',
      ]),
    );
  });

  it('rejects terminology prompts, too few options, and shallow explanations', () => {
    const candidate = highQualityCase();
    candidate.nodes[0].prompt = 'What is observability?';
    candidate.nodes[0].options = candidate.nodes[0].options.slice(0, 2);
    candidate.nodes[1].options[0].explanation = 'Because.';
    candidate.nodes[1].options[1].explanation =
      'This explanation is deliberately long but offers no causal reasoning.';
    candidate.nodes[1].options[2].explanation =
      'This is the correct choice, and it sounds reasonable.';

    const issueCodes = codes(candidate);
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        'non_decision_prompt',
        'insufficient_node_options',
        'option_explanation_insufficient',
      ]),
    );
    expect(
      issueCodes.filter((code) => code === 'option_explanation_insufficient'),
    ).toHaveLength(3);
  });

  it('rejects terminology recall disguised with decision wording', () => {
    const candidate = highQualityCase();
    candidate.nodes[0].prompt =
      'Which definition best describes observability?';

    expect(audit(candidate).issues).toContainEqual(
      expect.objectContaining({
        path: ['nodes', 0, 'prompt'],
        code: 'non_decision_prompt',
      }),
    );
  });

  it('accepts what-phrased prompts when they require a contextual decision', () => {
    const candidate = highQualityCase();
    candidate.nodes[0].prompt =
      'What does the supplied evidence imply the team should do next?';

    expect(
      audit(candidate).issues.filter(
        ({ path, code }) =>
          code === 'non_decision_prompt' && path.join('.') === 'nodes.0.prompt',
      ),
    ).toEqual([]);
  });

  it('checks registered definitions and flags declared but unused skills', () => {
    const candidate = highQualityCase();
    const unusedSkill: SkillDefinition = {
      ...skill,
      id: 'quality.unused',
      label: 'Unused quality skill',
    };
    candidate.domains.push('missing-domain');
    candidate.skills.push('missing-skill', unusedSkill.id);

    const issueCodes = audit(candidate, {
      domains: [domain],
      skills: [skill, unusedSkill],
    }).issues.map(({ code }) => code);

    expect(issueCodes).toEqual(
      expect.arrayContaining([
        'unregistered_domain',
        'unregistered_skill',
        'unused_case_skill',
      ]),
    );
  });

  it('does not treat deprecated definitions as active registrations', () => {
    const candidate = highQualityCase();

    const issueCodes = audit(candidate, {
      domains: [{ ...domain, status: 'deprecated' }],
      skills: [{ ...skill, status: 'deprecated' }],
    }).issues.map(({ code }) => code);

    expect(issueCodes).toEqual(
      expect.arrayContaining(['unregistered_domain', 'unregistered_skill']),
    );
  });

  it('requires a substantive root cause and actionable debrief lists', () => {
    const candidate = highQualityCase();
    candidate.debrief.rootCause = 'TODO';
    candidate.debrief.correctApproach = ['Fix it'];
    candidate.debrief.remediation = ['TBD'];
    candidate.debrief.verification = ['Check it'];

    expect(codes(candidate)).toEqual(
      expect.arrayContaining([
        'root_cause_insufficient',
        'insufficient_correct_approach',
        'insufficient_remediation',
        'insufficient_verification',
      ]),
    );
  });

  it('rejects long debrief prose without causal, corrective, or observable semantics', () => {
    const candidate = highQualityCase();
    candidate.debrief.rootCause =
      'The incident was discussed by the team in a detailed follow-up document.';
    candidate.debrief.correctApproach = [
      'A cross-functional meeting will happen next week with several stakeholders.',
      'A detailed summary will be shared after that meeting with the full project team.',
    ];
    candidate.debrief.remediation = [
      'The team will discuss potential improvements during a future planning session.',
      'Stakeholders will receive a detailed presentation about the incident timeline.',
    ];
    candidate.debrief.verification = [
      'The team will meet again to review the written summary next week.',
      'A project update will be sent to everyone after the discussion.',
    ];

    expect(codes(candidate)).toEqual(
      expect.arrayContaining([
        'root_cause_insufficient',
        'insufficient_correct_approach',
        'insufficient_remediation',
        'insufficient_verification',
      ]),
    );
  });

  it('returns stable structured issues with file and JSON path', () => {
    const candidate = highQualityCase();
    candidate.nodes[0].prompt = 'Define reliability.';

    expect(audit(candidate).issues).toContainEqual({
      file: `${candidate.id}.json`,
      path: ['nodes', 0, 'prompt'],
      code: 'non_decision_prompt',
      message: `Node ${candidate.nodes[0].id} must ask for a contextual decision, not terminology recall.`,
    });
  });
});
