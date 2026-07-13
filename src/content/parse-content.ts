import type { FdeCase } from '../domain/cases/types';
import { FdeCaseSchema } from '../schemas/case.schema';
import { CURRENT_CONTENT_SCHEMA_VERSION } from './contracts';
import { migrateContentCase } from './migrations';

function readSchemaVersion(input: unknown): number {
  if (input === null || typeof input !== 'object') {
    throw new Error('Case content must be an object.');
  }
  const schemaVersion: unknown = (input as Record<string, unknown>)
    .schemaVersion;
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    throw new Error('Case schemaVersion must be a positive integer.');
  }
  return schemaVersion;
}

export function parseCaseContent(input: unknown): FdeCase {
  const schemaVersion = readSchemaVersion(input);
  if (schemaVersion > CURRENT_CONTENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported case schema version ${String(schemaVersion)}.`,
    );
  }
  return FdeCaseSchema.parse(migrateContentCase(input, schemaVersion));
}
