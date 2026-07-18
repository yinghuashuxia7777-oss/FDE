import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { createAppRouter } from './app/router';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/global.css';

const router = createAppRouter();

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>,
);
