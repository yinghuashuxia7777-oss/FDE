import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { I18nProvider, type Language } from '../../i18n';
import { MobileNavigation } from './MobileNavigation';

function renderNavigation(language: Language) {
  return render(
    <I18nProvider initialLanguage={language}>
      <MemoryRouter>
        <MobileNavigation onOpenChange={vi.fn()} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('MobileNavigation Chinese-only entries', () => {
  it('shows Academy and Delivery Studio in the Chinese More drawer', async () => {
    const user = userEvent.setup();
    renderNavigation('zh-CN');

    await user.click(screen.getByRole('button', { name: '更多' }));

    const drawer = screen.getByRole('dialog', { name: '更多页面' });
    expect(
      within(drawer).getByRole('link', { name: 'AI 学院' }),
    ).toHaveAttribute('href', '/academy');
    expect(
      within(drawer).getByRole('link', { name: '交付工作台' }),
    ).toHaveAttribute('href', '/delivery');
    expect(
      within(drawer).queryByRole('link', { name: 'FDE Delivery Studio' }),
    ).not.toBeInTheDocument();
  });

  it('omits Academy and Delivery Studio from the English More drawer', async () => {
    const user = userEvent.setup();
    renderNavigation('en-US');

    await user.click(screen.getByRole('button', { name: 'More' }));

    const drawer = screen.getByRole('dialog', { name: 'More destinations' });
    expect(
      within(drawer).queryByRole('link', { name: 'AI Academy' }),
    ).not.toBeInTheDocument();
    expect(
      within(drawer).queryByRole('link', { name: 'Delivery Studio' }),
    ).not.toBeInTheDocument();
    expect(drawer.querySelector('a[href="/delivery"]')).toBeNull();
  });
});
