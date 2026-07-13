import { RouterProvider } from 'react-router-dom';

import { ThemeProvider } from '../components/layout/ThemeProvider';
import {
  ProductDataProvider,
  type RepositorySource,
} from '../application/product';
import { I18nProvider } from '../i18n';
import { createAppRouter } from './router';

export type AppRouter = ReturnType<typeof createAppRouter>;

interface AppProps {
  router: AppRouter;
  repositories?: RepositorySource;
}

export function App({ router, repositories }: AppProps) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ProductDataProvider
          {...(repositories === undefined ? {} : { repositories })}
        >
          <RouterProvider router={router} />
        </ProductDataProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
