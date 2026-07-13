import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from './Button';
import { Alert, StatusBadge } from './Feedback';
import { EmptyState, ErrorState, LoadingState } from './States';
import { MobileDisclosure } from './MobileDisclosure';

describe('shared UI', () => {
  it('exposes disabled and busy button state without hiding its action label', () => {
    render(<Button loading>Save progress</Button>);

    const button = screen.getByRole('button', { name: 'Save progress' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('announces loading, empty, and recoverable error states appropriately', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <LoadingState label="Loading cases" />
        <EmptyState
          title="No attempts yet"
          description="Complete a case first."
        />
        <ErrorState
          title="Cases unavailable"
          message="Try again."
          onRetry={retry}
        />
      </>,
    );

    expect(
      screen.getByRole('status', { name: 'Loading cases' }),
    ).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('No attempts yet')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Cases unavailable');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders semantic text for status and alerts', () => {
    render(
      <>
        <StatusBadge tone="critical">Critical risk</StatusBadge>
        <Alert tone="warning" title="Evidence incomplete">
          Verify the request trace.
        </Alert>
      </>,
    );

    expect(screen.getByText('Critical risk')).toHaveAttribute(
      'data-tone',
      'critical',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Evidence incomplete');
  });

  it('uses native disclosure and can open the current question by default', () => {
    render(
      <MobileDisclosure summary="Current question" defaultOpen>
        Which signal is decisive?
      </MobileDisclosure>,
    );

    const details = screen.getByText('Current question').closest('details');
    expect(details).toHaveAttribute('open');
    expect(screen.getByText('Which signal is decisive?')).toBeInTheDocument();
  });

  it('gives each empty state a unique heading relationship', () => {
    render(
      <>
        <EmptyState title="No attempts" description="Complete a case." />
        <EmptyState title="No mistakes" description="Keep training." />
      </>,
    );

    const attemptHeading = screen.getByRole('heading', { name: 'No attempts' });
    const mistakeHeading = screen.getByRole('heading', { name: 'No mistakes' });
    const attemptState = attemptHeading.closest('section');
    const mistakeState = mistakeHeading.closest('section');

    expect(attemptHeading.id).not.toBe(mistakeHeading.id);
    expect(attemptState).toHaveAttribute('aria-labelledby', attemptHeading.id);
    expect(mistakeState).toHaveAttribute('aria-labelledby', mistakeHeading.id);
  });
});
