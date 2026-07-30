import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { App } from '../../app/App';
import { createAppRouter } from '../../app/router';
import { FDE_DELIVERY_STORAGE_KEY } from '../../application/delivery/fde-delivery-sidecar';
import { I18N_STORAGE_KEY, type Language } from '../../i18n';

const activeRouters = new Set<ReturnType<typeof createAppRouter>>();

function renderRoute(path: string, language: Language = 'zh-CN') {
  window.localStorage.setItem(I18N_STORAGE_KEY, JSON.stringify({ language }));
  window.history.replaceState(null, '', `/#${path}`);
  const router = createAppRouter();
  activeRouters.add(router);
  return { ...render(<App router={router} />), router };
}

afterEach(() => {
  cleanup();
  for (const router of activeRouters) router.dispose();
  activeRouters.clear();
  window.history.replaceState(null, '', '/#/');
  window.localStorage.clear();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('lang');
});

describe('Delivery Studio routes', () => {
  it('lists three templates with five-stage progress in Chinese', async () => {
    renderRoute('/delivery');

    expect(
      await screen.findByRole('heading', { name: '交付工作台' }),
    ).toBeVisible();
    expect(screen.getAllByTestId('delivery-template')).toHaveLength(3);
    expect(screen.getAllByText('0 / 5 阶段已完成')).toHaveLength(3);
    expect(
      screen.getByRole('link', {
        name: '打开 AI Customer Solution Delivery',
      }),
    ).toHaveAttribute('href', '#/delivery/project.ai-customer-solution');
  });

  it('shows five stages and opens the AI Customer Solution workspace in Chinese', async () => {
    renderRoute('/delivery/project.ai-customer-solution');

    expect(await screen.findByText('Problem Brief')).toBeVisible();
    expect(
      screen.getByRole('textbox', { name: 'Problem Brief' }),
    ).toBeVisible();
    expect(screen.getAllByTestId('delivery-stage')).toHaveLength(5);
    expect(screen.getByText('内容仅保存在当前浏览器。')).toBeVisible();
    expect(screen.getByRole('link', { name: '1. Discover' })).toHaveAttribute(
      'href',
      '#/delivery/project.ai-customer-solution#delivery-stage-discover',
    );
  });

  it('saves artifact text and explicit stage completion to the Delivery sidecar', async () => {
    const user = userEvent.setup();
    renderRoute('/delivery/project.ai-customer-solution');

    const textarea = await screen.findByRole('textbox', {
      name: 'Problem Brief',
    });
    await user.type(textarea, '客户需要降低每日故障分流时间。');
    await user.click(
      screen.getByRole('button', { name: '标记 Discover 为已完成' }),
    );

    expect(
      screen.getByRole('button', { name: '将 Discover 恢复为未完成' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const records = JSON.parse(
      window.localStorage.getItem(FDE_DELIVERY_STORAGE_KEY) ?? '[]',
    ) as {
      artifacts: Record<string, string>;
      completedStageIds: string[];
    }[];
    expect(records[0]?.artifacts.discover).toBe(
      '客户需要降低每日故障分流时间。',
    );
    expect(records[0]?.completedStageIds).toEqual(['discover']);
  });

  it('links related assets and resets only after confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderRoute('/delivery/project.ai-customer-solution');

    expect(
      await screen.findByRole('link', { name: 'Customer Discovery Practice' }),
    ).toHaveAttribute('href', '#/practices/practice.fde.customer-discovery');
    expect(screen.getByRole('link', { name: 'What AI Is' })).toHaveAttribute(
      'href',
      '#/academy/academy.ai-what-it-is',
    );

    const textarea = screen.getByRole('textbox', { name: 'Problem Brief' });
    await user.type(textarea, '不应被删除');
    await user.click(screen.getByRole('button', { name: '重置交付包' }));
    expect(confirm).toHaveBeenCalledWith(
      '确定清空该模板的全部交付内容和阶段状态吗？',
    );
    expect(textarea).toHaveValue('不应被删除');

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: '重置交付包' }));
    expect(textarea).toHaveValue('');
    expect(
      JSON.parse(window.localStorage.getItem(FDE_DELIVERY_STORAGE_KEY) ?? '[]'),
    ).toEqual([]);
  });

  it('shows a Delivery-specific empty state for an invalid template', async () => {
    renderRoute('/delivery/project.does-not-exist');

    expect(
      await screen.findByRole('heading', { name: '未找到交付模板' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: '返回交付工作台' }),
    ).toHaveAttribute('href', '#/delivery');
  });

  it.each(['/delivery', '/delivery/project.ai-customer-solution'])(
    'shows only English unavailable copy in English mode at %s',
    async (path) => {
      renderRoute(path, 'en-US');

      const heading = await screen.findByRole('heading', {
        name: 'FDE Delivery Studio is coming soon in English.',
      });
      const unavailable = heading.closest('section');
      expect(unavailable).toHaveTextContent(
        /^FDE Delivery Studio is coming soon in English\.$/u,
      );
      expect(unavailable?.textContent).not.toMatch(/[\u3400-\u9fff]/u);
      expect(screen.queryByText('交付工作台')).not.toBeInTheDocument();
      expect(screen.queryByText('Problem Brief')).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('main')).getAllByRole('heading'),
      ).toHaveLength(1);
    },
  );
});
