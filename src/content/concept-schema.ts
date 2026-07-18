import { z } from 'zod';

import type { ConceptKnowledge } from '../domain/concepts/types';

const MAX_IDENTIFIER_LENGTH = 160;
const MAX_TITLE_LENGTH = 240;
const MAX_TERM_LENGTH = 160;
const MAX_AUTHORED_TEXT_LENGTH = 50_000;
const MAX_REFERENCE_COUNT = 100;
const MAX_CONCEPT_ORDER = 10_000;
const LOWERCASE_DOT_DASH_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
export const CONCEPT_AUTHORED_TEXT_PATTERN =
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
      CONCEPT_AUTHORED_TEXT_PATTERN,
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

export const ConceptKnowledgeSchema: z.ZodType<ConceptKnowledge> = z
  .object({
    schemaVersion: z.literal(1),
    id: IdentifierSchema,
    type: z.literal('concept'),
    category: z.enum(['api-backend', 'system', 'ai', 'fde']),
    order: z.number().int().min(1).max(MAX_CONCEPT_ORDER),
    title: authoredText(MAX_TITLE_LENGTH),
    technicalTerm: authoredText(MAX_TERM_LENGTH),
    simpleExplanation: authoredText(),
    analogy: authoredText(),
    technicalExplanation: authoredText(),
    whyItMatters: authoredText(),
    commonMistakes: authoredText(),
    relatedFoundation: uniqueReferences('Foundation'),
    relatedCases: uniqueReferences('Case'),
  })
  .strict();
