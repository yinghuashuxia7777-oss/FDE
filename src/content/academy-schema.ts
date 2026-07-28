import { z } from 'zod';

import {
  ACADEMY_SECTION_KINDS,
  ACADEMY_STAGE_IDS,
  type AcademyCatalog,
  type AcademyContentCollection,
  type AcademySection,
  type AcademySourceReference,
  type AcademyTool,
  type AcademyTopic,
} from '../domain/academy/types';

const authoredString = z
  .string()
  .min(1, 'Authored string must not be empty.')
  .refine((value) => value === value.trim(), {
    message: 'Authored string must be trimmed.',
  });

const authoredStringArray = z.array(authoredString);

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const AcademySectionSchema: z.ZodType<AcademySection> = z
  .object({
    kind: z.enum(ACADEMY_SECTION_KINDS),
    title: authoredString,
    content: authoredString,
  })
  .strict();

export const AcademySourceReferenceSchema: z.ZodType<AcademySourceReference> = z
  .object({
    title: authoredString,
    url: authoredString
      .refine((value) => URL.canParse(value), {
        message: 'Source URL must be a valid URL.',
      })
      .refine((value) => value.startsWith('https://www.runoob.com/'), {
        message: 'Source URL must begin with https://www.runoob.com/.',
      }),
    retrievedAt: authoredString.regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'retrievedAt must be an ISO date (YYYY-MM-DD).',
    ),
  })
  .strict();

export const AcademyTopicSchema: z.ZodType<AcademyTopic> = z
  .object({
    id: authoredString,
    stageId: z.enum(ACADEMY_STAGE_IDS),
    title: authoredString,
    summary: authoredString,
    estimatedMinutes: z.number().int().min(3).max(45),
    tags: authoredStringArray,
    sections: z.array(AcademySectionSchema).length(5),
    relatedFoundationIds: authoredStringArray,
    relatedPracticeIds: authoredStringArray,
    relatedCaseIds: authoredStringArray,
    relatedSkillIds: authoredStringArray,
    sourceRefs: z.array(AcademySourceReferenceSchema).min(1),
  })
  .strict()
  .superRefine((topic, context) => {
    const sectionKinds = topic.sections.map(({ kind }) => kind);
    if (
      !hasUniqueValues(sectionKinds) ||
      ACADEMY_SECTION_KINDS.some((kind) => !sectionKinds.includes(kind))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['sections'],
        message: 'Each Academy section kind must appear exactly once.',
      });
    }

    const growthConnectionCount =
      topic.relatedFoundationIds.length +
      topic.relatedPracticeIds.length +
      topic.relatedCaseIds.length +
      topic.relatedSkillIds.length;
    if (growthConnectionCount === 0) {
      context.addIssue({
        code: 'custom',
        path: ['relatedFoundationIds'],
        message: 'Topic must declare at least one growth connection.',
      });
    }
  });

const AcademyStageSchema = z
  .object({
    id: z.enum(ACADEMY_STAGE_IDS),
    topicIds: authoredStringArray.refine(hasUniqueValues, {
      message: 'Stage topic IDs must be unique.',
    }),
  })
  .strict();

export const AcademyCatalogSchema: z.ZodType<AcademyCatalog> = z
  .object({
    schemaVersion: z.literal(1),
    locale: z.literal('zh-CN'),
    stages: z.array(AcademyStageSchema).length(ACADEMY_STAGE_IDS.length),
  })
  .strict()
  .superRefine((catalog, context) => {
    const stageIds = catalog.stages.map(({ id }) => id);
    if (
      ACADEMY_STAGE_IDS.some((stageId, index) => stageIds[index] !== stageId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['stages'],
        message: 'Catalog must contain the approved five ordered stage IDs.',
      });
    }
  });

export const AcademyToolSchema: z.ZodType<AcademyTool> = z
  .object({
    id: authoredString,
    title: authoredString,
    summary: authoredString,
    url: authoredString.refine(
      (value) => URL.canParse(value) && value.startsWith('https://'),
      { message: 'Tool URL must be a valid HTTPS URL.' },
    ),
    tags: authoredStringArray,
    relatedTopicIds: authoredStringArray,
  })
  .strict();

export const AcademyContentCollectionSchema: z.ZodType<AcademyContentCollection> =
  z
    .object({
      catalog: AcademyCatalogSchema,
      topics: z.array(AcademyTopicSchema),
      tools: z.array(AcademyToolSchema),
    })
    .strict()
    .superRefine((collection, context) => {
      const topicIds = collection.topics.map(({ id }) => id);
      if (!hasUniqueValues(topicIds)) {
        context.addIssue({
          code: 'custom',
          path: ['topics'],
          message: 'Academy collection contains a duplicate Topic ID.',
        });
      }

      const toolIds = collection.tools.map(({ id }) => id);
      if (!hasUniqueValues(toolIds)) {
        context.addIssue({
          code: 'custom',
          path: ['tools'],
          message: 'Academy collection contains a duplicate Tool ID.',
        });
      }
    });
