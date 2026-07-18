/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  practiceCompletionStore,
  projectEvidenceStore,
  type PracticeCompletionRecord,
  type ProjectEvidenceRecord,
  type ProjectMilestone,
} from './beta-sidecar';

export type PracticeCompletionEvidence = PracticeCompletionRecord;

interface PracticeEvidenceContextValue {
  evidence: readonly PracticeCompletionEvidence[];
  recordEvidence: (evidence: PracticeCompletionEvidence) => void;
  projectEvidence: readonly ProjectEvidenceRecord[];
  toggleProjectMilestone: (
    projectId: string,
    milestone: ProjectMilestone,
  ) => void;
}

const PracticeEvidenceContext = createContext<
  PracticeEvidenceContextValue | undefined
>(undefined);
const EMPTY_PRACTICE_EVIDENCE: PracticeEvidenceContextValue = {
  evidence: [],
  recordEvidence: () => undefined,
  projectEvidence: [],
  toggleProjectMilestone: () => undefined,
};

export function PracticeEvidenceProvider({ children }: PropsWithChildren) {
  const [evidence, setEvidence] = useState<PracticeCompletionEvidence[]>(() =>
    practiceCompletionStore.read(),
  );
  const [projectEvidence, setProjectEvidence] = useState<
    ProjectEvidenceRecord[]
  >(() => projectEvidenceStore.read());
  const recordEvidence = useCallback((item: PracticeCompletionEvidence) => {
    setEvidence((current) => {
      const next = [
        item,
        ...current.filter(({ practiceId }) => practiceId !== item.practiceId),
      ];
      practiceCompletionStore.write(next);
      return next;
    });
  }, []);
  const toggleProjectMilestone = useCallback(
    (projectId: string, milestone: ProjectMilestone) => {
      setProjectEvidence((current) => {
        const existing = current.find((item) => item.projectId === projectId);
        const completed = new Set(existing?.completedMilestones ?? []);
        if (completed.has(milestone)) completed.delete(milestone);
        else completed.add(milestone);
        const nextRecord: ProjectEvidenceRecord = {
          projectId,
          completedMilestones: [...completed],
          updatedAt: new Date().toISOString(),
        };
        const next = [
          nextRecord,
          ...current.filter((item) => item.projectId !== projectId),
        ];
        projectEvidenceStore.write(next);
        return next;
      });
    },
    [],
  );
  const value = useMemo(
    () => ({
      evidence,
      recordEvidence,
      projectEvidence,
      toggleProjectMilestone,
    }),
    [evidence, projectEvidence, recordEvidence, toggleProjectMilestone],
  );
  return (
    <PracticeEvidenceContext.Provider value={value}>
      {children}
    </PracticeEvidenceContext.Provider>
  );
}

export function usePracticeEvidence(): PracticeEvidenceContextValue {
  return useContext(PracticeEvidenceContext) ?? EMPTY_PRACTICE_EVIDENCE;
}
