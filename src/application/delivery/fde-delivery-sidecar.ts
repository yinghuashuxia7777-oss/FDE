import { z } from 'zod';

import type {
  FdeDeliveryRecord,
  FdeDeliveryStore,
} from '../../domain/delivery/types';

export const FDE_DELIVERY_STORAGE_KEY =
  'fde-arena:fde-delivery:artifacts:v1' as const;

const DeliveryStageIdSchema = z.enum([
  'discover',
  'define-value',
  'design',
  'activate',
  'review-reuse',
]);

const FdeDeliveryRecordSchema: z.ZodType<FdeDeliveryRecord> = z
  .object({
    templateId: z.string().min(1),
    artifacts: z.partialRecord(DeliveryStageIdSchema, z.string()),
    completedStageIds: z.array(DeliveryStageIdSchema).max(5),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((record, refinement) => {
    if (
      new Set(record.completedStageIds).size !== record.completedStageIds.length
    ) {
      refinement.addIssue({
        code: 'custom',
        path: ['completedStageIds'],
        message: 'Completed delivery stage IDs must be unique.',
      });
    }
  });

const FdeDeliveryRecordsSchema = z.array(FdeDeliveryRecordSchema);

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

function emptyRecord(templateId: string): FdeDeliveryRecord {
  return {
    templateId,
    artifacts: {},
    completedStageIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function readRecords(): FdeDeliveryRecord[] {
  try {
    const raw = storage()?.getItem(FDE_DELIVERY_STORAGE_KEY);
    if (raw === null || raw === undefined) return [];
    return FdeDeliveryRecordsSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeRecords(records: readonly FdeDeliveryRecord[]): void {
  try {
    storage()?.setItem(FDE_DELIVERY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Local storage may be unavailable or full; Delivery remains session-safe.
  }
}

export const fdeDeliveryStore: FdeDeliveryStore = {
  load(templateId) {
    return (
      readRecords().find((record) => record.templateId === templateId) ??
      emptyRecord(templateId)
    );
  },

  save(record) {
    const validated = FdeDeliveryRecordSchema.parse(record);
    const records = readRecords().filter(
      (candidate) => candidate.templateId !== validated.templateId,
    );
    writeRecords([...records, validated]);
  },

  reset(templateId) {
    writeRecords(
      readRecords().filter((record) => record.templateId !== templateId),
    );
  },
};
