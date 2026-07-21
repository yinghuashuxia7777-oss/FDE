import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ProductRepositories } from '../../application/product';
import { I18nProvider } from '../../i18n';
import { JourneyPage } from './JourneyPage';

it('renders five capability stages and the seven-day starter journey', async () => {
  const repositories = {
    cases: { listActive: vi.fn().mockResolvedValue([]) },
    attempts: { list: vi.fn().mockResolvedValue([]) },
  } as unknown as ProductRepositories;

  render(
    <I18nProvider initialLanguage="en-US">
      <MemoryRouter>
        <JourneyPage repositories={repositories} />
      </MemoryRouter>
    </I18nProvider>,
  );

  expect(
    await screen.findByRole('heading', { name: 'Capability Growth Path' }),
  ).toBeVisible();
  expect(screen.getAllByText(/^STAGE \d$/)).toHaveLength(5);
  expect(screen.getAllByText(/^DAY \d$/)).toHaveLength(7);
  expect(
    screen.getByText(
      'This shows capabilities to prove, not lessons to check off.',
    ),
  ).toBeVisible();
});
