import { z } from 'zod';

import definitionsJson from '../../content/fde-delivery/templates.json';
import type {
  FdeDeliveryCatalog,
  FdeDeliveryRelatedLink,
  FdeDeliveryTemplate,
} from '../domain/delivery/types';
import { deepFreeze } from './deep-freeze';

const DELIVERY_STAGE_IDS = [
  'discover',
  'define-value',
  'design',
  'activate',
  'review-reuse',
] as const;

const DeliveryStageIdSchema = z.enum(DELIVERY_STAGE_IDS);

const DeliveryRelatedLinkSchema: z.ZodType<FdeDeliveryRelatedLink> = z
  .object({
    kind: z.enum(['practice', 'academy', 'project']),
    label: z.string().trim().min(1).max(120),
    href: z.string().trim().min(1).max(300),
  })
  .strict()
  .superRefine((link, refinement) => {
    const expectedPrefixes = {
      practice: '/practices/practice.',
      academy: '/academy/academy.',
      project: '/projects/project.',
    } as const;

    if (!link.href.startsWith(expectedPrefixes[link.kind])) {
      refinement.addIssue({
        code: 'custom',
        path: ['href'],
        message: `Invalid ${link.kind} delivery link.`,
      });
    }
  });

const DeliveryStageSchema = z
  .object({
    id: DeliveryStageIdSchema,
    title: z.string().trim().min(1).max(120),
    artifactLabel: z.string().trim().min(1).max(120),
    prompt: z.string().trim().min(1).max(2_000),
    whatThisProves: z.string().trim().min(1).max(500),
    relatedLinks: z.array(DeliveryRelatedLinkSchema).min(1).max(8),
  })
  .strict();

const DeliveryTemplateSchema = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^project\.[a-z0-9-]+$/),
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(1_000),
    attributionUrl: z.string().url().startsWith('https://'),
    stages: z.array(DeliveryStageSchema).length(DELIVERY_STAGE_IDS.length),
  })
  .strict()
  .superRefine((template, refinement) => {
    template.stages.forEach((stage, index) => {
      if (stage.id !== DELIVERY_STAGE_IDS[index]) {
        refinement.addIssue({
          code: 'custom',
          path: ['stages', index, 'id'],
          message: `Expected delivery stage ${DELIVERY_STAGE_IDS[index]}.`,
        });
      }
    });
  });

const FdeDeliveryCatalogSchema: z.ZodType<FdeDeliveryCatalog> = z
  .object({
    schemaVersion: z.literal(1),
    templates: z.array(DeliveryTemplateSchema).length(3),
  })
  .strict()
  .superRefine((catalog, refinement) => {
    const seenIds = new Set<string>();
    catalog.templates.forEach((template, index) => {
      if (seenIds.has(template.id)) {
        refinement.addIssue({
          code: 'custom',
          path: ['templates', index, 'id'],
          message: `Duplicate delivery template ID: ${template.id}.`,
        });
      }
      seenIds.add(template.id);
    });
  });

export interface FdeDeliverySource {
  loadAll(): readonly FdeDeliveryTemplate[];
  findById(id: string): FdeDeliveryTemplate | undefined;
}

export class StaticFdeDeliverySource implements FdeDeliverySource {
  private readonly snapshot: readonly FdeDeliveryTemplate[];
  private readonly templatesById: ReadonlyMap<string, FdeDeliveryTemplate>;

  constructor(value: unknown) {
    const catalog = FdeDeliveryCatalogSchema.parse(value);
    this.snapshot = deepFreeze(catalog.templates);
    this.templatesById = new Map(
      this.snapshot.map((template) => [template.id, template]),
    );
  }

  loadAll(): readonly FdeDeliveryTemplate[] {
    return this.snapshot;
  }

  findById(id: string): FdeDeliveryTemplate | undefined {
    return this.templatesById.get(id);
  }
}

export const bundledFdeDeliverySource: FdeDeliverySource =
  new StaticFdeDeliverySource(definitionsJson);
