import { RouterProvider } from 'react-router-dom';

import { ThemeProvider } from '../components/layout/ThemeProvider';
import { LearningJourneyProvider } from '../components/onboarding';
import {
  ProductDataProvider,
  type RepositorySource,
} from '../application/product';
import { I18nProvider } from '../i18n';
import { PracticeEvidenceProvider } from '../application/practice';
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
          <LearningJourneyProvider>
            <PracticeEvidenceProvider>
              <RouterProvider router={router} />
            </PracticeEvidenceProvider>
          </LearningJourneyProvider>
        </ProductDataProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
