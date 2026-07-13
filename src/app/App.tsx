import { RouterProvider } from 'react-router-dom';

import { ThemeProvider } from '../components/layout/ThemeProvider';
import { createAppRouter } from './router';

export type AppRouter = ReturnType<typeof createAppRouter>;

interface AppProps {
  router: AppRouter;
}

export function App({ router }: AppProps) {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
