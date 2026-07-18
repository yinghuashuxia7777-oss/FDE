import type { FoundationKnowledge } from '../domain/foundation/types';
import { foundationIndex } from '../generated/foundation-index';
import { deepFreeze } from './deep-freeze';
import { FoundationKnowledgeSchema } from './foundation-schema';

export interface FoundationSource {
  loadAll(): Promise<readonly FoundationKnowledge[]>;
  findById(id: string): Promise<FoundationKnowledge | undefined>;
}

export interface FoundationLazyIndexEntry {
  readonly load: () => Promise<unknown>;
}

function compareFoundationItems(
  left: FoundationKnowledge,
  right: FoundationKnowledge,
): number {
  const orderDifference = left.order - right.order;
  if (orderDifference !== 0) {
    return orderDifference;
  }

  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
}

function unwrapLazyJson(loaded: unknown): unknown {
  if (
    loaded !== null &&
    typeof loaded === 'object' &&
    Object.hasOwn(loaded, 'default')
  ) {
    return (loaded as { readonly default: unknown }).default;
  }

  return loaded;
}

export class LocalFoundationSource implements FoundationSource {
  private snapshotPromise: Promise<readonly FoundationKnowledge[]> | undefined;

  constructor(
    private readonly index: readonly FoundationLazyIndexEntry[] = foundationIndex,
  ) {}

  loadAll(): Promise<readonly FoundationKnowledge[]> {
    this.snapshotPromise ??= Promise.all(
      this.index.map((entry) =>
        Promise.resolve()
          .then(() => entry.load())
          .then(unwrapLazyJson)
          .then((value) => FoundationKnowledgeSchema.parse(value)),
      ),
    ).then((items) => {
      items.sort(compareFoundationItems);
      return deepFreeze(items);
    });

    return this.snapshotPromise;
  }

  findById(id: string): Promise<FoundationKnowledge | undefined> {
    return this.loadAll().then((items) => items.find((item) => item.id === id));
  }
}

export const bundledFoundationSource: FoundationSource =
  new LocalFoundationSource();
