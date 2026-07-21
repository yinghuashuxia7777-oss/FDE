import { ConceptKnowledgeSchema } from './concept-schema';

const completeConcept = {
  schemaVersion: 1,
  id: 'concept.request-response',
  type: 'concept',
  category: 'api-backend',
  order: 1,
  title: '请求与响应：一次调用的输入与结果',
  technicalTerm: 'Request / Response',
  simpleExplanation: '客户端发出请求，服务端返回处理结果。',
  analogy: '像在餐厅点餐：菜单和要求是请求，端回来的餐点与说明是响应。',
  technicalExplanation:
    '请求携带方法、地址、头部和可选正文；响应携带状态码、头部和可选正文。',
  whyItMatters:
    'FDE 需要区分请求是否正确发出、服务端是否收到，以及响应在哪一层发生异常。',
  commonMistakes:
    '只看响应正文而忽略状态码与响应头，或把网络失败误判成业务失败。',
  relatedFoundation: ['computer.request-response', 'http-request-basic'],
  relatedCases: ['http-unsupported-media-type-001'],
};

function candidate() {
  return structuredClone(completeConcept);
}

describe('ConceptKnowledgeSchema', () => {
  it('accepts one complete Concept item', () => {
    expect(ConceptKnowledgeSchema.safeParse(candidate()).success).toBe(true);
  });

  it.each([
    'title',
    'technicalTerm',
    'simpleExplanation',
    'analogy',
    'technicalExplanation',
    'whyItMatters',
    'commonMistakes',
  ] as const)('requires substantive authored field %s', (field) => {
    const concept = candidate() as Record<string, unknown>;
    concept[field] = '   ';

    expect(ConceptKnowledgeSchema.safeParse(concept).success).toBe(false);
  });

  it.each([
    ['Foundation', 'relatedFoundation'],
    ['Case', 'relatedCases'],
  ] as const)('rejects duplicate %s stable IDs', (_label, field) => {
    const concept = candidate() as Record<string, unknown>;
    const firstId = (concept[field] as string[])[0];
    concept[field] = [firstId, firstId];

    expect(ConceptKnowledgeSchema.safeParse(concept).success).toBe(false);
  });

  it('rejects unsafe executable authored text', () => {
    const concept = candidate();
    concept.technicalExplanation = '<script>alert(document.cookie)</script>';

    expect(ConceptKnowledgeSchema.safeParse(concept).success).toBe(false);
  });

  it('rejects unstable identifiers and unsupported categories', () => {
    const concept = candidate();
    concept.id = '../Request Response';
    concept.category = 'misc';

    expect(ConceptKnowledgeSchema.safeParse(concept).success).toBe(false);
  });
});
