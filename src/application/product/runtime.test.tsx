import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';

import { I18nProvider } from '../../i18n';
import { createMinimalValidCase } from '../../tests/fixtures/cases';
import {
  bootstrapDefaultRepositories,
  createRetryableRepositoryGetter,
  ProductDataProvider,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from './runtime';

function LocalizedCaseProbe() {
  const getRepositories = useProductRepositories();
  const { state } = useAsyncPageData(async () => {
    const repositories = await getRepositories();
    return repositories.cases.getVersion('case-minimal', 1);
  }, [getRepositories]);

  if (state.status !== 'ready' || state.data === undefined) {
    return <output>{state.status}</output>;
  }

  return (
    <output>
      {state.data.title} · {state.data.nodes[0]?.prompt}
    </output>
  );
}

function RepositoryProbe() {
  const getRepositories = useProductRepositories();
  const { state } = useAsyncPageData(async () => {
    await getRepositories();
    return 'ready';
  }, [getRepositories]);
  return <output>{state.status}</output>;
}

describe('product repository runtime', () => {
  it('bootstraps through the content manager instead of a generated case seed list', async () => {
    const ensureBundledInitialized = vi.fn().mockResolvedValue(undefined);
    const repositories = {
      contentManagement: { ensureBundledInitialized },
    } as unknown as ProductRepositories;

    await bootstrapDefaultRepositories(repositories);

    expect(ensureBundledInitialized).toHaveBeenCalledOnce();
  });

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

  it('projects Case content into English without changing stable IDs', async () => {
    const authored = createMinimalValidCase();
    authored.title = '中文案例标题';
    authored.summary = '中文案例摘要';
    authored.nodes[0]!.prompt = '请选择下一步行动。';
    const getVersion = vi.fn().mockResolvedValue(authored);
    const repositories = {
      cases: {
        getVersion,
        list: vi.fn().mockResolvedValue([]),
        listActive: vi.fn().mockResolvedValue([]),
        seed: vi.fn(),
      },
    } as unknown as ProductRepositories;

    render(
      <I18nProvider initialLanguage="en-US">
        <ProductDataProvider repositories={repositories}>
          <LocalizedCaseProbe />
        </ProductDataProvider>
      </I18nProvider>,
    );

    const content = await screen.findByText(/Case Minimal/u);
    expect(content).not.toHaveTextContent(/[\u3400-\u9fff]/u);
    expect(getVersion).toHaveBeenCalledWith('case-minimal', 1);
    expect(authored.id).toBe('case-minimal');
  });
});
