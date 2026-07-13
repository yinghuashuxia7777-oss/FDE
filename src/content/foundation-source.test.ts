import type { FoundationKnowledge } from '../domain/foundation/types';
import { LocalFoundationSource } from './foundation-source';

function foundationItem(
  overrides: Partial<FoundationKnowledge> = {},
): FoundationKnowledge {
  return {
    schemaVersion: 1,
    id: 'foundation.default',
    type: 'foundation',
    title: '基础知识',
    domain: 'computer-basics',
    track: 'computer-basics',
    skills: ['software.foundations'],
    level: 'beginner',
    order: 1,
    estimatedMinutes: 5,
    content: {
      simpleExplanation: '一句话解释这个基础概念。',
      analogy: '用日常生活中的场景来类比。',
      technicalExplanation: '给出准确而简洁的技术解释。',
      example: '说明这个概念在真实问题中的应用。',
      commonMistakes: '指出学习者最容易混淆的地方。',
    },
    relatedCases: ['case.foundation-example'],
    ...overrides,
  };
}

function lazy(value: unknown) {
  return {
    load: () => Promise.resolve({ default: value }),
  };
}

describe('LocalFoundationSource', () => {
  it('loads items in deterministic authored order with ID tie-breaking', async () => {
    const source = new LocalFoundationSource([
      lazy(foundationItem({ id: 'foundation.zeta', order: 2 })),
      lazy(foundationItem({ id: 'foundation.bravo', order: 1 })),
      lazy(foundationItem({ id: 'foundation.alpha', order: 1 })),
    ]);

    await expect(source.loadAll()).resolves.toMatchObject([
      { id: 'foundation.alpha', order: 1 },
      { id: 'foundation.bravo', order: 1 },
      { id: 'foundation.zeta', order: 2 },
    ]);
  });

  it('runtime-parses every value returned by the lazy index', async () => {
    const invalid = foundationItem() as unknown as Record<string, unknown>;
    delete invalid.content;
    const source = new LocalFoundationSource([lazy(invalid)]);

    await expect(source.loadAll()).rejects.toThrow();
  });

  it('caches and returns one load Promise', async () => {
    let loadCalls = 0;
    const source = new LocalFoundationSource([
      {
        load: () => {
          loadCalls += 1;
          return Promise.resolve({ default: foundationItem() });
        },
      },
    ]);

    const first = source.loadAll();
    const second = source.loadAll();

    expect(second).toBe(first);
    await first;
    expect(loadCalls).toBe(1);
  });

  it('returns a deeply frozen snapshot', async () => {
    const source = new LocalFoundationSource([lazy(foundationItem())]);

    const snapshot = await source.loadAll();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0]?.content)).toBe(true);
    expect(Object.isFrozen(snapshot[0]?.skills)).toBe(true);
    expect(Object.isFrozen(snapshot[0]?.relatedCases)).toBe(true);
  });

  it('finds from the validated snapshot and safely returns undefined when absent', async () => {
    const source = new LocalFoundationSource([
      lazy(foundationItem({ id: 'foundation.find-me' })),
    ]);
    const snapshot = await source.loadAll();

    await expect(source.findById('foundation.find-me')).resolves.toBe(
      snapshot[0],
    );
    await expect(source.findById('__proto__')).resolves.toBeUndefined();
    await expect(
      source.findById('foundation.missing'),
    ).resolves.toBeUndefined();
  });
});
