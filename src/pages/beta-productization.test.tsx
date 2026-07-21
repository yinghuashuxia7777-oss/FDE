import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { PracticeEvidenceProvider } from '../application/practice';
import { I18nProvider } from '../i18n';
import { PracticeDetailPage } from './practices';
import { ProjectDetailPage } from './projects';
import { PublicDemoProfilePage } from './profile';
import { FeedbackPage } from './feedback';

const createObjectUrlMock = vi.fn(() => 'blob:feedback-export');
const revokeObjectUrlMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  createObjectUrlMock.mockClear();
  revokeObjectUrlMock.mockClear();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectUrlMock,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectUrlMock,
  });
});

afterEach(() => vi.restoreAllMocks());

function renderBeta(ui: React.ReactNode) {
  return render(
    <I18nProvider>
      <PracticeEvidenceProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </PracticeEvidenceProvider>
    </I18nProvider>,
  );
}

describe('Beta productization pages', () => {
  it('executes a Practice and persists local evidence', async () => {
    const user = userEvent.setup();
    renderBeta(<PracticeDetailPage practiceId="practice.rag.retrieval" />);
    await user.type(
      screen.getByLabelText('你的决策与理由'),
      '我会使用检索证据设定 threshold，并在独立查询集上验证 verify 召回结果。',
    );
    await user.click(screen.getByRole('button', { name: '提交并评估' }));
    expect(screen.getByText('已生成 Practice Evidence')).toBeVisible();
    expect(screen.getByText('已完成 · 保存在本机')).toBeVisible();
    expect(
      localStorage.getItem('fde-arena:beta:practice-completions:v1'),
    ).toContain('practice.rag.retrieval');
  });

  it('records Project milestones independently', async () => {
    const user = userEvent.setup();
    renderBeta(
      <ProjectDetailPage projectId="project.enterprise-rag-assistant" />,
    );
    expect(
      screen.getByRole('heading', { name: 'Enterprise RAG Assistant' }),
    ).toBeVisible();
    expect(screen.getByText('Architecture')).toBeVisible();
    expect(screen.getByText('RAG Retrieval')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: '标记完成' })[0]!);
    expect(screen.getByText('1 / 3 个里程碑已记录')).toBeVisible();
    expect(
      localStorage.getItem('fde-arena:beta:project-evidence:v1'),
    ).toContain('architecture');
  });

  it('renders an isolated public Demo Profile', () => {
    const { container } = renderBeta(<PublicDemoProfilePage />);
    expect(
      container.querySelector('[data-demo-profile="true"]'),
    ).not.toBeNull();
    expect(screen.getByText('72%')).toBeVisible();
    expect(screen.getAllByText('Enterprise RAG Assistant')[0]).toBeVisible();
    expect(screen.getByText('Capability Evidence')).toBeVisible();
    expect(screen.getByText('85')).toBeVisible();
    expect(
      localStorage.getItem('fde-arena:beta:practice-completions:v1'),
    ).toBeNull();
    expect(
      localStorage.getItem('fde-arena:beta:project-evidence:v1'),
    ).toBeNull();
  });

  it('exports locally saved feedback without a network request', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const downloadSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderBeta(<FeedbackPage />);

    await user.type(screen.getByLabelText('具体说明'), '第一任务很清楚');
    await user.click(screen.getByRole('button', { name: '保存在本机' }));
    await user.click(screen.getByRole('button', { name: '导出反馈 JSON' }));

    expect(createObjectUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:feedback-export');
    expect(downloadSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
