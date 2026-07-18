import type { ConceptKnowledge } from '../domain/concepts/types';
import { LocalConceptSource } from './concept-source';

function conceptItem(
  overrides: Partial<ConceptKnowledge> = {},
): ConceptKnowledge {
  return {
    schemaVersion: 1,
    id: 'concept.default',
    type: 'concept',
    category: 'api-backend',
    order: 1,
    title: '默认概念',
    technicalTerm: 'Default Concept',
    simpleExplanation: '这是供测试使用的一句话概念解释。',
    analogy: '它像一本索引卡，连接基础知识和真实问题。',
    technicalExplanation: '概念条目通过稳定 ID 建立只读关系。',
    whyItMatters: '它帮助学习者在进入案件前建立决策所需的心智模型。',
    commonMistakes: '不要把概念标题或文件路径当成永久关系键。',
    relatedFoundation: ['foundation.default'],
    relatedCases: ['case-default'],
    ...overrides,
  };
}

function lazy(value: unknown) {
  return { load: () => Promise.resolve({ default: value }) };
}

describe('LocalConceptSource', () => {
  it('loads concepts in deterministic authored order with ID tie-breaking', async () => {
    const source = new LocalConceptSource([
      lazy(conceptItem({ id: 'concept.zeta', order: 2 })),
      lazy(conceptItem({ id: 'concept.bravo', order: 1 })),
      lazy(conceptItem({ id: 'concept.alpha', order: 1 })),
    ]);

    await expect(source.loadAll()).resolves.toMatchObject([
      { id: 'concept.alpha', order: 1 },
      { id: 'concept.bravo', order: 1 },
      { id: 'concept.zeta', order: 2 },
    ]);
  });

  it('runtime-validates every lazy value', async () => {
    const invalid = conceptItem() as unknown as Record<string, unknown>;
    delete invalid.simpleExplanation;

    await expect(
      new LocalConceptSource([lazy(invalid)]).loadAll(),
    ).rejects.toThrow();
  });

  it('rejects duplicate stable IDs across lazy entries', async () => {
    const source = new LocalConceptSource([
      lazy(conceptItem({ id: 'concept.duplicate', order: 1 })),
      lazy(conceptItem({ id: 'concept.duplicate', order: 2 })),
    ]);

    await expect(source.loadAll()).rejects.toThrow(/duplicate concept id/i);
  });

  it('caches one deeply frozen snapshot', async () => {
    let loadCalls = 0;
    const source = new LocalConceptSource([
      {
        load: () => {
          loadCalls += 1;
          return Promise.resolve({ default: conceptItem() });
        },
      },
    ]);

    const first = source.loadAll();
    expect(source.loadAll()).toBe(first);
    const snapshot = await first;

    expect(loadCalls).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0]?.relatedFoundation)).toBe(true);
    expect(Object.isFrozen(snapshot[0]?.relatedCases)).toBe(true);
  });

  it('finds by stable ID and returns undefined for an unknown ID', async () => {
    const source = new LocalConceptSource([
      lazy(conceptItem({ id: 'concept.find-me' })),
    ]);
    const snapshot = await source.loadAll();

    await expect(source.findById('concept.find-me')).resolves.toBe(snapshot[0]);
    await expect(source.findById('concept.missing')).resolves.toBeUndefined();
  });
});
