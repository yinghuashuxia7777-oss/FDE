import { z } from 'zod';

const NonEmptyStringSchema = z.string().min(1);
const StringListSchema = z.array(NonEmptyStringSchema).min(1);
const NonEmptyUniqueIdListSchema = z
  .array(NonEmptyStringSchema)
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'IDs must be unique.',
  })
  .meta({ uniqueItems: true });
const UniqueIdListSchema = z
  .array(NonEmptyStringSchema)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'IDs must be unique.',
  })
  .meta({ uniqueItems: true });

export const EvidenceSchema = z
  .object({
    id: NonEmptyStringSchema,
    type: z.enum([
      'text',
      'log',
      'terminal',
      'http',
      'json',
      'diff',
      'config',
      'metric',
      'diagram',
      'customer-message',
    ]),
    title: NonEmptyStringSchema.optional(),
    content: NonEmptyStringSchema,
    language: NonEmptyStringSchema.optional(),
  })
  .strict();

export const OptionSchema = z
  .object({
    id: NonEmptyStringSchema,
    label: NonEmptyStringSchema,
    explanation: NonEmptyStringSchema,
    errorType: NonEmptyStringSchema.optional(),
  })
  .strict();

export const FeedbackSchema = z
  .object({
    firstWrong: NonEmptyStringSchema,
    secondWrong: NonEmptyStringSchema,
    revealedAnswer: NonEmptyStringSchema,
  })
  .strict();

export const ScoringSchema = z
  .object({
    firstTry: z.number().min(0).max(100),
    secondTry: z.number().min(0).max(100),
    thirdTry: z.number().min(0).max(100),
    weight: z.number().positive(),
    criticalErrorOptionIds: UniqueIdListSchema.optional(),
  })
  .strict();

export const ConsequenceSchema = z
  .object({
    optionId: NonEmptyStringSchema,
    timeDelta: z.number().optional(),
    costDelta: z.number().optional(),
    trustDelta: z.number().optional(),
    riskDelta: z.number().optional(),
    message: NonEmptyStringSchema.optional(),
  })
  .strict();

export const BranchSchema = z
  .object({
    key: NonEmptyStringSchema,
    nextNodeId: NonEmptyStringSchema.nullable(),
  })
  .strict();

const SkillWeightsSchema = z
  .record(NonEmptyStringSchema, z.number().finite().positive())
  .refine((skillWeights) => Object.keys(skillWeights).length > 0, {
    message: 'Skill weights must contain at least one skill.',
  })
  .refine(
    (skillWeights) =>
      Math.abs(
        Object.values(skillWeights).reduce(
          (total, weight) => total + weight,
          0,
        ) - 1,
      ) <= 1e-9,
    { message: 'Skill weights must total one.' },
  )
  .meta({ minProperties: 1 });

const SharedNodeShape = {
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema.optional(),
  prompt: NonEmptyStringSchema,
  skillWeights: SkillWeightsSchema,
  evidence: z.array(EvidenceSchema),
  options: z.array(OptionSchema).min(1),
  feedback: FeedbackSchema,
  scoring: ScoringSchema,
  consequences: z.array(ConsequenceSchema).optional(),
  branches: z.array(BranchSchema),
};

const ChoiceFamilyNodeSchema = z
  .object({
    ...SharedNodeShape,
    type: z.enum([
      'single-choice',
      'true-false',
      'log-analysis',
      'command-choice',
      'diff-review',
      'configuration-review',
      'architecture-tradeoff',
      'customer-response',
    ]),
    answer: z
      .object({
        correctOptionId: NonEmptyStringSchema,
      })
      .strict(),
  })
  .strict();

const MultipleChoiceNodeSchema = z
  .object({
    ...SharedNodeShape,
    type: z.literal('multiple-choice'),
    answer: z
      .object({
        correctOptionIds: NonEmptyUniqueIdListSchema,
      })
      .strict(),
  })
  .strict();

const OrderingNodeSchema = z
  .object({
    ...SharedNodeShape,
    type: z.literal('ordering'),
    answer: z
      .object({
        orderedOptionIds: NonEmptyUniqueIdListSchema,
        priorityOptionIds: UniqueIdListSchema.optional(),
        hazardousOptionIds: UniqueIdListSchema.optional(),
      })
      .strict(),
  })
  .strict();

const MatchingNodeSchema = z
  .object({
    ...SharedNodeShape,
    type: z.literal('matching'),
    answer: z
      .object({
        pairs: z
          .record(NonEmptyStringSchema, NonEmptyStringSchema)
          .refine((pairs) => Object.keys(pairs).length > 0, {
            message: 'Matching answers must contain at least one pair.',
          }),
      })
      .strict(),
  })
  .strict();

const EvidenceConclusionNodeSchema = z
  .object({
    ...SharedNodeShape,
    type: z.literal('evidence-conclusion'),
    answer: z
      .object({
        conclusionId: NonEmptyStringSchema,
        evidenceIds: NonEmptyUniqueIdListSchema,
      })
      .strict(),
  })
  .strict();

