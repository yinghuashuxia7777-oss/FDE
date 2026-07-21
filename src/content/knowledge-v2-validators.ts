import type { FdeCase } from '../domain/cases/types';
import type { PracticeDefinition } from '../domain/practices/types';
import type { SkillRubricDefinition } from '../domain/skills/rubric-types';
import type {
  LeafSkillDefinition,
  SkillGraphCatalogStatus,
} from '../domain/skills/types';
import {
  type CaseLeafAttributionMap,
  CaseLeafAttributionMapSchema,
} from './case-leaf-attribution-schema';
import { PracticeDefinitionSchema } from './practice-schema';
import {
  INVALID_THRESHOLD_ORDER_MESSAGE,
  SkillRubricCatalogSchema,
} from './skill-rubric-schema';

export interface KnowledgeV2ValidationIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

export interface RubricValidationContext {
  leafSkills: readonly LeafSkillDefinition[];
  skillCatalogStatus: SkillGraphCatalogStatus | null;
}

export interface PracticeValidationContext {
  conceptIds: readonly string[];
  foundationIds: readonly string[];
  leafSkills: readonly LeafSkillDefinition[];
  rubrics: readonly SkillRubricDefinition[];
}

export interface AttributionValidationContext {
  cases: readonly FdeCase[];
  leafSkills: readonly LeafSkillDefinition[];
  rubrics: readonly SkillRubricDefinition[];
}

function sortIssues(
  issues: KnowledgeV2ValidationIssue[],
): KnowledgeV2ValidationIssue[] {
  return issues.sort(
    (left, right) =>
      left.path.join('.').localeCompare(right.path.join('.')) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  );
}

function schemaIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): KnowledgeV2ValidationIssue[] {
  return sortIssues(
    issues.map((issue) => ({
      code:
        issue.message === INVALID_THRESHOLD_ORDER_MESSAGE
          ? 'invalid_threshold_order'
          : 'invalid_schema',
      path: issue.path.map((segment) =>
        typeof segment === 'symbol'
          ? (segment.description ?? 'symbol')
          : segment,
      ),
      message: issue.message,
    })),
  );
}

