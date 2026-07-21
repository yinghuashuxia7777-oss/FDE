import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ConceptKnowledge } from '../../domain/concepts/types';
import { I18nProvider } from '../../i18n';
import { ConceptGlossary } from './ConceptGlossary';

const concept: ConceptKnowledge = {
  schemaVersion: 1,
  id: 'concept.evidence',
  type: 'concept',
  category: 'fde',
  order: 1,
  title: '证据：支持决策的可核验事实',
  technicalTerm: 'Evidence',
  simpleExplanation: '证据是能被重复检查、用于支持或否定判断的事实。',
  analogy: '像医生先看检验报告，再决定下一步检查。',
  technicalExplanation: '证据需要标明来源、时间、环境和对照。',
  whyItMatters: '它让范围界定、根因判断与修复验证保持可追溯。',
  commonMistakes: '不要把一条日志直接当成根因。',
  relatedFoundation: ['fde.requirement-evidence'],
  relatedCases: ['observability-correlation-id-001'],
};

describe('ConceptGlossary', () => {
  it('starts in newcomer language and becomes term-first after explanation is viewed', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLanguage="zh-CN">
        <ConceptGlossary concepts={[concept]} />
      </I18nProvider>,
    );

    const term = screen.getByRole('button', {
      name: '证据：支持决策的可核验事实（Evidence）',
    });
    expect(term).toHaveAttribute('aria-expanded', 'false');
    expect(term.querySelector('[lang="zh-CN"]')).toHaveTextContent(
      concept.title,
    );
    expect(term.querySelector('[lang="en"]')).toHaveTextContent(
      concept.technicalTerm,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: '工程概念' }),
    ).toBeVisible();

    const viewExplanation = screen.getByRole('button', {
      name: '查看概念解释',
    });
    expect(viewExplanation).toHaveAttribute(
      'aria-controls',
      'concept-explanation-concept.evidence',
    );
    expect(viewExplanation).toHaveAttribute('aria-expanded', 'false');

    await user.click(viewExplanation);

    expect(screen.getByText('简单理解')).toBeVisible();
    expect(screen.getByText(concept.simpleExplanation)).toHaveAttribute(
      'lang',
      'zh-CN',
    );
    expect(screen.getByText('为什么重要')).toBeVisible();
    expect(screen.getByText(concept.whyItMatters)).toBeVisible();
    expect(viewExplanation).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Evidence' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('lets every technical term open its own explanation', async () => {
    const user = userEvent.setup();
    const second = {
      ...concept,
      id: 'concept.debugging',
      title: '调试：用证据缩小故障范围',
      technicalTerm: 'Debugging',
      simpleExplanation: '调试是用可重复的检查逐步排除错误假设。',
    };
    render(
      <I18nProvider initialLanguage="en-US">
        <ConceptGlossary concepts={[concept, second]} />
      </I18nProvider>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Debugging',
      }),
    );

    expect(
      screen.getByText(
        'Debugging is a core concept used to reason clearly about evidence-backed customer delivery.',
      ),
    ).toBeVisible();
    const familiarTerm = screen.getByRole('button', { name: 'Debugging' });
    expect(familiarTerm).toHaveAttribute('aria-expanded', 'true');
    expect(familiarTerm.querySelector('[lang="en"]')).toHaveTextContent(
      'Debugging',
    );
    expect(
      screen.getByText(
        'Debugging is a core concept used to reason clearly about evidence-backed customer delivery.',
      ),
    ).toHaveAttribute('lang', 'en-US');
  });
});
