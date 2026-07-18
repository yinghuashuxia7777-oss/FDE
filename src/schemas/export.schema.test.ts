import { z } from 'zod';

import {
  EmptyExportEnvelopeSchema,
  LocalDataBundleSchema,
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

  it.each(['1.0.0-01', '1.0.0-alpha.01'])(
    'rejects numeric prerelease identifiers with leading zeroes: %s',
    (appVersion) => {
      expect(
        EmptyExportEnvelopeSchema.safeParse({
          ...validEnvelope,
          appVersion,
        }).success,
      ).toBe(false);
    },
  );

  it('accepts valid SemVer prerelease and build identifiers', () => {
    expect(
      EmptyExportEnvelopeSchema.safeParse({
        ...validEnvelope,
        appVersion: '1.0.0-alpha.1+build.5',
      }).success,
    ).toBe(true);
  });

  it('normalizes an RFC3339 offset timestamp for storage', () => {
    expect(
      EmptyExportEnvelopeSchema.parse({
        ...validEnvelope,
        exportedAt: '2026-07-13T10:00:00.12+08:00',
      }).exportedAt,
    ).toBe('2026-07-13T02:00:00.120Z');
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

  it('keeps historical critical risk when the latest attempt is clean', () => {
    const base = {
      userId: 'local-user' as const,
      caseId: 'case-one',
      caseVersion: 1,
      startedAt: '2026-07-13T00:00:00.000Z',
      currentNodeId: null,
      visitedNodeIds: ['node-one'],
      roundHistory: [],
      consequences: [],
      status: 'completed' as const,
    };
    const criticalAttempt = {
      ...base,
      id: 'attempt-critical',
      updatedAt: '2026-07-13T00:10:00.000Z',
      completedAt: '2026-07-13T00:10:00.000Z',
      score: 40,
      verdict: 'critical-risk' as const,
      criticalErrorIds: ['critical-one'],
    };
    const cleanAttempt = {
      ...base,
      id: 'attempt-clean',
      startedAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:10:00.000Z',
      completedAt: '2026-07-14T00:10:00.000Z',
      score: 90,
      verdict: 'excellent' as const,
      criticalErrorIds: [],
    };

    expect(
      LocalDataBundleSchema.safeParse({
        userId: 'local-user',
        attempts: [criticalAttempt, cleanAttempt],
        progress: [
          {
            userId: 'local-user',
            caseId: 'case-one',
            caseVersion: 1,
            latestAttemptId: 'attempt-clean',
            attemptCount: 2,
            completedCount: 2,
            highestScore: 90,
            latestScore: 90,
            latestVerdict: 'excellent',
            hasCriticalError: true,
            updatedAt: '2026-07-14T00:10:00.000Z',
          },
        ],
        mastery: [],
        mistakes: [],
        settings: null,
      }).success,
    ).toBe(true);
  });

  it('requires a progress aggregate for every case with a completed attempt', () => {
    expect(
      LocalDataBundleSchema.safeParse({
        userId: 'local-user',
        attempts: [
          {
            id: 'attempt-orphan-complete',
            userId: 'local-user',
            caseId: 'case-orphan',
            caseVersion: 1,
            status: 'completed',
            startedAt: '2026-07-13T00:00:00.000Z',
            updatedAt: '2026-07-13T00:10:00.000Z',
            completedAt: '2026-07-13T00:10:00.000Z',
            currentNodeId: null,
            score: 90,
            verdict: 'excellent',
            criticalErrorIds: [],
            visitedNodeIds: ['node-one'],
            roundHistory: [],
          },
        ],
        progress: [],
        mastery: [],
        mistakes: [],
        settings: null,
      }).success,
    ).toBe(false);
  });
});
