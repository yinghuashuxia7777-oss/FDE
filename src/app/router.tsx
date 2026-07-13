/* eslint-disable react-refresh/only-export-components */
import { createHashRouter, useParams } from 'react-router-dom';

import { ApplicationShell } from '../components/layout/ApplicationShell';
import {
  TrainingLandingPage,
  NotFoundPage,
  RouteFrame,
  RouterErrorPage,
  TrainingShell,
} from './route-pages';
import { DashboardPage } from '../pages/dashboard';
import { CaseLibraryPage } from '../pages/cases';
import { SkillsPage } from '../pages/skills';
import { MistakesPage } from '../pages/mistakes';
import { ProfilePage } from '../pages/profile';
import { SettingsPage } from '../pages/settings';
import { DebriefPage } from '../pages/debrief';
import {
  FoundationDetailPage,
  FoundationLibraryPage,
} from '../pages/foundation';
import { TrainingRoutePage } from '../pages/training';

function DebriefRoute() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  return <DebriefPage attemptId={attemptId} />;
}

function FoundationDetailRoute() {
  const { foundationId = '' } = useParams<{ foundationId: string }>();
  return <FoundationDetailPage foundationId={foundationId} />;
}

export function createAppRouter() {
  return createHashRouter([
    {
      path: '/',
      element: <RouteFrame />,
      errorElement: <RouterErrorPage />,
      children: [
        {
          path: 'training',
          element: <TrainingShell />,
          children: [
            { index: true, element: <TrainingLandingPage /> },
            { path: ':caseId', element: <TrainingRoutePage /> },
          ],
        },
        {
          element: <ApplicationShell />,
          children: [
            {
              index: true,
              element: <DashboardPage />,
            },
            {
              path: 'cases',
              element: <CaseLibraryPage />,
            },
            {
              path: 'foundation',
              element: <FoundationLibraryPage />,
            },
            {
              path: 'foundation/:foundationId',
              element: <FoundationDetailRoute />,
            },
            {
              path: 'skills',
              element: <SkillsPage />,
            },
            {
              path: 'mistakes',
              element: <MistakesPage />,
            },
            {
              path: 'profile',
              element: <ProfilePage />,
            },
            {
              path: 'settings',
              element: <SettingsPage />,
            },
            { path: 'debrief/:attemptId', element: <DebriefRoute /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ]);
}
