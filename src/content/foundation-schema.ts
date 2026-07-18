import { z } from 'zod';

import type { FoundationKnowledge } from '../domain/foundation/types';

const MAX_IDENTIFIER_LENGTH = 160;
const MAX_TITLE_LENGTH = 240;
const MAX_AUTHORED_TEXT_LENGTH = 50_000;
const MAX_REFERENCE_COUNT = 100;
const MAX_FOUNDATION_ORDER = 10_000;
const MAX_ESTIMATED_MINUTES = 24 * 60;

const LOWERCASE_DOT_DASH_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
export const FOUNDATION_AUTHORED_TEXT_PATTERN =
  /^(?=[\s\S]*\S)(?![\s\S]*(?:<\s*\/?\s*(?:[sS][cC][rR][iI][pP][tT]|[iI][fF][rR][aA][mM][eE]|[oO][bB][jJ][eE][cC][tT]|[eE][mM][bB][eE][dD]|[aA][pP][pP][lL][eE][tT])\b|\b[oO][nN][a-zA-Z]+\s*=|(?:[jJ][aA][vV][aA]|[vV][bB])[sS][cC][rR][iI][pP][tT]\s*:|[dD][aA][tT][aA]\s*:\s*[tT][eE][xX][tT]\/[hH][tT][mM][lL]))[\s\S]*$/;

const IdentifierSchema = z
  .string()
  .min(1)
  .max(MAX_IDENTIFIER_LENGTH)
  .regex(
    LOWERCASE_DOT_DASH_ID,
    'Expected a lowercase identifier containing only dots and dashes.',
  );

function authoredText(maxLength = MAX_AUTHORED_TEXT_LENGTH) {
  return z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .regex(
      FOUNDATION_AUTHORED_TEXT_PATTERN,
      'Executable or blank authored text is forbidden.',
    );
}

function uniqueReferences(label: string) {
  return z
    .array(IdentifierSchema)
    .min(1)
    .max(MAX_REFERENCE_COUNT)
    .superRefine((ids, context) => {
      const seen = new Set<string>();

      ids.forEach((id, index) => {
        if (seen.has(id)) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `Duplicate ${label} ID: ${id}`,
          });
        }
        seen.add(id);
      });
    });
}

const FoundationContentSchema = z
  .object({
    simpleExplanation: authoredText(),
    analogy: authoredText(),
    technicalExplanation: authoredText(),
    example: authoredText(),
    commonMistakes: authoredText(),
  })
  .strict();

export const FoundationKnowledgeSchema: z.ZodType<FoundationKnowledge> = z
  .object({
    schemaVersion: z.literal(1),
    id: IdentifierSchema,
    type: z.literal('foundation'),
    title: authoredText(MAX_TITLE_LENGTH),
    domain: IdentifierSchema,
    track: z.enum(['computer-basics', 'network-api', 'ai-basics']),
    skills: uniqueReferences('Skill'),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    order: z.number().int().min(1).max(MAX_FOUNDATION_ORDER),
    estimatedMinutes: z.number().int().min(1).max(MAX_ESTIMATED_MINUTES),
    content: FoundationContentSchema,
    relatedCases: uniqueReferences('Case'),
  })
  .strict();
