/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { LearnerStartingPoint } from '../../application/onboarding';

interface LearningJourneyState {
  completedMissionIds: ReadonlySet<string>;
  completeMission: (missionId: string) => void;
  markFoundationVisited: (foundationId: string) => void;
  selectStartingPoint: (startingPoint: LearnerStartingPoint) => void;
  startingPoint: LearnerStartingPoint | undefined;
  visitedFoundationIds: ReadonlySet<string>;
}

const defaultState: LearningJourneyState = {
  completedMissionIds: new Set(),
  completeMission: () => undefined,
  markFoundationVisited: () => undefined,
  selectStartingPoint: () => undefined,
  startingPoint: undefined,
  visitedFoundationIds: new Set(),
};

const LearningJourneyContext =
  createContext<LearningJourneyState>(defaultState);

export function LearningJourneyProvider({ children }: { children: ReactNode }) {
  const [startingPoint, setStartingPoint] = useState<LearnerStartingPoint>();
  const [completedMissionIds, setCompletedMissionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [visitedFoundationIds, setVisitedFoundationIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const markFoundationVisited = useCallback((foundationId: string) => {
    setVisitedFoundationIds((current) => {
      if (current.has(foundationId)) return current;
      const next = new Set(current);
      next.add(foundationId);
      return next;
    });
  }, []);
  const completeMission = useCallback(
    (missionId: string) => {
      if (!visitedFoundationIds.has(missionId)) return;
      setCompletedMissionIds((current) => {
        if (current.has(missionId)) return current;
        const next = new Set(current);
        next.add(missionId);
        return next;
      });
      setVisitedFoundationIds(new Set<string>());
    },
    [visitedFoundationIds],
  );
  const value = useMemo<LearningJourneyState>(
    () => ({
      completedMissionIds,
      completeMission,
      markFoundationVisited,
      selectStartingPoint: setStartingPoint,
      startingPoint,
      visitedFoundationIds,
    }),
    [
      completedMissionIds,
      completeMission,
      markFoundationVisited,
      startingPoint,
      visitedFoundationIds,
    ],
  );
  return (
    <LearningJourneyContext.Provider value={value}>
      {children}
    </LearningJourneyContext.Provider>
  );
}

export function useLearningJourney(): LearningJourneyState {
  return useContext(LearningJourneyContext);
}
