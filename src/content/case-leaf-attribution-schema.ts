import { z } from 'zod';

import { SkillGraphIdentifierSchema } from './skill-graph-schema';

const MAX_AUTHORED_TEXT_LENGTH = 10_000;
const MAX_ATTRIBUTIONS = 10_000;

const AuthoredTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_AUTHORED_TEXT_LENGTH);

export type CaseLeafAttributionRole = 'primary' | 'secondary';

export interface CaseLeafAttributionEntry {
  caseId: string;
  caseVersion: number;
  nodeId: string;
  leafSkillId: string;
  rubricVersion: number;
  role: CaseLeafAttributionRole;
  evidenceType: string;
  rationale: string;
  reviewer: string;
}

export interface CaseLeafAttributionMap {
  schemaVersion: 1;
  skillCatalogVersion: string;
  rubricSetVersion: string;
  mapId: string;
  mapVersion: number;
  status: 'draft' | 'approved' | 'superseded' | 'revoked';
  entries: CaseLeafAttributionEntry[];
}

export const CaseLeafAttributionEntrySchema: z.ZodType<CaseLeafAttributionEntry> =
  z
    .object({
      caseId: SkillGraphIdentifierSchema,
      caseVersion: z.number().int().positive(),
      nodeId: SkillGraphIdentifierSchema,
      leafSkillId: SkillGraphIdentifierSchema,
      rubricVersion: z.number().int().positive(),
      role: z.enum(['primary', 'secondary']),
      evidenceType: SkillGraphIdentifierSchema,
      rationale: AuthoredTextSchema,
      reviewer: AuthoredTextSchema,
    })
    .strict();

export const CaseLeafAttributionMapSchema: z.ZodType<CaseLeafAttributionMap> = z
  .object({
    schemaVersion: z.literal(1),
    skillCatalogVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    rubricSetVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    mapId: SkillGraphIdentifierSchema,
    mapVersion: z.number().int().positive(),
    status: z.enum(['draft', 'approved', 'superseded', 'revoked']),
    entries: z.array(CaseLeafAttributionEntrySchema).max(MAX_ATTRIBUTIONS),
  })
  .strict();
