import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';

describe('App', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('provides the named application landmark', () => {
    render(<App />);

    expect(screen.getByRole('main', { name: 'FDE Arena' })).toBeInTheDocument();
  });

  it('moves focus to main without replacing the current route hash', async () => {
    const user = userEvent.setup();
    const routeHash = '#/practice?mode=review';
    window.history.replaceState(null, '', routeHash);
    render(<App />);

    await user.click(
      screen.getByRole('link', { name: 'Skip to main content' }),
    );

    expect(window.location.hash).toBe(routeHash);
    expect(screen.getByRole('main', { name: 'FDE Arena' })).toHaveFocus();
  });
});
