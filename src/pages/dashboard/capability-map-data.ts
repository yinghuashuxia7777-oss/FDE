import {
  evidenceConfidence,
  masteryStatus,
  type MasteryStatus,
} from '../../application/product';
import type { MvpLeafEvidenceProfile } from '../../application/product/mvp-capability-projection';
import type { SkillDefinition } from '../../content/contracts';
import type { createTranslator } from '../../i18n';
import type {
  AttemptRecord,
  SkillMasteryRecord,
} from '../../repositories/contracts';

type Translate = ReturnType<typeof createTranslator>;

export type CapabilityMastery =
  'not-started' | 'learning' | 'competent' | 'proficient';

export interface CapabilitySignal {
  confidence: string;
  evidence: string;
  label: string;
  level: number;
  mastery: CapabilityMastery;
  score: number | undefined;
  skillId: string;
  sourceLabel: string;
  statusLabel: string;
}

interface DemoProfile {
  completedCases: number;
  goal: string;
  name: string;
  projects: number;
}

export type CapabilityMapData =
  | {
      mapReadiness: number;
      mode: 'demo';
      profile: DemoProfile;
      signals: CapabilitySignal[];
    }
  | {
      mapReadiness: number | undefined;
      mode: 'real';
      profile?: never;
      signals: CapabilitySignal[];
    };

interface CapabilityDefinition {
  labelKey: string;
  skillId: string;
}

const capabilityDefinitions = [
  {
    labelKey: 'dashboard.capability.node.llm',
    skillId: 'llm.applications',
  },
  {
    labelKey: 'dashboard.capability.node.agent',
    skillId: 'agents.evaluation',
  },
  {
    labelKey: 'dashboard.capability.node.rag',
    skillId: 'rag.search',
  },
  {
    labelKey: 'dashboard.capability.node.software',
    skillId: 'software.foundations',
  },
  {
    labelKey: 'dashboard.capability.node.deployment',
    skillId: 'cloud.deployment',
  },
  {
    labelKey: 'dashboard.capability.node.systems',
    skillId: 'systems.networking',
  },
  {
    labelKey: 'dashboard.capability.node.reliability',
    skillId: 'reliability.observability',
  },
] as const satisfies readonly CapabilityDefinition[];

export const capabilitySkillIds = capabilityDefinitions.map(
  ({ skillId }) => skillId,
);

const masteryLevels: Record<MasteryStatus, number> = {
  'Not started': 0,
  Weak: 1,
  Learning: 2,
  Competent: 3,
  Proficient: 4,
};

const displayMastery: Record<MasteryStatus, CapabilityMastery> = {
  'Not started': 'not-started',
  Weak: 'learning',
  Learning: 'learning',
  Competent: 'competent',
  Proficient: 'proficient',
};

const statusKeys: Record<CapabilityMastery, string> = {
  'not-started': 'dashboard.capability.status.notVerified',
  learning: 'dashboard.capability.status.learning',
  competent: 'dashboard.capability.status.competent',
  proficient: 'dashboard.capability.status.proficient',
};

const evidenceKeys = {
  learning: {
    one: 'dashboard.capability.evidence.trainingOne',
    many: 'dashboard.capability.evidence.trainingMany',
  },
  competent: {
    one: 'dashboard.capability.evidence.trustedOne',
    many: 'dashboard.capability.evidence.trustedMany',
  },
  proficient: {
    one: 'dashboard.capability.evidence.engineeringOne',
    many: 'dashboard.capability.evidence.engineeringMany',
  },
} as const satisfies Record<
  Exclude<CapabilityMastery, 'not-started'>,
  { many: string; one: string }
>;

interface DemoCapabilityRecord {
  confidence: 'high' | 'low' | 'medium';
  evidenceCount: number;
  level: number;
  mastery: Exclude<CapabilityMastery, 'not-started'>;
  score: number;
  skillId: (typeof capabilityDefinitions)[number]['skillId'];
}

const demoCapabilityRecords = [
  {
    skillId: 'llm.applications',
    score: 85,
    level: 4,
    mastery: 'proficient',
    confidence: 'high',
    evidenceCount: 12,
  },
  {
    skillId: 'agents.evaluation',
    score: 75,
    level: 3,
    mastery: 'competent',
    confidence: 'medium',
    evidenceCount: 8,
  },
  {
    skillId: 'rag.search',
    score: 80,
    level: 4,
    mastery: 'proficient',
    confidence: 'high',
    evidenceCount: 10,
  },
  {
    skillId: 'software.foundations',
    score: 75,
    level: 3,
    mastery: 'competent',
    confidence: 'high',
    evidenceCount: 9,
  },
  {
    skillId: 'cloud.deployment',
    score: 60,
    level: 3,
    mastery: 'competent',
    confidence: 'medium',
    evidenceCount: 6,
  },
  {
    skillId: 'systems.networking',
    score: 45,
    level: 2,
    mastery: 'learning',
    confidence: 'medium',
    evidenceCount: 4,
  },
  {
    skillId: 'reliability.observability',
    score: 40,
    level: 2,
    mastery: 'learning',
    confidence: 'low',
    evidenceCount: 3,
  },
] as const satisfies readonly DemoCapabilityRecord[];