export function validateSkillRubricCatalog(
  candidate: unknown,
  context: RubricValidationContext,
): KnowledgeV2ValidationIssue[] {
  const parsed = SkillRubricCatalogSchema.safeParse(candidate);
  if (!parsed.success) return schemaIssues(parsed.error.issues);

  const issues: KnowledgeV2ValidationIssue[] = [];
  const leavesById = new Map(context.leafSkills.map((leaf) => [leaf.id, leaf]));
  const rubricSkillKeys = new Set<string>();
  const rubricIdKeys = new Set<string>();

  parsed.data.rubrics.forEach((rubric, index) => {
    const skillKey = `${rubric.skillId}@${rubric.version}`;
    if (rubricSkillKeys.has(skillKey)) {
      issues.push({
        code: 'duplicate_rubric_version',
        path: ['rubrics', index],
        message: `Duplicate rubric skill identity: ${skillKey}.`,
      });
    }
    rubricSkillKeys.add(skillKey);

    const rubricIdKey = `${rubric.id}@${rubric.version}`;
    if (rubricIdKeys.has(rubricIdKey)) {
      issues.push({
        code: 'duplicate_rubric_id_version',
        path: ['rubrics', index],
        message: `Duplicate rubric ID identity: ${rubricIdKey}.`,
      });
    }
    rubricIdKeys.add(rubricIdKey);

    const leaf = leavesById.get(rubric.skillId);
    if (!leaf) {
      issues.push({
        code: 'missing_leaf_skill',
        path: ['rubrics', index, 'skillId'],
        message: `Rubric leaf skill does not exist: ${rubric.skillId}.`,
      });
      return;
    }

    const supportedEvidence = new Set(leaf.evidenceTypes);
    rubric.evidenceTypes.forEach((evidenceType, evidenceIndex) => {
      if (!supportedEvidence.has(evidenceType)) {
        issues.push({
          code: 'unsupported_rubric_evidence_type',
          path: ['rubrics', index, 'evidenceTypes', evidenceIndex],
          message: `Leaf ${leaf.id} does not support ${evidenceType}.`,
        });
      }
    });

    if (rubric.status === 'published' && leaf.status !== 'active') {
      issues.push({
        code: 'published_rubric_inactive_leaf',
        path: ['rubrics', index, 'status'],
        message: `Published rubric ${rubric.id} requires an active leaf skill.`,
      });
    }
  });

  if (parsed.data.status === 'published') {
    if (context.skillCatalogStatus !== 'published') {
      issues.push({
        code: 'published_rubric_catalog_unpublished_skill_catalog',
        path: ['skillCatalogVersion'],
        message:
          'A published rubric catalog requires its exact Skill Catalog release to be published.',
      });
    }

    if (parsed.data.rubrics.length === 0) {
      issues.push({
        code: 'published_catalog_empty',
        path: ['rubrics'],
        message: 'A published rubric catalog cannot be empty.',
      });
    }

    parsed.data.rubrics.forEach((rubric, index) => {
      if (rubric.status !== 'published') {
        issues.push({
          code: 'published_catalog_contains_unpublished_rubric',
          path: ['rubrics', index, 'status'],
          message: `Published rubric catalog contains ${rubric.status} item ${rubric.id}.`,
        });
      }
    });

    context.leafSkills.forEach((leaf) => {
      if (leaf.status !== 'active' || leaf.activeRubricVersion === null) return;

      const matchingPublishedRubrics = parsed.data.rubrics.filter(
        (rubric) =>
          rubric.skillId === leaf.id &&
          rubric.version === leaf.activeRubricVersion &&
          rubric.status === 'published',
      );
      if (matchingPublishedRubrics.length === 0) {
        issues.push({
          code: 'missing_active_leaf_rubric',
          path: ['rubrics'],
          message: `Published catalog is missing active rubric ${leaf.id}@${leaf.activeRubricVersion}.`,
        });
      } else if (matchingPublishedRubrics.length > 1) {
        issues.push({
          code: 'duplicate_active_leaf_rubric',
          path: ['rubrics'],
          message: `Published catalog contains multiple active rubrics for ${leaf.id}@${leaf.activeRubricVersion}.`,
        });
      }
    });
  }

  return sortIssues(issues);
}

type RubricResolution =
  | { kind: 'missing' }
  | { kind: 'ambiguous' }
  | { kind: 'resolved'; rubric: SkillRubricDefinition };

function resolveRubricByIdentity(
  rubrics: readonly SkillRubricDefinition[],
  rubricId: string,
  version: number,
): RubricResolution {
  const candidates = rubrics.filter(
    (rubric) => rubric.id === rubricId && rubric.version === version,
  );
  if (candidates.length === 0) return { kind: 'missing' };
  if (candidates.length > 1) return { kind: 'ambiguous' };
  const rubric = candidates[0];
  return rubric === undefined
    ? { kind: 'missing' }
    : { kind: 'resolved', rubric };
}

