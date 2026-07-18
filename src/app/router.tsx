/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { createHashRouter, useParams } from 'react-router-dom';

import { ApplicationShell } from '../components/layout/ApplicationShell';
import { useLearningJourney } from '../components/onboarding';
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
import { ProfilePage, PublicDemoProfilePage } from '../pages/profile';
import { PracticeDetailPage, PracticeListPage } from '../pages/practices';
import { ProjectDetailPage, ProjectListPage } from '../pages/projects';
import { SettingsPage } from '../pages/settings';
import { DebriefPage } from '../pages/debrief';
import { FeedbackPage } from '../pages/feedback';
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
  const { markFoundationVisited } = useLearningJourney();
  useEffect(() => {
    if (foundationId !== '') markFoundationVisited(foundationId);
  }, [foundationId, markFoundationVisited]);
  return <FoundationDetailPage foundationId={foundationId} />;
}

function PracticeDetailRoute() {
  const { practiceId = '' } = useParams<{ practiceId: string }>();
  return <PracticeDetailPage practiceId={practiceId} />;
}

function ProjectDetailRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  return <ProjectDetailPage projectId={projectId} />;
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
              path: 'profile/demo',
              element: <PublicDemoProfilePage />,
            },
            { path: 'practices', element: <PracticeListPage /> },
            { path: 'practices/:practiceId', element: <PracticeDetailRoute /> },
            { path: 'projects', element: <ProjectListPage /> },
            { path: 'projects/:projectId', element: <ProjectDetailRoute /> },
            { path: 'feedback', element: <FeedbackPage /> },
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
