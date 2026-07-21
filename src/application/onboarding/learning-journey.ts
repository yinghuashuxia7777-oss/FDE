import { foundationStatus } from '../foundation';
import type { SkillDefinition } from '../../content/contracts';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import type { FoundationKnowledge } from '../../domain/foundation/types';
import type {
  AttemptRecord,
  CaseProgressRecord,
  CaseSummary,
  SkillMasteryRecord,
} from '../../repositories/contracts';

export type LearnerStartingPoint =
  'zero-basics' | 'programming-basics' | 'ai-project';

export interface FirstMission {
  estimatedMinutes: number;
  id: string;
  kind: 'foundation' | 'case';
  motivation: string;
  reason: LearnerStartingPoint;
  title: string;
  to: string;
}

export interface GrowthRoadmapStage {
  conceptCount: number;
  foundationCount: number;
  id: 'level-0' | 'level-1' | 'level-2' | 'level-3';
  skillCount: number;
}

interface JourneyEvidence {
  attempts: readonly AttemptRecord[];
  mastery: readonly SkillMasteryRecord[];
  progress: readonly CaseProgressRecord[];
}

interface FirstMissionInput extends JourneyEvidence {
  cases: readonly CaseSummary[];
  completedMissionIds: readonly string[];
  foundations: readonly FoundationKnowledge[];
  startingPoint: LearnerStartingPoint;
}

interface RoadmapInput {
  concepts: readonly ConceptKnowledge[];
  foundations: readonly FoundationKnowledge[];
  skills: readonly SkillDefinition[];
}

const missionPaths: Record<LearnerStartingPoint, readonly string[]> = {
  'zero-basics': ['api-basic', 'api.token-authentication'],
  'programming-basics': ['ai.llm', 'ai.prompt'],
  'ai-project': ['fde.problem-scoping', 'fde.requirement-evidence'],
};

export function isNewLearner(
  progress: readonly CaseProgressRecord[],
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): boolean {
  return (
    !progress.some(({ completedCount }) => completedCount > 0) &&
    !attempts.some(({ status }) => status === 'completed') &&
    mastery.every(({ sampleCount }) => sampleCount === 0)
  );
}

function foundationMission(
  item: FoundationKnowledge,
  reason: LearnerStartingPoint,
): FirstMission {
  return {
    estimatedMinutes: item.estimatedMinutes,
    id: item.id,
    kind: 'foundation',
    motivation: item.content.simpleExplanation,
    reason,
    title: item.title,
    to: `/foundation/${item.id}`,
  };
}

function caseMission(
  item: CaseSummary,
  reason: LearnerStartingPoint,
): FirstMission {
  return {
    estimatedMinutes: item.estimatedMinutes,
    id: item.id,
    kind: 'case',
    motivation: item.scenarioSummary ?? item.summary,
    reason,
    title: item.title,
    to: `/training/${item.id}`,
  };
}

function availableFoundation(
  item: FoundationKnowledge,
  completedIds: ReadonlySet<string>,
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): boolean {
  return (
    !completedIds.has(item.id) &&
    foundationStatus(item, mastery, attempts) !== 'mastered'
  );
}

export function selectFirstMission({
  attempts,
  cases,
  completedMissionIds,
  foundations,
  mastery,
  progress,
  startingPoint,
}: FirstMissionInput): FirstMission | undefined {
  const byId = new Map(foundations.map((item) => [item.id, item]));
  const completedIds = new Set(completedMissionIds);
  for (const id of missionPaths[startingPoint]) {
    const item = byId.get(id);
    if (
      item !== undefined &&
      availableFoundation(item, completedIds, mastery, attempts)
    ) {
      return foundationMission(item, startingPoint);
    }
  }

  const fallbackFoundation = [...foundations]
    .filter((item) =>
      availableFoundation(item, completedIds, mastery, attempts),
    )
    .sort(
      (left, right) =>
        left.order - right.order || left.id.localeCompare(right.id),
    )[0];
  if (fallbackFoundation !== undefined) {
    return foundationMission(fallbackFoundation, startingPoint);
  }

  const completedCases = new Set(
    progress
      .filter(({ completedCount }) => completedCount > 0)
      .map(({ caseId }) => caseId),
  );
  const fallbackCase = [...cases]
    .filter(
      ({ id, status }) =>
        status === 'published' &&
        !completedCases.has(id) &&
        !completedIds.has(id),
    )
    .sort(
      (left, right) =>
        left.estimatedMinutes - right.estimatedMinutes ||
        left.id.localeCompare(right.id),
    )[0];
  return fallbackCase === undefined
    ? undefined
    : caseMission(fallbackCase, startingPoint);
}

export function selectJourneyNextFoundation(
  currentId: string,
  foundations: readonly FoundationKnowledge[],
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): FoundationKnowledge | undefined {
  const current = foundations.find(({ id }) => id === currentId);
  if (current === undefined) return undefined;
  const byId = new Map(foundations.map((item) => [item.id, item]));
  const path = Object.values(missionPaths).find((ids) =>
    ids.includes(currentId),
  );
  if (path !== undefined) {
    const currentIndex = path.indexOf(currentId);
    for (const id of path.slice(currentIndex + 1)) {
      const item = byId.get(id);
      if (
        item !== undefined &&
        foundationStatus(item, mastery, attempts) !== 'mastered'
      ) {
        return item;
      }
    }
  }

  return [...foundations]
    .filter(
      (item) =>
        item.id !== currentId &&
        (item.order > current.order ||
          (item.order === current.order && item.id > current.id)) &&
        foundationStatus(item, mastery, attempts) !== 'mastered',
    )
    .sort((left, right) => {
      const leftSameTrack = Number(left.track === current.track);
      const rightSameTrack = Number(right.track === current.track);
      return (
        rightSameTrack - leftSameTrack ||
        left.order - right.order ||
        left.id.localeCompare(right.id)
      );
    })[0];
}

function activeSkillCount(
  skillIds: ReadonlySet<string>,
  skills: readonly SkillDefinition[],
): number {
  return skills.filter(
    ({ id, status }) => status === 'active' && skillIds.has(id),
  ).length;
}

export function buildGrowthRoadmap({
  concepts,
  foundations,
  skills,
}: RoadmapInput): GrowthRoadmapStage[] {
  const foundationsByTrack = (
    track: FoundationKnowledge['track'],
  ): FoundationKnowledge[] =>
    foundations.filter(
      (foundation) =>
        foundation.track === track && foundation.domain !== 'fde-methodology',
    );
  const fdeFoundations = foundations.filter(
    ({ domain }) => domain === 'fde-methodology',
  );
  const stage = (
    id: GrowthRoadmapStage['id'],
    stageFoundations: readonly FoundationKnowledge[],
    category: ConceptKnowledge['category'],
  ): GrowthRoadmapStage => {
    const skillIds = new Set(
      stageFoundations.flatMap(({ skills: ids }) => ids),
    );
    return {
      id,
      foundationCount: stageFoundations.length,
      conceptCount: concepts.filter(
        (conceptItem) => conceptItem.category === category,
      ).length,
      skillCount: activeSkillCount(skillIds, skills),
    };
  };
  return [
    stage('level-0', foundationsByTrack('computer-basics'), 'system'),
    stage('level-1', foundationsByTrack('network-api'), 'api-backend'),
    stage('level-2', foundationsByTrack('ai-basics'), 'ai'),
    stage('level-3', fdeFoundations, 'fde'),
  ];
}