export const CaseNodeSchema = z.discriminatedUnion('type', [
  ChoiceFamilyNodeSchema,
  MultipleChoiceNodeSchema,
  OrderingNodeSchema,
  MatchingNodeSchema,
  EvidenceConclusionNodeSchema,
]);

export const NodeSubmissionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('choice'),
      selectedOptionIds: NonEmptyUniqueIdListSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('ordering'),
      orderedOptionIds: NonEmptyUniqueIdListSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('matching'),
      pairs: z
        .record(NonEmptyStringSchema, NonEmptyStringSchema)
        .refine((pairs) => Object.keys(pairs).length > 0, {
          message: 'Matching submissions must contain at least one pair.',
        }),
    })
    .strict(),
  z
    .object({
      type: z.literal('evidence-conclusion'),
      conclusionId: NonEmptyStringSchema,
      evidenceIds: NonEmptyUniqueIdListSchema,
    })
    .strict(),
]);

export const DebriefSchema = z
  .object({
    summary: NonEmptyStringSchema,
    rootCause: NonEmptyStringSchema,
    correctApproach: StringListSchema,
    keyLessons: StringListSchema,
    interviewerPerspective: NonEmptyStringSchema,
    customerRiskPerspective: NonEmptyStringSchema,
    remediation: StringListSchema,
    verification: StringListSchema,
    knowledgePoints: StringListSchema,
    recommendedCaseIds: StringListSchema.optional(),
  })
  .strict();

export const CaseMetadataSchema = z
  .object({
    version: z.number().int().positive(),
    sourceType: NonEmptyStringSchema,
    sourceReferences: z.array(NonEmptyStringSchema).optional(),
    createdAt: z.iso.datetime(),
    reviewedAt: z.iso.datetime().optional(),
    applicableVersions: z.array(NonEmptyStringSchema).optional(),
    author: NonEmptyStringSchema,
    reviewer: NonEmptyStringSchema.optional(),
  })
  .strict();

export const ReviewedCaseMetadataSchema = CaseMetadataSchema.extend({
  reviewedAt: z.iso.datetime(),
  reviewer: NonEmptyStringSchema,
}).strict();

const SharedCaseShape = {
  id: NonEmptyStringSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  estimatedMinutes: z.number().int().positive(),
  domains: StringListSchema,
  skills: StringListSchema,
  lifecycleStages: StringListSchema,
  technicalLayers: StringListSchema,
  environments: StringListSchema,
  riskTypes: StringListSchema,
  behaviorPatterns: StringListSchema,
  scenario: z
    .object({
      customerProfile: NonEmptyStringSchema,
      background: NonEmptyStringSchema,
      initialIncident: NonEmptyStringSchema,
      constraints: z.array(NonEmptyStringSchema),
      confirmedFacts: z.array(NonEmptyStringSchema),
    })
    .strict(),
  startNodeId: NonEmptyStringSchema,
  nodes: z.array(CaseNodeSchema).min(1),
  debrief: DebriefSchema,
};

const UnreviewedFdeCaseSchema = z
  .object({
    ...SharedCaseShape,
    status: z.enum(['planned', 'draft', 'deprecated']),
    metadata: CaseMetadataSchema,
  })
  .strict();

const ReviewedFdeCaseSchema = z
  .object({
    ...SharedCaseShape,
    status: z.enum(['reviewed', 'published']),
    metadata: ReviewedCaseMetadataSchema,
  })
  .strict();

