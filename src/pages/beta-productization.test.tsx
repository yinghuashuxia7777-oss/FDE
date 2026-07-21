import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { PracticeEvidenceProvider } from '../application/practice';
import { I18nProvider } from '../i18n';
import { PracticeDetailPage } from './practices';
import { ProjectDetailPage } from './projects';
import { PublicDemoProfilePage } from './profile';

beforeEach(() => localStorage.clear());

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
    expect(screen.getByText('Verified Evidence')).toBeVisible();
    expect(screen.getByText('85')).toBeVisible();
  });
});