export function validatePracticeDefinition(
  candidate: unknown,
  context: PracticeValidationContext,
): KnowledgeV2ValidationIssue[] {
  const parsed = PracticeDefinitionSchema.safeParse(candidate);
  if (!parsed.success) return schemaIssues(parsed.error.issues);

  const practice: PracticeDefinition = parsed.data;
  const issues: KnowledgeV2ValidationIssue[] = [];

  const responseFields = new Set(
    practice.action.responseContract.requiredFields,
  );
  practice.evidenceOutputContract.requiredFields.forEach((field, index) => {
    if (!responseFields.has(field)) {
      issues.push({
        code: 'evidence_field_not_in_response_contract',
        path: ['evidenceOutputContract', 'requiredFields', index],
        message: `Evidence output field ${field} is not produced by the action response contract.`,
      });
    }
  });

  if (practice.evaluation.method === 'deterministic') {
    Object.keys(practice.evaluation.answerContract.expectedFields).forEach(
      (field) => {
        if (!responseFields.has(field)) {
          issues.push({
            code: 'answer_field_not_in_response_contract',
            path: ['evaluation', 'answerContract', 'expectedFields', field],
            message: `Expected answer field ${field} is not produced by the action response contract.`,
          });
        }
      },
    );
  }

  if (!context.conceptIds.includes(practice.primaryConceptId)) {
    issues.push({
      code: 'missing_concept',
      path: ['primaryConceptId'],
      message: `Practice concept does not exist: ${practice.primaryConceptId}.`,
    });
  }

  practice.foundationIds.forEach((foundationId, index) => {
    if (!context.foundationIds.includes(foundationId)) {
      issues.push({
        code: 'missing_foundation',
        path: ['foundationIds', index],
        message: `Practice Foundation does not exist: ${foundationId}.`,
      });
    }
  });

  const leaf = context.leafSkills.find(
    ({ id }) => id === practice.primaryLeafSkillId,
  );
  if (!leaf) {
    issues.push({
      code: 'missing_leaf_skill',
      path: ['primaryLeafSkillId'],
      message: `Practice leaf skill does not exist: ${practice.primaryLeafSkillId}.`,
    });
  }

  const rubricRef = practice.evaluation.rubricRef;
  const rubricResolution = resolveRubricByIdentity(
    context.rubrics,
    rubricRef.rubricId,
    rubricRef.version,
  );
  if (rubricResolution.kind === 'missing') {
    issues.push({
      code: 'missing_rubric',
      path: ['evaluation', 'rubricRef'],
      message: `Practice rubric does not exist: ${rubricRef.rubricId}@${rubricRef.version}.`,
    });
  } else if (rubricResolution.kind === 'ambiguous') {
    issues.push({
      code: 'ambiguous_rubric_reference',
      path: ['evaluation', 'rubricRef'],
      message: `Practice rubric reference is ambiguous: ${rubricRef.rubricId}@${rubricRef.version}.`,
    });
  } else {
    const { rubric } = rubricResolution;
    if (
      rubricRef.skillId !== practice.primaryLeafSkillId ||
      rubric.skillId !== practice.primaryLeafSkillId ||
      rubric.skillId !== rubricRef.skillId
    ) {
      issues.push({
        code: 'rubric_skill_mismatch',
        path: ['evaluation', 'rubricRef', 'skillId'],
        message:
          'Practice, rubric reference, and rubric must target one leaf skill.',
      });
    }

    const rubricCriterionIds = new Set(
      rubric.criteria.map(({ criterionId }) => criterionId),
    );
    practice.evaluation.criterionIds.forEach((criterionId, index) => {
      if (!rubricCriterionIds.has(criterionId)) {
        issues.push({
          code: 'missing_rubric_criterion',
          path: ['evaluation', 'criterionIds', index],
          message: `Rubric criterion does not exist: ${criterionId}.`,
        });
      }
    });

    if (
      !rubric.evidenceTypes.includes(
        practice.evidenceOutputContract.artifactType,
      )
    ) {
      issues.push({
        code: 'incompatible_evidence_type',
        path: ['evidenceOutputContract', 'artifactType'],
        message: `Rubric ${rubric.id} does not accept ${practice.evidenceOutputContract.artifactType}.`,
      });
    }

    if (leaf) {
      rubric.evidenceTypes.forEach((evidenceType) => {
        if (!leaf.evidenceTypes.includes(evidenceType)) {
          issues.push({
            code: 'rubric_evidence_not_supported_by_leaf',
            path: ['evaluation', 'rubricRef'],
            message: `Leaf ${leaf.id} does not support rubric evidence type ${evidenceType}.`,
          });
        }
      });
    }

    if (practice.status === 'published' && rubric.status !== 'published') {
      issues.push({
        code: 'published_practice_unpublished_rubric',
        path: ['evaluation', 'rubricRef'],
        message: 'A published Practice requires a published rubric.',
      });
    }
  }

  if (practice.status === 'published' && leaf?.status !== 'active') {
    issues.push({
      code: 'published_practice_inactive_leaf',
      path: ['primaryLeafSkillId'],
      message: 'A published Practice requires an active leaf skill.',
    });
  }

  return sortIssues(issues);
}