export const FdeCaseSchema = z
  .discriminatedUnion('status', [
    UnreviewedFdeCaseSchema,
    ReviewedFdeCaseSchema,
  ])
  .superRefine((fdeCase, context) => {
    const nodeIds = new Set<string>();
    const optionIds = new Set<string>();
    const evidenceIds = new Set<string>();

    fdeCase.nodes.forEach((node, nodeIndex) => {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate node ID: ${node.id}`,
          path: ['nodes', nodeIndex, 'id'],
        });
      }
      nodeIds.add(node.id);

      node.options.forEach((option, optionIndex) => {
        if (optionIds.has(option.id)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate option ID: ${option.id}`,
            path: ['nodes', nodeIndex, 'options', optionIndex, 'id'],
          });
        }
        optionIds.add(option.id);
      });

      node.evidence.forEach((evidence, evidenceIndex) => {
        if (evidenceIds.has(evidence.id)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate evidence ID: ${evidence.id}`,
            path: ['nodes', nodeIndex, 'evidence', evidenceIndex, 'id'],
          });
        }
        evidenceIds.add(evidence.id);
      });

      Object.keys(node.skillWeights).forEach((skillId) => {
        if (!fdeCase.skills.includes(skillId)) {
          context.addIssue({
            code: 'custom',
            message: `Skill does not exist on case ${fdeCase.id}: ${skillId}`,
            path: ['nodes', nodeIndex, 'skillWeights', skillId],
          });
        }
      });
    });

    if (!nodeIds.has(fdeCase.startNodeId)) {
      context.addIssue({
        code: 'custom',
        message: `Start node does not exist: ${fdeCase.startNodeId}`,
        path: ['startNodeId'],
      });
    }

    fdeCase.nodes.forEach((node, nodeIndex) => {
      const localOptionIds = new Set(node.options.map(({ id }) => id));
      const localEvidenceIds = new Set(node.evidence.map(({ id }) => id));
      const addMissingOptionIssue = (
        optionId: string,
        path: (string | number)[],
      ) => {
        if (!localOptionIds.has(optionId)) {
          context.addIssue({
            code: 'custom',
            message: `Option does not exist on node ${node.id}: ${optionId}`,
            path,
          });
        }
      };
      const addMissingEvidenceIssue = (
        evidenceId: string,
        path: (string | number)[],
      ) => {
        if (!localEvidenceIds.has(evidenceId)) {
          context.addIssue({
            code: 'custom',
            message: `Evidence does not exist on node ${node.id}: ${evidenceId}`,
            path,
          });
        }
      };
      const answerPath = ['nodes', nodeIndex, 'answer'] as const;

      switch (node.type) {
        case 'multiple-choice':
          node.answer.correctOptionIds.forEach((optionId, optionIndex) => {
            addMissingOptionIssue(optionId, [
              ...answerPath,
              'correctOptionIds',
              optionIndex,
            ]);
          });
          break;
        case 'ordering':
          node.answer.orderedOptionIds.forEach((optionId, optionIndex) => {
            addMissingOptionIssue(optionId, [
              ...answerPath,
              'orderedOptionIds',
              optionIndex,
            ]);
          });
          if (
            node.answer.orderedOptionIds.length !== localOptionIds.size ||
            ![...localOptionIds].every((optionId) =>
              node.answer.orderedOptionIds.includes(optionId),
            )
          ) {
            context.addIssue({
              code: 'custom',
              message: `Ordering answer must contain every option on node ${node.id} exactly once.`,
              path: [...answerPath, 'orderedOptionIds'],
            });
          }
          node.answer.priorityOptionIds?.forEach((optionId, optionIndex) => {
            addMissingOptionIssue(optionId, [
              ...answerPath,
              'priorityOptionIds',
              optionIndex,
            ]);
          });
          node.answer.hazardousOptionIds?.forEach((optionId, optionIndex) => {
            addMissingOptionIssue(optionId, [
              ...answerPath,
              'hazardousOptionIds',
              optionIndex,
            ]);
          });
          break;
        case 'matching': {
          const leftOptionIds = Object.keys(node.answer.pairs);
          const rightOptionIds = Object.values(node.answer.pairs);
          const rightOptionIdSet = new Set(rightOptionIds);
          const participationCounts = new Map<string, number>();

          [...leftOptionIds, ...rightOptionIds].forEach((optionId) => {
            participationCounts.set(
              optionId,
              (participationCounts.get(optionId) ?? 0) + 1,
            );
          });

          if (rightOptionIdSet.size !== rightOptionIds.length) {
            context.addIssue({
              code: 'custom',
              message: `Matching right-side options must be unique on node ${node.id}.`,
              path: [...answerPath, 'pairs'],
            });
          }
          if (
            participationCounts.size !== localOptionIds.size ||
            ![...localOptionIds].every(
              (optionId) => participationCounts.get(optionId) === 1,
            )
          ) {
            context.addIssue({
              code: 'custom',
              message: `Every matching option on node ${node.id} must participate exactly once.`,
              path: [...answerPath, 'pairs'],
            });
          }
          Object.entries(node.answer.pairs).forEach(
            ([leftOptionId, rightOptionId]) => {
              addMissingOptionIssue(leftOptionId, [
                ...answerPath,
                'pairs',
                leftOptionId,
              ]);
              addMissingOptionIssue(rightOptionId, [
                ...answerPath,
                'pairs',
                leftOptionId,
              ]);
            },
          );
          break;
        }
        case 'evidence-conclusion':
          addMissingOptionIssue(node.answer.conclusionId, [
            ...answerPath,
            'conclusionId',
          ]);
          node.answer.evidenceIds.forEach((evidenceId, evidenceIndex) => {
            addMissingEvidenceIssue(evidenceId, [
              ...answerPath,
              'evidenceIds',
              evidenceIndex,
            ]);
          });
          break;
        default:
          addMissingOptionIssue(node.answer.correctOptionId, [
            ...answerPath,
            'correctOptionId',
          ]);
      }

      node.scoring.criticalErrorOptionIds?.forEach((optionId, optionIndex) => {
        addMissingOptionIssue(optionId, [
          'nodes',
          nodeIndex,
          'scoring',
          'criticalErrorOptionIds',
          optionIndex,
        ]);
      });
      node.consequences?.forEach((consequence, consequenceIndex) => {
        addMissingOptionIssue(consequence.optionId, [
          'nodes',
          nodeIndex,
          'consequences',
          consequenceIndex,
          'optionId',
        ]);
      });
      node.branches.forEach((branch, branchIndex) => {
        if (branch.nextNodeId !== null && !nodeIds.has(branch.nextNodeId)) {
          context.addIssue({
            code: 'custom',
            message: `Branch node does not exist: ${branch.nextNodeId}`,
            path: ['nodes', nodeIndex, 'branches', branchIndex, 'nextNodeId'],
          });
        }
      });
    });
  });
