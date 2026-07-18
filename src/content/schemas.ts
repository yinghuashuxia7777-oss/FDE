import { z } from 'zod';

import { FdeCaseSchema } from '../schemas/case.schema';
import { MAX_CASES_PER_PACK, MAX_CONTENT_TEXT_LENGTH } from './contracts';

const IdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const NonEmptyTextSchema = z
  .string()
  .min(1)
  .max(MAX_CONTENT_TEXT_LENGTH)
  .refine(
    (value) =>
      !/<\s*\/?\s*(?:script|iframe|object|embed|svg|math)\b|\bon[a-z]+\s*=|javascript\s*:/i.test(
        value,
      ),
    'Executable HTML and javascript URLs are forbidden.',
  );
const UniqueIdListSchema = z
  .array(IdSchema)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'IDs must be unique.',
  });
const SemanticVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const Sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const DomainDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: IdSchema,
    label: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    status: z.enum(['active', 'deprecated']),
  })
  .strict();

export const SkillDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: IdSchema,
    domainId: IdSchema,
    label: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    status: z.enum(['active', 'deprecated']),
  })
  .strict();

export const CoveragePlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    targetCaseCount: z.number().int().nonnegative(),
    domains: z
      .array(
        z
          .object({
            domainId: IdSchema,
            targetCaseCount: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((coverage, context) => {
    const ids = coverage.domains.map(({ domainId }) => domainId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Coverage domain IDs must be unique.',
        path: ['domains'],
      });
    }
    const total = coverage.domains.reduce(
      (sum, entry) => sum + entry.targetCaseCount,
      0,
    );
    if (total !== coverage.targetCaseCount) {
      context.addIssue({
        code: 'custom',
        message: 'Coverage domain targets must equal targetCaseCount.',
        path: ['targetCaseCount'],
      });
    }
  });

export const ActiveCaseReferenceSchema = z
  .object({
    caseId: IdSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const ContentConfigSchema = z
  .object({
    packId: IdSchema,
    displayName: NonEmptyTextSchema,
    contentVersion: SemanticVersionSchema,
    releasedAt: z.iso.datetime(),
    activeCases: z.array(ActiveCaseReferenceSchema),
  })
  .strict();

export const ContentManifestCaseSchema = z
  .object({
    caseId: IdSchema,
    version: z.number().int().positive(),
    schemaVersion: z.number().int().positive(),
    status: z.enum(['planned', 'draft', 'reviewed', 'published', 'deprecated']),
    path: z
      .string()
      .regex(
        /^content\/cases\/(?:beginner|intermediate|advanced)\/[a-z0-9./-]+\.json$/,
      )
      .refine((path) => !path.includes('..'), 'Path traversal is forbidden.'),
    contentHash: Sha256Schema,
  })
  .strict();

export const ContentManifestSchema = z
  .object({
    packId: IdSchema,
    displayName: NonEmptyTextSchema,
    contentVersion: SemanticVersionSchema,
    schemaVersion: z.number().int().positive(),
    releasedAt: z.iso.datetime(),
    activePublishedCaseCount: z.number().int().nonnegative(),
    caseVersionCount: z.number().int().nonnegative(),
    activeCases: z.array(ActiveCaseReferenceSchema),
    activeCaseIds: UniqueIdListSchema,
    allCaseIds: UniqueIdListSchema,
    domains: UniqueIdListSchema,
    domainCaseCounts: z.record(IdSchema, z.number().int().nonnegative()),
    cases: z.array(ContentManifestCaseSchema).max(MAX_CASES_PER_PACK),
    checksum: Sha256Schema,
  })
  .strict()
  .superRefine((manifest, context) => {
    if (manifest.caseVersionCount !== manifest.cases.length) {
      context.addIssue({
        code: 'custom',
        message: 'caseVersionCount must equal the number of case entries.',
        path: ['caseVersionCount'],
      });
    }
    if (manifest.activePublishedCaseCount !== manifest.activeCases.length) {
      context.addIssue({
        code: 'custom',
        message: 'activePublishedCaseCount must equal activeCases length.',
        path: ['activePublishedCaseCount'],
      });
    }
    if (
      manifest.activeCaseIds.length !== manifest.activeCases.length ||
      manifest.activeCases.some(
        ({ caseId }, index) => manifest.activeCaseIds[index] !== caseId,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'activeCaseIds must match activeCases in deterministic order.',
        path: ['activeCaseIds'],
      });
    }
  });

export const ContentPackSchema = z
  .object({
    formatVersion: z.literal(1),
    manifest: ContentManifestSchema,
    cases: z.array(FdeCaseSchema).max(MAX_CASES_PER_PACK),
    skills: z.array(SkillDefinitionSchema),
    domains: z.array(DomainDefinitionSchema),
    coverage: CoveragePlanSchema,
  })
  .strict()
  .superRefine((pack, context) => {
    const coveredDomainIds = new Set(
      pack.coverage.domains.map(({ domainId }) => domainId),
    );
    pack.domains.forEach((definition, index) => {
      if (
        definition.status === 'active' &&
        !coveredDomainIds.has(definition.id)
      ) {
        context.addIssue({
          code: 'custom',
          message: `Active domain ${definition.id} is missing from the coverage plan.`,
          path: ['domains', index, 'id'],
        });
      }
    });
  });

export const ActiveContentCatalogSchema = z
  .object({
    packId: IdSchema,
    contentVersion: SemanticVersionSchema,
    schemaVersion: z.number().int().positive(),
    sourceKind: z.enum(['bundled', 'file', 'url', 'database']),
    activeCases: z.array(ActiveCaseReferenceSchema),
    activeDomainIds: UniqueIdListSchema,
    activeSkillIds: UniqueIdListSchema,
    installedAt: z.iso.datetime(),
    checksum: Sha256Schema,
  })
  .strict();

export const ContentPackEnvelopeSchema = z
  .object({
    formatVersion: z.literal(1),
    manifest: ContentManifestSchema,
    cases: z.array(z.unknown()).max(MAX_CASES_PER_PACK),
    skills: z.array(SkillDefinitionSchema),
    domains: z.array(DomainDefinitionSchema),
    coverage: CoveragePlanSchema,
  })
  .strict();
