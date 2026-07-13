import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';

import {
  createRetryableRepositoryGetter,
  ProductDataProvider,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from './runtime';

function RepositoryProbe() {
  const getRepositories = useProductRepositories();
  const { state } = useAsyncPageData(async () => {
    await getRepositories();
    return 'ready';
  }, [getRepositories]);
  return <output>{state.status}</output>;
}

describe('product repository runtime', () => {
  it('reopens after a failed default-style factory and bootstraps once on success', async () => {
    const repositories = {} as ProductRepositories;
    const factory = vi
      .fn<() => Promise<ProductRepositories>>()
      .mockRejectedValueOnce(new Error('open failed'))
      .mockResolvedValueOnce(repositories);
    const bootstrap = vi.fn().mockResolvedValue(undefined);
    const getRepositories = createRetryableRepositoryGetter(factory, bootstrap);

    await expect(getRepositories()).rejects.toThrow('open failed');
    await expect(getRepositories()).resolves.toBe(repositories);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(bootstrap).toHaveBeenCalledOnce();
  });

  it('shares one in-flight open across StrictMode effect replay', async () => {
    const repositories = {} as ProductRepositories;
    const factory = vi.fn().mockResolvedValue(repositories);
    const getter = createRetryableRepositoryGetter(factory, () =>
      Promise.resolve(),
    );

    render(
      <StrictMode>
        <ProductDataProvider repositories={getter}>
          <RepositoryProbe />
        </ProductDataProvider>
      </StrictMode>,
    );

    expect(await screen.findByText('ready')).toBeVisible();
    expect(factory).toHaveBeenCalledOnce();
  });
});
