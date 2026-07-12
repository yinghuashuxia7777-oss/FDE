import type { ProgressRepository } from './progress-repository';

type ExpectFalse<Value extends false> = Value;
type SaveSnapshotMustBeAbsent = ExpectFalse<
  'saveSnapshot' extends keyof ProgressRepository ? true : false
>;

const saveSnapshotMustBeAbsent: SaveSnapshotMustBeAbsent = false;
void saveSnapshotMustBeAbsent;
