import { describe, expect, it } from 'vitest';

import {
  AcademyCatalogSchema,
  AcademyContentCollectionSchema,
  AcademyToolSchema,
  AcademyTopicSchema,
} from './academy-schema';

const sectionKinds = [
  'overview',
  'mechanism',
  'scenario',
  'pitfalls',
  'hands-on',
] as const;

const validTopic = {
  id: 'academy.prompt-basics',
  stageId: 'stage-0',
  title: '提示词基础',
  summary: '理解如何向模型清楚地描述目标、背景和约束。',
  estimatedMinutes: 12,
  tags: ['提示词', '入门'],
  sections: sectionKinds.map((kind) => ({
    kind,
    title: `${kind} 标题`,
    content: `${kind} 正文`,
  })),
  relatedFoundationIds: ['ai.prompt-engineering'],
  relatedPracticeIds: [],
  relatedCaseIds: [],
  relatedSkillIds: [],
  sourceRefs: [
    {
      title: '菜鸟教程：AI 基础',
      url: 'https://www.runoob.com/ai/ai-tutorial.html',
      retrievedAt: '2026-07-28',
    },
  ],
};

const validCatalog = {
  schemaVersion: 1,
  locale: 'zh-CN',
  stages: [
    { id: 'stage-0', topicIds: ['academy.prompt-basics'] },
    { id: 'stage-1', topicIds: [] },
    { id: 'stage-2', topicIds: [] },
    { id: 'stage-3', topicIds: [] },
    { id: 'stage-4', topicIds: [] },
  ],
};

const validTool = {
  id: 'tool.chatgpt',
  title: 'ChatGPT',
  summary: '用于对话式探索与内容生成的 AI 助手。',
  url: 'https://chatgpt.com/',
  tags: ['对话', '生成式 AI'],
  relatedTopicIds: ['academy.prompt-basics'],
};

const validCollection = {
  catalog: validCatalog,
  topics: [validTopic],
  tools: [validTool],
};

describe('AcademyTopicSchema', () => {
  it('accepts a complete Topic', () => {
    expect(AcademyTopicSchema.parse(validTopic)).toEqual(validTopic);
  });

  it('rejects a Topic without a growth connection', () => {
    expect(() =>
      AcademyTopicSchema.parse({
        ...validTopic,
        relatedFoundationIds: [],
        relatedPracticeIds: [],
        relatedCaseIds: [],
        relatedSkillIds: [],
      }),
    ).toThrow(/growth connection/i);
  });

  it('rejects a source without its approved URL', () => {
    expect(() =>
      AcademyTopicSchema.parse({
        ...validTopic,
        sourceRefs: [{ title: '菜鸟教程', url: '', retrievedAt: '2026-07-28' }],
      }),
    ).toThrow(/url/i);

    expect(() =>
      AcademyTopicSchema.parse({
        ...validTopic,
        sourceRefs: [
          {
            title: '其他来源',
            url: 'https://example.com/ai',
            retrievedAt: '2026-07-28',
          },
        ],
      }),
    ).toThrow(/runoob/i);
  });

  it('requires exactly one section of every Academy section kind', () => {
    expect(() =>
      AcademyTopicSchema.parse({
        ...validTopic,
        sections: validTopic.sections.slice(0, -1),
      }),
    ).toThrow(/section kind/i);

    expect(() =>
      AcademyTopicSchema.parse({
        ...validTopic,
        sections: [...validTopic.sections, validTopic.sections[0]],
      }),
    ).toThrow(/section kind/i);
  });

  it('requires trimmed authored strings and an estimate from 3 to 45 minutes', () => {
    expect(() =>
      AcademyTopicSchema.parse({ ...validTopic, title: ' 未修剪标题 ' }),
    ).toThrow();
    expect(() =>
      AcademyTopicSchema.parse({ ...validTopic, estimatedMinutes: 2 }),
    ).toThrow();
    expect(() =>
      AcademyTopicSchema.parse({ ...validTopic, estimatedMinutes: 46 }),
    ).toThrow();
  });

  it('rejects unknown fields', () => {
    expect(() =>
      AcademyTopicSchema.parse({ ...validTopic, unexpected: true }),
    ).toThrow();
  });
});

describe('Academy content collection schemas', () => {
  it('rejects duplicate Topic IDs', () => {
    expect(() =>
      AcademyContentCollectionSchema.parse({
        ...validCollection,
        topics: [validTopic, { ...validTopic }],
      }),
    ).toThrow(/duplicate/i);
  });

  it('requires the approved five ordered stages', () => {
    expect(AcademyCatalogSchema.parse(validCatalog)).toEqual(validCatalog);
    expect(() =>
      AcademyCatalogSchema.parse({
        ...validCatalog,
        stages: [...validCatalog.stages].reverse(),
      }),
    ).toThrow(/ordered stage/i);
  });

  it('accepts an Academy Tool with a valid HTTPS URL', () => {
    expect(AcademyToolSchema.parse(validTool)).toEqual(validTool);
  });
});
