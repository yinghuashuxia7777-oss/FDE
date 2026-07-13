import type { ReactNode } from 'react';

import type {
  CaseScenario,
  Evidence,
  EvidenceType,
} from '../../domain/cases/types';
import { EvidenceRenderer } from '../evidence';
import { useMediaQuery } from '../layout/useMediaQuery';
import { MobileDisclosure } from '../ui';

interface CaseSceneProps {
  scenario: CaseScenario;
}

interface SceneSectionProps {
  children: ReactNode;
  title: string;
}

function SceneSection({ children, title }: SceneSectionProps) {
  return (
    <section className="case-scene__section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function CaseScene({ scenario }: CaseSceneProps) {
  return (
    <div className="case-scene">
      <SceneSection title="Customer">
        <p>{scenario.customerProfile}</p>
      </SceneSection>
      <SceneSection title="Background">
        <p>{scenario.background}</p>
      </SceneSection>
      <SceneSection title="Incident">
        <p>{scenario.initialIncident}</p>
      </SceneSection>
      <SceneSection title="Constraints">
        <ul>
          {scenario.constraints.map((constraint) => (
            <li key={constraint}>{constraint}</li>
          ))}
        </ul>
      </SceneSection>
      <SceneSection title="Confirmed facts">
        <ul>
          {scenario.confirmedFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </SceneSection>
    </div>
  );
}

const evidenceTypeLabels: Record<EvidenceType, string> = {
  text: 'Text evidence',
  log: 'Log evidence',
  terminal: 'Terminal evidence',
  http: 'HTTP evidence',
  json: 'JSON evidence',
  diff: 'Diff evidence',
  config: 'Configuration evidence',
  metric: 'Metric evidence',
  diagram: 'Diagram evidence',
  'customer-message': 'Customer message evidence',
};

interface CaseEvidenceProps {
  evidence: readonly Evidence[];
}

export function CaseEvidence({ evidence }: CaseEvidenceProps) {
  return (
    <div className="case-evidence-list">
      {evidence.map((item) => (
        <section
          className="case-evidence-list__item"
          aria-label={`${item.title ?? 'Untitled'} ${evidenceTypeLabels[item.type]}`}
          key={item.id}
        >
          <EvidenceRenderer evidence={item} />
        </section>
      ))}
    </div>
  );
}

interface TrainingLayoutProps {
  evidence: ReactNode;
  options: ReactNode;
  question: ReactNode;
  scene: ReactNode;
}

export function TrainingLayout({
  evidence,
  options,
  question,
  scene,
}: TrainingLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 63.999rem)');

  if (isMobile) {
    return (
      <section
        className="training-workspace training-workspace--mobile"
        aria-label="Training workspace"
      >
        <MobileDisclosure summary="Scene">{scene}</MobileDisclosure>
        <MobileDisclosure summary="Evidence">{evidence}</MobileDisclosure>
        <MobileDisclosure summary="Question" defaultOpen>
          {question}
        </MobileDisclosure>
        <MobileDisclosure summary="Options" defaultOpen>
          {options}
        </MobileDisclosure>
      </section>
    );
  }

  return (
    <section
      className="training-workspace training-workspace--desktop"
      aria-label="Training workspace"
    >
      <aside className="training-workspace__scene" aria-label="Scene column">
        {scene}
      </aside>
      <section
        className="training-workspace__evidence"
        aria-label="Evidence column"
      >
        {evidence}
      </section>
      <aside
        className="training-workspace__decision"
        aria-label="Decision column"
      >
        {question}
        {options}
      </aside>
    </section>
  );
}
