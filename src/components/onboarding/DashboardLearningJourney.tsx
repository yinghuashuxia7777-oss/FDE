import { useEffect, useState } from 'react';

import {
  bundledConceptSource,
  type ConceptSource,
} from '../../content/concept-source';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import {
  NewUserLearningJourney,
  type NewUserLearningJourneyProps,
} from './NewUserLearningJourney';

interface DashboardLearningJourneyProps extends Omit<
  NewUserLearningJourneyProps,
  'concepts'
> {
  conceptSource?: ConceptSource;
}

export function DashboardLearningJourney({
  conceptSource = bundledConceptSource,
  ...journeyProps
}: DashboardLearningJourneyProps) {
  const [snapshot, setSnapshot] = useState<{
    concepts: readonly ConceptKnowledge[];
    source: ConceptSource;
  }>();

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => conceptSource.loadAll())
      .then(
        (concepts) => {
          if (active) setSnapshot({ concepts, source: conceptSource });
        },
        () => {
          // Concept guidance is optional; onboarding must remain usable.
        },
      );
    return () => {
      active = false;
    };
  }, [conceptSource]);

  const concepts =
    snapshot?.source === conceptSource ? snapshot.concepts : undefined;
  return <NewUserLearningJourney {...journeyProps} concepts={concepts} />;
}
