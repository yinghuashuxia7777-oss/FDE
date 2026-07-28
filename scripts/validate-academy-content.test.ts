import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { PROJECT_ROOT } from './files';
import {
  runValidateAcademyContentCli,
  validateAcademyContent,
} from './validate-academy-content';

const temporaryDirectories: string[] = [];

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
  tags: ['提示词'],
  sections: sectionKinds.map((kind) => ({
    kind,
    title: `${kind} 标题`,
    content: `${kind} 正文`,
  })),
  relatedFoundationIds: ['computer.software-program'],
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

const validTool = {
  id: 'tool.fixture',
  title: 'Fixture Tool',
  summary: '用于验证 Topic 引用的测试工具。',
  bestFor: '适合验证 Academy Tool 的内容合约。',
  watchOutFor: '仅用于测试，不代表真实工具建议。',
  nextAction: '运行 validator 并检查结构化报告。',
  url: 'https://example.com/tool',
  tags: ['测试'],
  relatedTopicIds: ['academy.prompt-basics'],
  sourceRefs: [
    {
      title: '菜鸟教程：AI 工具',
      url: 'https://www.runoob.com/ai/ai-tools.html',
      retrievedAt: '2026-07-28',
    },
  ],
};

function catalog(topicIdsByStage: readonly (readonly string[])[] = []) {
  return {
    schemaVersion: 1,
    locale: 'zh-CN',
    stages: Array.from({ length: 5 }, (_, index) => ({
      id: `stage-${index}`,
      topicIds: topicIdsByStage[index] ?? [],
    })),
  };
}

function temporaryRoot(): string {
  const root = mkdtempSync(resolve(PROJECT_ROOT, '.tmp-academy-validation-'));
  temporaryDirectories.push(root);
  return root;
}

