/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  AttemptRepository,
  CaseRepository,
  MistakeRepository,
  ProgressRepository,
  SettingsRepository,
  SkillRepository,
} from '../../repositories/contracts';
import {
  createIndexedDbRepositories,
  type IndexedDbRepositories,
} from '../../repositories/indexeddb';
import { caseIndex } from '../../generated/case-index';
import { openFdeArenaDatabase } from '../../storage/database';

export interface ProductRepositories {
  attempts: AttemptRepository;
  cases: CaseRepository;
  mistakes: MistakeRepository;
  progress: ProgressRepository;
  settings: SettingsRepository;
  skills: SkillRepository;
}

export type RepositoryGetter = () => Promise<ProductRepositories>;
export type RepositorySource =
  ProductRepositories | Promise<ProductRepositories> | RepositoryGetter;

export async function bootstrapDefaultRepositories(
  repositories: ProductRepositories,
): Promise<void> {
  if (caseIndex.length === 0) return;
  const cases = await Promise.all(
    caseIndex.map(async ({ load }) => (await load()).default),
  );
  await repositories.cases.seed(cases);
}

export function createRetryableRepositoryGetter<T extends ProductRepositories>(
  factory: () => Promise<T>,
  bootstrap: (repositories: T) => Promise<void> = bootstrapDefaultRepositories,
): () => Promise<T> {
  let current: Promise<T> | undefined;
  return () => {
    current ??= factory()
      .then(async (repositories) => {
        await bootstrap(repositories);
        return repositories;
      })
      .catch((error: unknown) => {
        current = undefined;
        throw error;
      });
    return current;
  };
}

export const getDefaultRepositories = createRetryableRepositoryGetter(
  async (): Promise<IndexedDbRepositories> =>
    createIndexedDbRepositories(await openFdeArenaDatabase()),
);

const ProductRepositoriesContext = createContext<RepositoryGetter | undefined>(
  undefined,
);

interface ProductDataProviderProps {
  children: ReactNode;
  repositories?: RepositorySource;
}

export function ProductDataProvider({
  children,
  repositories,
}: ProductDataProviderProps) {
  const repositoryGetter = useMemo(
    () =>
      typeof repositories === 'function'
        ? repositories
        : repositories === undefined
          ? getDefaultRepositories
          : () => Promise.resolve(repositories),
    [repositories],
  );
  return (
    <ProductRepositoriesContext.Provider value={repositoryGetter}>
      {children}
    </ProductRepositoriesContext.Provider>
  );
}

export function useProductRepositories(
  override?: ProductRepositories,
): RepositoryGetter {
  const context = useContext(ProductRepositoriesContext);
  const overrideGetter = useMemo(
    () =>
      override === undefined ? undefined : () => Promise.resolve(override),
    [override],
  );
  if (overrideGetter !== undefined) return overrideGetter;
  if (context === undefined) {
    throw new Error(
      'Product pages require ProductDataProvider or repositories.',
    );
  }
  return context;
}

export type AsyncDataState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: string };

export function useAsyncPageData<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[],
) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<AsyncDataState<T>>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    void load().then(
      (data) => {
        if (current) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (!current) return;
        setState({
          status: 'error',
          error:
            error instanceof Error && error.message.trim() !== ''
              ? error.message
              : 'Local data could not be loaded.',
        });
      },
    );
    return () => {
      current = false;
    };
    // The caller supplies stable dependencies; revision is the explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, revision]);

  return {
    retry: () => {
      setState({ status: 'loading' });
      setRevision((value) => value + 1);
    },
    state,
  };
}
