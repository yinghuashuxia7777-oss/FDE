import type { ContentMigration } from './index';

/** Reserved until schema v2 is defined. It is deliberately not registered. */
export const migrateV1ToV2 = undefined satisfies ContentMigration | undefined;
