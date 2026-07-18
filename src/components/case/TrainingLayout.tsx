import type { ReactNode } from 'react';

import type {
  CaseScenario,
  Evidence,
  EvidenceType,
} from '../../domain/cases/types';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();

  return (
    <div className="case-scene">
      <SceneSection title={t('training.scene.customer')}>
        <p>{scenario.customerProfile}</p>
      </SceneSection>
      <SceneSection title={t('training.scene.background')}>
        <p>{scenario.background}</p>
      </SceneSection>
      <SceneSection title={t('training.scene.incident')}>
        <p>{scenario.initialIncident}</p>
      </SceneSection>
      <SceneSection title={t('training.scene.constraints')}>
        <ul>
          {scenario.constraints.map((constraint) => (
            <li key={constraint}>{constraint}</li>
          ))}
        </ul>
      </SceneSection>
      <SceneSection title={t('training.scene.confirmedFacts')}>
        <ul>
          {scenario.confirmedFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </SceneSection>
    </div>
  );
}

const evidenceTypeKeys: Record<EvidenceType, string> = {
  text: 'training.evidence.type.textDetailed',
  log: 'training.evidence.type.logDetailed',
  terminal: 'training.evidence.type.terminalDetailed',
  http: 'training.evidence.type.httpDetailed',
  json: 'training.evidence.type.jsonDetailed',
  diff: 'training.evidence.type.diffDetailed',
  config: 'training.evidence.type.configDetailed',
  metric: 'training.evidence.type.metricDetailed',
  diagram: 'training.evidence.type.diagramDetailed',
  'customer-message': 'training.evidence.type.customerMessageDetailed',
};

interface CaseEvidenceProps {
  evidence: readonly Evidence[];
}

export function CaseEvidence({ evidence }: CaseEvidenceProps) {
  const { t } = useI18n();

  return (
    <div className="case-evidence-list">
      {evidence.map((item) => (
        <section
          className="case-evidence-list__item"
          aria-label={`${item.title ?? t('training.evidence.untitled')} ${t(
            evidenceTypeKeys[item.type],
          )}`}
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
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 63.999rem)');

  if (isMobile) {
    return (
      <section
        className="training-workspace training-workspace--mobile"
        aria-label={t('training.layout.workspace')}
      >
        <MobileDisclosure summary={t('training.session.scene')}>
          {scene}
        </MobileDisclosure>
        <MobileDisclosure summary={t('training.session.evidence')} defaultOpen>
          {evidence}
        </MobileDisclosure>
        <MobileDisclosure summary={t('training.layout.question')} defaultOpen>
          {question}
        </MobileDisclosure>
        <MobileDisclosure summary={t('training.layout.options')} defaultOpen>
          {options}
        </MobileDisclosure>
      </section>
    );
  }

  return (
    <section
      className="training-workspace training-workspace--desktop"
      aria-label={t('training.layout.workspace')}
    >
      <aside
        className="training-workspace__panel training-workspace__panel--scene training-workspace__scene"
        aria-label={t('training.layout.sceneColumn')}
      >
        {scene}
      </aside>
      <section
        className="training-workspace__panel training-workspace__panel--evidence training-workspace__evidence"
        aria-label={t('training.layout.evidenceColumn')}
      >
        {evidence}
      </section>
      <aside
        className="training-workspace__panel training-workspace__panel--decision training-workspace__decision"
        aria-label={t('training.layout.decisionColumn')}
      >
        {question}
        {options}
      </aside>
    </section>
  );
}
