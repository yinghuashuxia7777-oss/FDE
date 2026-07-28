export const ACADEMY_STAGE_IDS = [
  'stage-0',
  'stage-1',
  'stage-2',
  'stage-3',
  'stage-4',
] as const;

export const ACADEMY_SECTION_KINDS = [
  'overview',
  'mechanism',
  'scenario',
  'pitfalls',
  'hands-on',
] as const;

export type AcademyStageId = (typeof ACADEMY_STAGE_IDS)[number];

export type AcademySectionKind = (typeof ACADEMY_SECTION_KINDS)[number];

export interface AcademySection {
  readonly kind: AcademySectionKind;
  readonly title: string;
  readonly content: string;
}

export interface AcademySourceReference {
  readonly title: string;
  readonly url: string;
  readonly retrievedAt: string;
}

export interface AcademyTopic {
  readonly id: string;
  readonly stageId: AcademyStageId;
  readonly title: string;
  readonly summary: string;
  readonly estimatedMinutes: number;
  readonly tags: readonly string[];
  readonly sections: readonly AcademySection[];
  readonly relatedFoundationIds: readonly string[];
  readonly relatedPracticeIds: readonly string[];
  readonly relatedCaseIds: readonly string[];
  readonly relatedSkillIds: readonly string[];
  readonly sourceRefs: readonly AcademySourceReference[];
}

export interface AcademyStage {
  readonly id: AcademyStageId;
  readonly topicIds: readonly string[];
}

export interface AcademyCatalog {
  readonly schemaVersion: 1;
  readonly locale: 'zh-CN';
  readonly stages: readonly AcademyStage[];
}

export interface AcademyTool {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string;
  readonly tags: readonly string[];
  readonly relatedTopicIds: readonly string[];
}

export interface AcademyContentCollection {
  readonly catalog: AcademyCatalog;
  readonly topics: readonly AcademyTopic[];
  readonly tools: readonly AcademyTool[];
}
