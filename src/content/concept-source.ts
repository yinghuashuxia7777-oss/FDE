import type { ConceptKnowledge } from '../domain/concepts/types';
import { conceptIndex } from '../generated/concept-index';
import { ConceptKnowledgeSchema } from './concept-schema';
import { deepFreeze } from './deep-freeze';

export interface ConceptSource {
  loadAll(): Promise<readonly ConceptKnowledge[]>;
  findById(id: string): Promise<ConceptKnowledge | undefined>;
}

export interface ConceptLazyIndexEntry {
  readonly load: () => Promise<unknown>;
}

function compareConcepts(
  left: ConceptKnowledge,
  right: ConceptKnowledge,
): number {
  return left.order - right.order || left.id.localeCompare(right.id);
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

export class LocalConceptSource implements ConceptSource {
  private snapshotPromise: Promise<readonly ConceptKnowledge[]> | undefined;

  constructor(
    private readonly index: readonly ConceptLazyIndexEntry[] = conceptIndex,
  ) {}

  loadAll(): Promise<readonly ConceptKnowledge[]> {
    this.snapshotPromise ??= Promise.all(
      this.index.map((entry) =>
        Promise.resolve()
          .then(() => entry.load())
          .then(unwrapLazyJson)
          .then((value) => ConceptKnowledgeSchema.parse(value)),
      ),
    ).then((items) => {
      items.sort(compareConcepts);
      const seenIds = new Set<string>();
      items.forEach(({ id }) => {
        if (seenIds.has(id)) {
          throw new Error(`Duplicate Concept ID: ${id}`);
        }
        seenIds.add(id);
      });
      return deepFreeze(items);
    });
    return this.snapshotPromise;
  }

  findById(id: string): Promise<ConceptKnowledge | undefined> {
    return this.loadAll().then((items) => items.find((item) => item.id === id));
  }
}

export const bundledConceptSource: ConceptSource = new LocalConceptSource();
