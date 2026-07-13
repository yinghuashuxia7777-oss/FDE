import { createHashRouter } from 'react-router-dom';

import { ApplicationShell } from '../components/layout/ApplicationShell';
import {
  NotFoundPage,
  PlaceholderPage,
  RouterErrorPage,
  TrainingShell,
} from './route-pages';

export function createAppRouter() {
  return createHashRouter([
    {
      path: '/training/:caseId?',
      element: <TrainingShell />,
      errorElement: <RouterErrorPage />,
    },
    {
      path: '/',
      element: <ApplicationShell />,
      errorElement: <RouterErrorPage />,
      children: [
        {
          index: true,
          element: (
            <PlaceholderPage
              eyebrow="Operational overview"
              title="Dashboard"
              description="Resume a case, inspect capability signals, and act on critical risks."
            />
          ),
        },
        {
          path: 'cases',
          element: (
            <PlaceholderPage
              eyebrow="Scenario inventory"
              title="Cases"
              description="Filter customer incidents by skill, risk, level, and prior result."
            />
          ),
        },
        {
          path: 'skills',
          element: (
            <PlaceholderPage
              eyebrow="Capability signals"
              title="Skills"
              description="Trace mastery across fourteen field development domains."
            />
          ),
        },
        {
          path: 'mistakes',
          element: (
            <PlaceholderPage
              eyebrow="Decision audit"
              title="Mistakes"
              description="Review evidence gaps, priority errors, and critical choices."
            />
          ),
        },
        {
          path: 'profile',
          element: (
            <PlaceholderPage
              eyebrow="Readiness record"
              title="Profile"
              description="Inspect field judgment, communication, and interview readiness."
            />
          ),
        },
        {
          path: 'settings',
          element: (
            <PlaceholderPage
              eyebrow="Local workspace"
              title="Settings"
              description="Control theme, local data, and content version information."
            />
          ),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
}
