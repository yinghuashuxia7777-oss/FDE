import { render, screen, within } from '@testing-library/react';

import type { Evidence, EvidenceType } from '../../domain/cases/types';
import { DiffBlock, EvidenceRenderer } from './EvidenceRenderer';

function evidence(type: EvidenceType, content = 'signal payload'): Evidence {
  return { id: `evidence-${type}`, type, title: `${type} evidence`, content };
}

describe('evidence components', () => {
  it('labels log evidence and keeps the preformatted region keyboard reachable', () => {
    render(<EvidenceRenderer evidence={evidence('log', 'request failed')} />);

    const figure = screen.getByRole('figure', { name: /log evidence/i });
    expect(
      within(figure).getByText('Log', { selector: '.evidence-caption__type' }),
    ).toBeInTheDocument();
    expect(
      within(figure).getByText('request failed').closest('pre'),
    ).toHaveAttribute('tabindex', '0');
    expect(
      within(figure).getByRole('region', { name: /log evidence.*log/i }),
    ).toBeInTheDocument();
  });

  it('gives diff lines text labels instead of communicating by color alone', () => {
    render(
      <DiffBlock
        title="Deployment change"
        content={' context\n-old flag\n+new flag'}
      />,
    );

    const figure = screen.getByRole('figure', { name: 'Deployment change' });
    expect(within(figure).getByText('Context')).toBeInTheDocument();
    expect(within(figure).getByText('Removed')).toBeInTheDocument();
    expect(within(figure).getByText('Added')).toBeInTheDocument();
    expect(
      within(figure).getByText('+new flag').closest('pre'),
    ).toHaveAttribute('tabindex', '0');
    expect(
      within(figure).getByRole('region', {
        name: /deployment change.*diff/i,
      }),
    ).toBeInTheDocument();
  });

  it('labels unified diff file headers as metadata, not changes', () => {
    render(
      <DiffBlock
        title="Unified change"
        content={
          '--- a/config.ts\n+++ b/config.ts\n-old flag\n+new flag\n+++counter;'
        }
      />,
    );

    const region = screen.getByRole('region', {
      name: /unified change.*diff/i,
    });
    expect(within(region).getAllByText('Metadata')).toHaveLength(2);
    expect(within(region).getAllByText('Removed')).toHaveLength(1);
    expect(within(region).getAllByText('Added')).toHaveLength(2);
    expect(within(region).getByText('+++counter;')).toBeInTheDocument();
  });

  it.each<EvidenceType>([
    'text',
    'log',
    'terminal',
    'http',
    'json',
    'diff',
    'config',
    'metric',
    'diagram',
    'customer-message',
  ])('renders a readable fallback for %s evidence', (type) => {
    render(<EvidenceRenderer evidence={evidence(type)} />);

    expect(screen.getByText('signal payload')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(type.replace('-', ' '), 'i'), {
        selector: '.evidence-caption__type',
      }),
    ).toBeInTheDocument();
  });
});
