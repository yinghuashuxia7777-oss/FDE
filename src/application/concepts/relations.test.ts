import type { ConceptKnowledge } from '../../domain/concepts/types';
import {
  conceptsForCase,
  conceptsForFoundation,
  summarizeConceptRelations,
} from './relations';

function concept(
  id: string,
  order: number,
  relatedFoundation: string[],
  relatedCases: string[],
): ConceptKnowledge {
  return {
    schemaVersion: 1,
    id,
    type: 'concept',
    category: 'fde',
    order,
    title: id,
    technicalTerm: id,
    simpleExplanation: '说明这个概念如何连接知识与案例。',
    analogy: '像一座把两个区域连接起来的桥。',
    technicalExplanation: '关系只使用永久稳定 ID，不依赖标题或文件路径。',
    whyItMatters: '进入真实决策前需要先理解这个概念。',
    commonMistakes: '不要使用数组下标维护关系。',
    relatedFoundation,
    relatedCases,
  };
}

const concepts = [
  concept('concept.second', 2, ['foundation.shared'], ['case.shared']),
  concept(
    'concept.first',
    1,
    ['foundation.shared', 'foundation.first'],
    ['case.shared'],
  ),
  concept('concept.other', 3, ['foundation.other'], ['case.other']),
];

describe('Concept reverse relations', () => {
  it('selects Foundation-related concepts without changing Foundation data', () => {
    expect(
      conceptsForFoundation(concepts, 'foundation.shared').map(({ id }) => id),
    ).toEqual(['concept.first', 'concept.second']);
  });

  it('selects Case prerequisites without changing Case data', () => {
    expect(
      conceptsForCase(concepts, 'case.shared').map(({ id }) => id),
    ).toEqual(['concept.first', 'concept.second']);
  });

  it('reports unique relation coverage and total edges', () => {
    expect(summarizeConceptRelations(concepts)).toEqual({
      conceptCount: 3,
      foundationRelationCount: 4,
      relatedFoundationCount: 3,
      caseRelationCount: 3,
      relatedCaseCount: 2,
    });
  });
});