export function validateCaseLeafAttributionMap(
  candidate: unknown,
  context: AttributionValidationContext,
): KnowledgeV2ValidationIssue[] {
  const parsed = CaseLeafAttributionMapSchema.safeParse(candidate);
  if (!parsed.success) return schemaIssues(parsed.error.issues);

  const attributionMap: CaseLeafAttributionMap = parsed.data;
  const issues: KnowledgeV2ValidationIssue[] = [];
  const naturalKeys = new Set<string>();

  attributionMap.entries.forEach((entry, index) => {
    const naturalKey = [
      entry.caseId,
      entry.caseVersion,
      entry.nodeId,
      entry.leafSkillId,
    ].join('|');
    if (naturalKeys.has(naturalKey)) {
      issues.push({
        code: 'duplicate_attribution',
        path: ['entries', index],
        message: `Duplicate attribution: ${naturalKey}.`,
      });
    }
    naturalKeys.add(naturalKey);

    const exactCase = context.cases.find(
      (candidateCase) =>
        candidateCase.id === entry.caseId &&
        candidateCase.metadata.version === entry.caseVersion,
    );
    if (!exactCase) {
      issues.push({
        code: 'missing_case_version',
        path: ['entries', index, 'caseVersion'],
        message: `Exact Case version does not exist: ${entry.caseId}@${entry.caseVersion}.`,
      });
    } else if (!exactCase.nodes.some(({ id }) => id === entry.nodeId)) {
      issues.push({
        code: 'invalid_case_node',
        path: ['entries', index, 'nodeId'],
        message: `Node ${entry.nodeId} does not belong to ${entry.caseId}@${entry.caseVersion}.`,
      });
    }

    const leaf = context.leafSkills.find(({ id }) => id === entry.leafSkillId);
    if (!leaf) {
      issues.push({
        code: 'missing_leaf_skill',
        path: ['entries', index, 'leafSkillId'],
        message: `Attribution leaf skill does not exist: ${entry.leafSkillId}.`,
      });
    } else if (
      attributionMap.status === 'approved' &&
      leaf.status !== 'active'
    ) {
      issues.push({
        code: 'approved_attribution_inactive_leaf',
        path: ['entries', index, 'leafSkillId'],
        message: 'Approved attribution requires an active Leaf Skill.',
      });
    } else if (!leaf.evidenceTypes.includes(entry.evidenceType)) {
      issues.push({
        code: 'unsupported_attribution_evidence_type',
        path: ['entries', index, 'evidenceType'],
        message: `Leaf ${leaf.id} does not support ${entry.evidenceType}.`,
      });
    }

    if (
      attributionMap.status === 'approved' &&
      leaf &&
      leaf.activeRubricVersion !== entry.rubricVersion
    ) {
      issues.push({
        code: 'approved_attribution_inactive_rubric_version',
        path: ['entries', index, 'rubricVersion'],
        message: `Approved attribution must use active rubric version ${String(leaf.activeRubricVersion)}.`,
      });
    }

    const matchingRubrics = context.rubrics.filter(
      (candidateRubric) =>
        candidateRubric.skillId === entry.leafSkillId &&
        candidateRubric.version === entry.rubricVersion,
    );
    const rubric = matchingRubrics[0];
    if (matchingRubrics.length === 0) {
      issues.push({
        code: 'missing_rubric',
        path: ['entries', index, 'rubricVersion'],
        message: `Attribution rubric does not exist: ${entry.leafSkillId}@${entry.rubricVersion}.`,
      });
    } else if (matchingRubrics.length > 1) {
      issues.push({
        code: 'ambiguous_rubric_reference',
        path: ['entries', index, 'rubricVersion'],
        message: `Attribution rubric reference is ambiguous: ${entry.leafSkillId}@${entry.rubricVersion}.`,
      });
    } else if (
      attributionMap.status === 'approved' &&
      rubric?.status !== 'published'
    ) {
      issues.push({
        code: 'approved_attribution_unpublished_rubric',
        path: ['entries', index, 'rubricVersion'],
        message: 'Approved attribution requires a published rubric.',
      });
    } else if (rubric && !rubric.evidenceTypes.includes(entry.evidenceType)) {
      issues.push({
        code: 'rubric_attribution_evidence_mismatch',
        path: ['entries', index, 'evidenceType'],
        message: `Rubric ${rubric.id} does not accept ${entry.evidenceType}.`,
      });
    }
  });

  return sortIssues(issues);
}
