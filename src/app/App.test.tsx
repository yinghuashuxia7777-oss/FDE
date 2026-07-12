import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('provides the named application landmark', () => {
    render(<App />);

    expect(screen.getByRole('main', { name: 'FDE Arena' })).toBeInTheDocument();
  });
});
