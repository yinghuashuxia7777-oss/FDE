import { render, screen } from '@testing-library/react';

import { createMinimalValidCase } from '../../tests/fixtures/cases';
import { CaseEvidence, CaseScene, TrainingLayout } from './TrainingLayout';

const originalMatchMedia = window.matchMedia;

function setMobile(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

describe('case training context', () => {
  it('renders every required scene section as navigable text and lists', () => {
    const scenario = createMinimalValidCase().scenario;
    render(<CaseScene scenario={scenario} />);

    expect(
      screen.getByRole('heading', { name: 'Customer' }),
    ).toBeInTheDocument();
    expect(screen.getByText(scenario.customerProfile)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Background' }),
    ).toBeInTheDocument();
    expect(screen.getByText(scenario.background)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Incident' }),
    ).toBeInTheDocument();
    expect(screen.getByText(scenario.initialIncident)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Constraints' }),
    ).toBeInTheDocument();
    expect(screen.getByText(scenario.constraints[0]!)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Confirmed facts' }),
    ).toBeInTheDocument();
    expect(screen.getByText(scenario.confirmedFacts[0]!)).toBeInTheDocument();
  });

  it('renders each evidence item through a labeled evidence region', () => {
    const evidence = createMinimalValidCase().nodes[0]!.evidence;
    render(<CaseEvidence evidence={evidence} />);

    expect(
      screen.getByRole('region', { name: /health check.*text evidence/i }),
    ).toBeInTheDocument();
  });
});

describe('TrainingLayout', () => {
  const parts = {
    scene: <div data-testid="scene-part">Scene marker</div>,
    evidence: <div data-testid="evidence-part">Evidence marker</div>,
    question: <div data-testid="question-part">Question marker</div>,
    options: <div data-testid="options-part">Options marker</div>,
  };

  it('renders one desktop tree in 26/40/34 semantic columns', () => {
    setMobile(false);
    render(<TrainingLayout {...parts} />);

    const workspace = screen.getByRole('region', {
      name: 'Training workspace',
    });
    expect(workspace).toHaveClass('training-workspace--desktop');
    expect(screen.getAllByTestId('scene-part')).toHaveLength(1);
    expect(screen.getAllByTestId('evidence-part')).toHaveLength(1);
    expect(screen.getAllByTestId('question-part')).toHaveLength(1);
    expect(screen.getAllByTestId('options-part')).toHaveLength(1);
    expect(screen.getByLabelText('Scene column')).toHaveClass(
      'training-workspace__scene',
    );
    expect(screen.getByLabelText('Evidence column')).toHaveClass(
      'training-workspace__evidence',
    );
    expect(screen.getByLabelText('Decision column')).toHaveClass(
      'training-workspace__decision',
    );
  });

  it('renders one mobile tree in scene, evidence, question, options order', () => {
    setMobile(true);
    render(<TrainingLayout {...parts} />);

    const workspace = screen.getByRole('region', {
      name: 'Training workspace',
    });
    expect(workspace).toHaveClass('training-workspace--mobile');
    const scene = screen.getByTestId('scene-part');
    const evidence = screen.getByTestId('evidence-part');
    const question = screen.getByTestId('question-part');
    const options = screen.getByTestId('options-part');
    expect(screen.getAllByTestId('scene-part')).toHaveLength(1);
    expect(screen.getAllByTestId('evidence-part')).toHaveLength(1);
    expect(screen.getAllByTestId('question-part')).toHaveLength(1);
    expect(screen.getAllByTestId('options-part')).toHaveLength(1);
    expect(
      scene.compareDocumentPosition(evidence) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      evidence.compareDocumentPosition(question) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      question.compareDocumentPosition(options) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const questionDisclosure = screen.getByText('Question').closest('details');
    expect(questionDisclosure).toHaveAttribute('open');
  });
});
