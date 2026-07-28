import { cleanup, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';
import { createAppRouter } from '../../app/router';
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
  document.documentElement.removeAttribute('lang');
});

describe('Academy routes', () => {
  it('renders the Chinese catalog as a fixed five-stage path with a tool radar', async () => {
    renderRoute('/academy');

    expect(
      await screen.findByRole('heading', { name: 'AI 学院' }),
    ).toBeVisible();
    expect(screen.getAllByTestId('academy-stage')).toHaveLength(5);
    expect(
      screen.getByRole('heading', { name: 'Stage 0 · AI 基础认知' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: '从 AI 是什么开始' }),
    ).toHaveAttribute('href', '#/academy/academy.ai-what-it-is');

    const radar = screen.getByTestId('academy-tool-radar');
    expect(radar).toHaveTextContent('TRENDING · 持续更新');
    expect(
      within(radar).getByRole('link', { name: 'AI 工具雷达' }),
    ).toHaveAttribute('href', '#/academy/tools');
    expect(
      screen.getByText('Learn → Practice → Case → Evidence'),
    ).toBeVisible();
  });

  it('renders all five topic sections, supplied relationship IDs, and sources', async () => {
    renderRoute('/academy/academy.prompt-engineering');

    expect(
      await screen.findByRole('heading', {
        name: '提示词工程：把意图变成可测契约',
      }),
    ).toBeVisible();
    expect(screen.getAllByTestId('academy-topic-section')).toHaveLength(5);
    for (const label of [
      '一眼看懂',
      '核心机制',
      '工程场景',
      '容易踩坑',
      '动手验证',
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }

    const growth = screen.getByRole('region', { name: '成长连接' });
    expect(
      within(growth).getByRole('link', { name: 'ai.prompt' }),
    ).toHaveAttribute('href', '#/foundation/ai.prompt');
    expect(
      within(growth).getByRole('link', {
        name: 'practice.ai.prompt-engineering',
      }),
    ).toHaveAttribute('href', '#/practices/practice.ai.prompt-engineering');
    expect(within(growth).getAllByText('暂无关联内容')).toHaveLength(2);

    const sources = screen.getByRole('region', { name: '内容来源' });
    expect(
      within(sources).getByRole('link', {
        name: '菜鸟教程：AI 提示词（重编参考）',
      }),
    ).toHaveAttribute('href', 'https://www.runoob.com/ai/ai-prompt.html');
    expect(sources).toHaveTextContent('2026-07-29');
    expect(sources).toHaveTextContent('已重新编排');
  });

  it('shows an Academy-specific empty state for a missing topic', async () => {
    renderRoute('/academy/academy.does-not-exist');

    expect(
      await screen.findByRole('heading', { name: '未找到学院主题' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: '返回 AI 学院' })).toHaveAttribute(
      'href',
      '#/academy',
    );
  });

  it('renders the tool radar without skill scores or completion controls', async () => {
    renderRoute('/academy/tools');

    expect(
      await screen.findByRole('heading', { name: 'AI 工具雷达' }),
    ).toBeVisible();
    const codexCard = screen.getByRole('article', { name: 'Codex' });
    expect(codexCard).toHaveTextContent('最适合');
    expect(codexCard).toHaveTextContent('需要注意');
    expect(codexCard).toHaveTextContent('下一步行动');
    expect(
      within(codexCard).getByRole('link', { name: '查看 Codex' }),
    ).toHaveAttribute('href', '#/academy/tools/tool.codex');
    const main = screen.getByRole('main');
    expect(within(main).queryByText(/Mastery|分数/u)).not.toBeInTheDocument();
    expect(within(main).queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders tool details and only the related Topic IDs supplied by the tool', async () => {
    renderRoute('/academy/tools/tool.codex');

    expect(await screen.findByRole('heading', { name: 'Codex' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '最适合' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '需要注意' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '下一步行动' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'academy.agent-workflow' }),
    ).toHaveAttribute('href', '#/academy/academy.agent-workflow');
    expect(
      screen.getByRole('link', { name: '打开 Codex 官网' }),
    ).toHaveAttribute('href', 'https://openai.com/codex/');
    expect(
      within(screen.getByRole('main')).queryByRole('button'),
    ).not.toBeInTheDocument();
  });

  it('shows an Academy-specific empty state for a missing tool', async () => {
    renderRoute('/academy/tools/tool.does-not-exist');

    expect(
      await screen.findByRole('heading', { name: '未找到 AI 工具' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: '返回 AI 工具雷达' }),
    ).toHaveAttribute('href', '#/academy/tools');
  });

  it.each([
    '/academy',
    '/academy/academy.prompt-engineering',
    '/academy/tools',
    '/academy/tools/tool.codex',
    '/academy/academy.does-not-exist',
    '/academy/tools/tool.does-not-exist',
  ])(
    'strictly isolates Chinese Academy content from en-US at %s',
    async (path) => {
      renderRoute(path, 'en-US');

      const heading = await screen.findByRole('heading', {
        name: 'AI Academy is coming soon in English.',
      });
      const unavailable = heading.closest('section');
      expect(unavailable).toHaveTextContent(
        /^AI Academy is coming soon in English\.$/u,
      );
      expect(unavailable?.textContent).not.toMatch(/[\u3400-\u9fff]/u);
      expect(screen.queryByText('AI 基础认知')).not.toBeInTheDocument();
      expect(
        screen.queryByText('提示词工程：把意图变成可测契约'),
      ).not.toBeInTheDocument();
    },
  );
});