function writeJson(root: string, file: string, value: unknown): void {
  const path = resolve(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeAcademyFixture(
  root: string,
  options: {
    catalog?: unknown;
    topics?: readonly unknown[];
    tools?: readonly unknown[];
  } = {},
): void {
  writeJson(
    root,
    'content/academy/zh-CN/catalog.json',
    options.catalog ?? catalog(),
  );
  writeJson(root, 'content/academy/zh-CN/tools/catalog.json', {
    tools: options.tools ?? [],
  });
  (options.topics ?? []).forEach((topic, index) => {
    writeJson(
      root,
      `content/academy/zh-CN/topics/topic-${index + 1}.json`,
      topic,
    );
  });
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('validateAcademyContent', () => {
  it('accepts the empty five-stage scaffold', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root);

    expect(validateAcademyContent(root)).toEqual({
      ok: true,
      topicsChecked: 0,
      toolsChecked: 0,
      issues: [],
    });
  });

  it('rejects every unknown external reference at its authored path', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root, {
      catalog: catalog([['academy.prompt-basics']]),
      topics: [
        {
          ...validTopic,
          relatedFoundationIds: ['foundation.missing'],
          relatedPracticeIds: ['practice.missing'],
          relatedCaseIds: ['case.missing'],
          relatedSkillIds: ['skill.missing'],
        },
      ],
    });

    const report = validateAcademyContent(root);

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/academy/zh-CN/topics/topic-1.json',
          path: ['relatedFoundationIds', 0],
          code: 'missing_foundation_reference',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/topics/topic-1.json',
          path: ['relatedPracticeIds', 0],
          code: 'missing_practice_reference',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/topics/topic-1.json',
          path: ['relatedCaseIds', 0],
          code: 'missing_case_reference',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/topics/topic-1.json',
          path: ['relatedSkillIds', 0],
          code: 'missing_skill_reference',
        }),
      ]),
    );
  });

  it('does not accept a malformed JSON object as a canonical MVP Practice', () => {
    const root = temporaryRoot();
    const referenceRoot = temporaryRoot();
    writeAcademyFixture(root, {
      catalog: catalog([['academy.prompt-basics']]),
      topics: [
        {
          ...validTopic,
          relatedFoundationIds: [],
          relatedPracticeIds: ['practice.looks-valid-by-id-only'],
        },
      ],
    });
    writeJson(referenceRoot, 'content/practices/mvp/malformed.json', {
      id: 'practice.looks-valid-by-id-only',
    });

    const report = validateAcademyContent(root, referenceRoot);

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        path: ['relatedPracticeIds', 0],
        code: 'missing_practice_reference',
      }),
    );
  });

  it('accepts a Practice only after the canonical Practice schema accepts it', () => {
    const root = temporaryRoot();
    const referenceRoot = temporaryRoot();
    writeAcademyFixture(root, {
      catalog: catalog([['academy.prompt-basics']]),
      topics: [
        {
          ...validTopic,
          relatedFoundationIds: [],
          relatedPracticeIds: ['practice.eng.python-engineering'],
        },
      ],
    });
    const practice = JSON.parse(
      readFileSync(
        resolve(
          PROJECT_ROOT,
          'content/practices/mvp/01-eng.python-engineering.json',
        ),
        'utf8',
      ),
    ) as unknown;
    writeJson(
      referenceRoot,
      'content/practices/mvp/01-eng.python-engineering.json',
      practice,
    );

    expect(
      validateAcademyContent(root, referenceRoot).issues,
    ).not.toContainEqual(
      expect.objectContaining({ code: 'missing_practice_reference' }),
    );
  });

  it('reports missing, unlisted, and unknown tool Topic relations precisely', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root, {
      catalog: catalog([['academy.catalog-only']]),
      topics: [validTopic],
      tools: [
        {
          ...validTool,
          relatedTopicIds: ['academy.missing-tool-topic'],
        },
      ],
    });

    const report = validateAcademyContent(root);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/academy/zh-CN/catalog.json',
          path: ['stages', 0, 'topicIds', 0],
          code: 'missing_catalog_topic',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/topics/topic-1.json',
          path: ['stageId'],
          code: 'topic_not_in_catalog',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/tools/catalog.json',
          path: ['tools', 0, 'relatedTopicIds', 0],
          code: 'missing_tool_topic_reference',
        }),
      ]),
    );
  });

  it('rejects a Tool missing the original display fields', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root, {
      tools: [
        {
          id: validTool.id,
          title: validTool.title,
          summary: validTool.summary,
          url: validTool.url,
          tags: validTool.tags,
          relatedTopicIds: [],
        },
      ],
    });

    expect(validateAcademyContent(root).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/academy/zh-CN/tools/catalog.json',
          path: ['tools', 0, 'bestFor'],
          code: 'schema_invalid',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/tools/catalog.json',
          path: ['tools', 0, 'watchOutFor'],
          code: 'schema_invalid',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/tools/catalog.json',
          path: ['tools', 0, 'nextAction'],
          code: 'schema_invalid',
        }),
      ]),
    );
  });

  it('rejects a Tool with no source reference at the authored path', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root, {
      tools: [{ ...validTool, relatedTopicIds: [], sourceRefs: [] }],
    });

    expect(validateAcademyContent(root).issues).toContainEqual(
      expect.objectContaining({
        file: 'content/academy/zh-CN/tools/catalog.json',
        path: ['tools', 0, 'sourceRefs'],
        code: 'schema_invalid',
      }),
    );
  });

  it('rejects duplicate catalog placement and placement in the wrong stage', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root, {
      catalog: catalog([['academy.prompt-basics'], ['academy.prompt-basics']]),
      topics: [{ ...validTopic, stageId: 'stage-1' }],
    });

    const report = validateAcademyContent(root);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'content/academy/zh-CN/catalog.json',
          path: ['stages', 1, 'topicIds', 0],
          code: 'duplicate_catalog_topic',
        }),
        expect.objectContaining({
          file: 'content/academy/zh-CN/catalog.json',
          path: ['stages', 0, 'topicIds', 0],
          code: 'topic_stage_mismatch',
        }),
      ]),
    );
  });

  it('locates a duplicate within one stage at the repeated catalog entry', () => {
    const root = temporaryRoot();
    writeAcademyFixture(root, {
      catalog: catalog([['academy.prompt-basics', 'academy.prompt-basics']]),
      topics: [validTopic],
    });

    expect(validateAcademyContent(root).issues).toContainEqual(
      expect.objectContaining({
        file: 'content/academy/zh-CN/catalog.json',
        path: ['stages', 0, 'topicIds', 1],
        code: 'schema_invalid',
      }),
    );
  });

  it('requires both catalogs and returns issues in deterministic order', () => {
    const root = temporaryRoot();

    const first = validateAcademyContent(root);
    const second = validateAcademyContent(root);

    expect(first).toEqual(second);
    expect(first.ok).toBe(false);
    expect(first.issues).toEqual([
      {
        file: 'content/academy/zh-CN/catalog.json',
        path: [],
        code: 'missing_catalog',
        message: 'Academy catalog is required.',
      },
      {
        file: 'content/academy/zh-CN/tools/catalog.json',
        path: [],
        code: 'missing_tool_catalog',
        message: 'Academy tool catalog is required.',
      },
    ]);
  });

  it('returns a failing CLI exit code so an invalid Academy stops the build', () => {
    const root = temporaryRoot();
    const outputs: { content: string; ok: boolean }[] = [];

    const exitCode = runValidateAcademyContentCli(
      root,
      PROJECT_ROOT,
      (content, ok) => outputs.push({ content, ok }),
    );

    expect(exitCode).toBe(1);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]?.ok).toBe(false);
    expect(JSON.parse(outputs[0]?.content ?? '{}')).toMatchObject({
      ok: false,
      issues: [{ code: 'missing_catalog' }, { code: 'missing_tool_catalog' }],
    });
  });
});
