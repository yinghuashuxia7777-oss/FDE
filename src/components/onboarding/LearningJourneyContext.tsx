/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  learnerPreferenceStore,
  type ExperienceLevel,
  type GrowthGoal,
  type LearnerStartingPoint,
} from '../../application/onboarding';

interface LearningJourneyState {
  completedMissionIds: ReadonlySet<string>;
  completeMission: (missionId: string) => void;
  markFoundationVisited: (foundationId: string) => void;
  goal: GrowthGoal | undefined;
  experienceLevel: ExperienceLevel | undefined;
  selectExperienceLevel: (level: ExperienceLevel) => void;
  selectGoal: (goal: GrowthGoal) => void;
  selectProfile: (
    goal: GrowthGoal,
    startingPoint: LearnerStartingPoint,
  ) => void;
  selectStartingPoint: (startingPoint: LearnerStartingPoint) => void;
  startingPoint: LearnerStartingPoint | undefined;
  visitedFoundationIds: ReadonlySet<string>;
}

const defaultState: LearningJourneyState = {
  completedMissionIds: new Set(),
  completeMission: () => undefined,
  experienceLevel: undefined,
  goal: undefined,
  markFoundationVisited: () => undefined,
  selectExperienceLevel: () => undefined,
  selectGoal: () => undefined,
  selectProfile: () => undefined,
  selectStartingPoint: () => undefined,
  startingPoint: undefined,
  visitedFoundationIds: new Set(),
};

const LearningJourneyContext =
  createContext<LearningJourneyState>(defaultState);

export function LearningJourneyProvider({ children }: { children: ReactNode }) {
  const [initialPreference] = useState(() => learnerPreferenceStore.read());
  const [goal, setGoal] = useState<GrowthGoal | undefined>(
    initialPreference?.goal,
  );
  const [experienceLevel, setExperienceLevel] = useState<
    ExperienceLevel | undefined
  >(initialPreference?.experienceLevel);
  const [startingPoint, setStartingPoint] = useState<
    LearnerStartingPoint | undefined
  >(() =>
    initialPreference === undefined
      ? undefined
      : experienceToStartingPoint(initialPreference.experienceLevel),
  );
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
  const selectGoal = useCallback(
    (nextGoal: GrowthGoal) => {
      setGoal(nextGoal);
      if (experienceLevel !== undefined) {
        learnerPreferenceStore.write({
          goal: nextGoal,
          experienceLevel,
        });
      }
    },
    [experienceLevel],
  );
  const selectExperienceLevel = useCallback(
    (nextLevel: ExperienceLevel) => {
      setExperienceLevel(nextLevel);
      setStartingPoint(experienceToStartingPoint(nextLevel));
      if (goal !== undefined) {
        learnerPreferenceStore.write({
          goal,
          experienceLevel: nextLevel,
        });
      }
    },
    [goal],
  );
  const selectStartingPoint = useCallback(
    (nextStartingPoint: LearnerStartingPoint) => {
      selectExperienceLevel(startingPointToExperience(nextStartingPoint));
    },
    [selectExperienceLevel],
  );
  const selectProfile = useCallback(
    (nextGoal: GrowthGoal, nextStartingPoint: LearnerStartingPoint) => {
      const nextExperienceLevel = startingPointToExperience(nextStartingPoint);
      setGoal(nextGoal);
      setExperienceLevel(nextExperienceLevel);
      setStartingPoint(nextStartingPoint);
      learnerPreferenceStore.write({
        goal: nextGoal,
        experienceLevel: nextExperienceLevel,
      });
    },
    [],
  );
  const value = useMemo<LearningJourneyState>(
    () => ({
      completedMissionIds,
      completeMission,
      experienceLevel,
      goal,
      markFoundationVisited,
      selectExperienceLevel,
      selectGoal,
      selectProfile,
      selectStartingPoint,
      startingPoint,
      visitedFoundationIds,
    }),
    [
      completedMissionIds,
      completeMission,
      experienceLevel,
      goal,
      markFoundationVisited,
      selectExperienceLevel,
      selectGoal,
      selectProfile,
      selectStartingPoint,
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

function experienceToStartingPoint(
  level: ExperienceLevel,
): LearnerStartingPoint {
  if (level === 'beginner') return 'zero-basics';
  if (level === 'developer') return 'programming-basics';
  return 'ai-project';
}

function startingPointToExperience(
  startingPoint: LearnerStartingPoint,
): ExperienceLevel {
  if (startingPoint === 'zero-basics') return 'beginner';
  if (startingPoint === 'programming-basics') return 'developer';
  return 'experienced';
}

export function useLearningJourney(): LearningJourneyState {
  return useContext(LearningJourneyContext);
}
