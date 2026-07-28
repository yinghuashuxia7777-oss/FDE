import { describe, expect, it } from 'vitest';

import {
  StaticAcademyContentSource,
  bundledAcademySource,
} from './academy-source';

describe('bundledAcademySource', () => {
  it('returns one deeply frozen Catalog snapshot', async () => {
    const first = await bundledAcademySource.loadCatalog();
    const second = await bundledAcademySource.loadCatalog();

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.stages)).toBe(true);
    expect(Object.isFrozen(first.stages[0])).toBe(true);
    expect(Object.isFrozen(first.stages[0]?.topicIds)).toBe(true);
  });

  it('returns Topics in Catalog order as one deeply frozen snapshot', async () => {
    const catalog = await bundledAcademySource.loadCatalog();
    const first = await bundledAcademySource.loadTopics();
    const second = await bundledAcademySource.loadTopics();

    expect(second).toBe(first);
    expect(first.map(({ id }) => id)).toEqual(
      catalog.stages.flatMap(({ topicIds }) => topicIds),
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0]?.sections)).toBe(true);
    expect(Object.isFrozen(first[0]?.sections[0])).toBe(true);
  });

  it('finds Topics from the frozen snapshot and returns undefined when absent', async () => {
    const topics = await bundledAcademySource.loadTopics();

    await expect(
      bundledAcademySource.findTopic('academy.agent-workflow'),
    ).resolves.toBe(topics.find(({ id }) => id === 'academy.agent-workflow'));
    await expect(
      bundledAcademySource.findTopic('academy.missing'),
    ).resolves.toBeUndefined();
    await expect(
      bundledAcademySource.findTopic('__proto__'),
    ).resolves.toBeUndefined();
  });

  it('returns stable frozen Tools and finds them by ID', async () => {
    const first = await bundledAcademySource.loadTools();
    const second = await bundledAcademySource.loadTools();

    expect(second).toBe(first);
    expect(first.map(({ id }) => id)).toEqual([
      'tool.codex',
      'tool.claude-code',
      'tool.opencode',
      'tool.vibe-coding',
      'tool.agent-skills',
      'tool.ollama',
      'tool.hermes-agent',
    ]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0]?.sourceRefs)).toBe(true);
    await expect(bundledAcademySource.findTool('tool.codex')).resolves.toBe(
      first[0],
    );
    await expect(
      bundledAcademySource.findTool('tool.missing'),
    ).resolves.toBeUndefined();
  });
});

describe('StaticAcademyContentSource', () => {
  it('rejects malformed Academy JSON before exposing a snapshot', () => {
    expect(
      () =>
        new StaticAcademyContentSource(
          {
            schemaVersion: 1,
            locale: 'zh-CN',
            stages: [],
          },
          [],
          { tools: [] },
        ),
    ).toThrow();
  });
});
