import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JourneyNextStep } from './JourneyNextStep';

describe('JourneyNextStep', () => {
  it('explains what to do next, why, and where the action goes', () => {
    render(
      <MemoryRouter>
        <JourneyNextStep
          actionLabel="Learn Authentication"
          description="Enterprise systems must control access."
          lead="After understanding API, continue with:"
          title="Authentication"
          to="/foundation/api.token-authentication"
        />
      </MemoryRouter>,
    );

    const region = screen.getByRole('region', { name: 'Authentication' });
    expect(region).toHaveTextContent('After understanding API, continue with:');
    expect(region).toHaveTextContent('Enterprise systems must control access.');
    expect(
      screen.getByRole('link', { name: 'Learn Authentication' }),
    ).toHaveAttribute('href', '/foundation/api.token-authentication');
  });
});
