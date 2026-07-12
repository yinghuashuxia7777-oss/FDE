import { z } from 'zod';

const SemanticVersionSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
    'Expected a semantic version.',
  );

export function createExportEnvelopeSchema<PayloadSchema extends z.ZodType>(
  payloadSchema: PayloadSchema,
) {
  return z
    .object({
      formatVersion: z.literal(1),
      appVersion: SemanticVersionSchema,
      exportedAt: z.iso.datetime(),
      payload: payloadSchema,
    })
    .strict();
}

export const EmptyExportPayloadSchema = z.object({}).strict();

export const EmptyExportEnvelopeSchema = createExportEnvelopeSchema(
  EmptyExportPayloadSchema,
);

export interface ExportEnvelope<Payload> {
  formatVersion: 1;
  appVersion: string;
  exportedAt: string;
  payload: Payload;
}
