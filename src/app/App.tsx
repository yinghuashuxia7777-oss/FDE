import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';

import { ThemeProvider } from '../components/layout/ThemeProvider';
import { createAppRouter } from './router';

export function App() {
  const [router] = useState(createAppRouter);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
