import { z } from 'zod';

import {
  EmptyExportEnvelopeSchema,
  createExportEnvelopeSchema,
} from './export.schema';

const validEnvelope = {
  formatVersion: 1,
  appVersion: '0.1.0',
  exportedAt: '2026-07-13T02:00:00.000Z',
  payload: {},
};

describe('export envelope schema', () => {
  it('accepts the current format with semantic app version and ISO date', () => {
    expect(EmptyExportEnvelopeSchema.parse(validEnvelope)).toEqual(
      validEnvelope,
    );
  });

  it.each([
    ['format version', { formatVersion: 2 }],
    ['semantic app version', { appVersion: 'development' }],
    ['ISO export date', { exportedAt: 'July 13' }],
  ])('rejects an invalid %s', (_field, override) => {
    expect(
      EmptyExportEnvelopeSchema.safeParse({
        ...validEnvelope,
        ...override,
      }).success,
    ).toBe(false);
  });

  it('lets storage supply a versioned local payload contract', () => {
    const LocalPayloadSchema = z
      .object({
        schemaVersion: z.literal(1),
        progress: z.array(
          z
            .object({
              caseId: z.string().min(1),
              completed: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict();
    const LocalExportEnvelopeSchema =
      createExportEnvelopeSchema(LocalPayloadSchema);
    const envelope = {
      ...validEnvelope,
      payload: {
        schemaVersion: 1,
        progress: [{ caseId: 'case-minimal', completed: true }],
      },
    };

    expect(LocalExportEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it('does not accept unspecified payload fields by default', () => {
    expect(
      EmptyExportEnvelopeSchema.safeParse({
        ...validEnvelope,
        payload: { account: {} },
      }).success,
    ).toBe(false);
  });
});
