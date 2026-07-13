import { CURRENT_CONTENT_SCHEMA_VERSION } from '../contracts';
import { migrateV1ToV2 } from './migrate-v1-to-v2';

export type ContentMigration = (input: unknown) => unknown;

export interface RegisteredContentMigration {
  from: number;
  to: number;
  migrate: ContentMigration;
}

export const registeredContentMigrations: readonly RegisteredContentMigration[] =
  migrateV1ToV2 === undefined
    ? []
    : [{ from: 1, to: 2, migrate: migrateV1ToV2 }];

export function migrateContentCase(
  input: unknown,
  sourceVersion: number,
): unknown {
  let current = input;
  let version = sourceVersion;
  while (version < CURRENT_CONTENT_SCHEMA_VERSION) {
    const migration = registeredContentMigrations.find(
      ({ from }) => from === version,
    );
    if (migration === undefined) {
      throw new Error(
        `No content migration is registered from version ${String(version)}.`,
      );
    }
    current = migration.migrate(current);
    version = migration.to;
  }
  return current;
}