interface CapabilityMapDataInput {
  attempts: readonly AttemptRecord[];
  definitions: readonly SkillDefinition[];
  mastery: readonly SkillMasteryRecord[];
  realReadiness: number | undefined;
  t: Translate;
  mvpLeafEvidence?: readonly MvpLeafEvidenceProfile[];
}

function evidenceLabel(
  t: Translate,
  mastery: CapabilityMastery,
  count: number,
): string {
  if (mastery === 'not-started') {
    return t('dashboard.capability.evidence.notVerified');
  }
  const keys = evidenceKeys[mastery];
  return t(count === 1 ? keys.one : keys.many, { count });
}

function definitionById(
  definitions: readonly SkillDefinition[],
): ReadonlyMap<string, SkillDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export function hasRealCapabilityEvidence(
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): boolean {
  return (
    mastery.some(({ sampleCount }) => sampleCount > 0) ||
    attempts.some(({ status }) => status === 'completed')
  );
}

export function buildRealCapabilitySignals(
  t: Translate,
  definitions: readonly SkillDefinition[],
  mastery: readonly SkillMasteryRecord[],
  mvpLeafEvidence: readonly MvpLeafEvidenceProfile[] = [],
): CapabilitySignal[] {
  const definitionsById = definitionById(definitions);
  const masteryBySkill = new Map(
    mastery.map((record) => [record.skillId, record]),
  );
  const leafByParent = new Map<string, MvpLeafEvidenceProfile[]>();
  mvpLeafEvidence.forEach((profile) => {
    if (profile.parentSkillId === undefined) return;
    leafByParent.set(profile.parentSkillId, [
      ...(leafByParent.get(profile.parentSkillId) ?? []),
      profile,
    ]);
  });

  return capabilityDefinitions.map(({ labelKey, skillId }) => {
    const record = masteryBySkill.get(skillId);
    const leafEvidence = leafByParent.get(skillId) ?? [];
    const scoredLeaves = leafEvidence.filter(
      ({ score }) => score !== undefined,
    );
    const leafScore =
      scoredLeaves.length === 0
        ? undefined
        : scoredLeaves.reduce((total, item) => total + item.score!, 0) /
          scoredLeaves.length;
    const leafSampleCount = leafEvidence.reduce(
      (total, item) =>
        total + item.primaryEvidenceCount + item.supportingEvidenceCount,
      0,
    );
    const sampleCount =
      leafSampleCount > 0 ? leafSampleCount : (record?.sampleCount ?? 0);
    const score = leafScore ?? record?.score;
    const status = masteryStatus(score, sampleCount);
    const masteryBand = displayMastery[status];
    const confidence = evidenceConfidence(sampleCount);
    return {
      skillId,
      label: t(labelKey),
      sourceLabel: definitionsById.get(skillId)?.label ?? skillId,
      score: sampleCount === 0 ? undefined : score,
      level: masteryLevels[status],
      mastery: masteryBand,
      statusLabel: t(statusKeys[masteryBand]),
      confidence: t(`dashboard.capability.confidence.${confidence}`),
      evidence: evidenceLabel(t, masteryBand, sampleCount),
    };
  });
}

export function buildDemoCapabilitySignals(t: Translate): CapabilitySignal[] {
  const definitionBySkill = new Map(
    capabilityDefinitions.map((definition) => [definition.skillId, definition]),
  );
  return demoCapabilityRecords.map((record) => {
    const definition = definitionBySkill.get(record.skillId);
    const label = t(definition?.labelKey ?? record.skillId);
    return {
      skillId: record.skillId,
      label,
      sourceLabel: label,
      score: record.score,
      level: record.level,
      mastery: record.mastery,
      statusLabel: t(statusKeys[record.mastery]),
      confidence: t(`dashboard.capability.confidence.${record.confidence}`),
      evidence: evidenceLabel(t, record.mastery, record.evidenceCount),
    };
  });
}

export function provideCapabilityMapData({
  attempts,
  definitions,
  mastery,
  realReadiness,
  t,
  mvpLeafEvidence = [],
}: CapabilityMapDataInput): CapabilityMapData {
  if (!hasRealCapabilityEvidence(mastery, attempts)) {
    return {
      mode: 'demo',
      mapReadiness: 72,
      profile: {
        name: 'Alex Chen',
        goal: t('dashboard.target.productionEngineer'),
        completedCases: 20,
        projects: 1,
      },
      signals: buildDemoCapabilitySignals(t),
    };
  }
  return {
    mode: 'real',
    mapReadiness: realReadiness,
    signals: buildRealCapabilitySignals(
      t,
      definitions,
      mastery,
      mvpLeafEvidence,
    ),
  };
}
