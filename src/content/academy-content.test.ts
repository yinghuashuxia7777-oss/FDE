import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateAcademyContent } from '../../scripts/validate-academy-content';
import type { AcademyCatalog, AcademyTool, AcademyTopic } from '../domain/academy/types';

const academyDirectory = resolve(process.cwd(), 'content/academy/zh-CN');

const approvedTopicSourceUrls: Readonly<Record<string, readonly string[]>> = {
  'academy.deep-learning-neural-networks': [
    'https://www.runoob.com/ai/ai-deep-learning.html',
  ],
  'academy.transformer-llm': [
    'https://www.runoob.com/ai/ai-transformer.html',
  ],
  'academy.tokens-context-generation': [
    'https://www.runoob.com/ai-agent/token-intro.html',
    'https://www.runoob.com/ai-agent/agent-context-engineering.html',
  ],
  'academy.nlp-multimodal': [
    'https://www.runoob.com/ai/ai-multimodal.html',
  ],
  'academy.model-serving-local': [
    'https://www.runoob.com/ollama/ollama-tutorial.html',
  ],
  'academy.fine-tuning-rlhf-deployment': [
    'https://www.runoob.com/ai/ai-rlhf.html',
  ],
  'academy.agent-evaluation-safety': [
    'https://www.runoob.com/ai/ai-evaluation.html',
  ],
  'academy.evaluation-guardrails': [
    'https://www.runoob.com/ai/ai-evaluation.html',
  ],
  'academy.ai-system-architecture': [
    'https://www.runoob.com/ai/ai-system-architecture.html',
  ],
  'academy.agent-workflow': [
    'https://www.runoob.com/ai/ai-workflow-auto.html',
  ],
};

const approvedToolSourceUrls: Readonly<Record<string, string>> = {
  'tool.codex': 'https://www.runoob.com/codex/codex-intro.html',
  'tool.claude-code':
    'https://www.runoob.com/claude-code/claude-code-tutorial.html',
  'tool.opencode': 'https://www.runoob.com/opencode/opencode-tutorial.html',
  'tool.vibe-coding':
    'https://www.runoob.com/vibe-coding/vibe-coding-tutorial.html',
  'tool.agent-skills': 'https://www.runoob.com/skills/skills-tutorial.html',
  'tool.ollama': 'https://www.runoob.com/ollama/ollama-tutorial.html',
  'tool.hermes-agent':
    'https://www.runoob.com/hermes-agent/hermes-agent-tutorial.html',
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readTopics(): AcademyTopic[] {
  return readdirSync(resolve(academyDirectory, 'topics'))
    .filter((file) => file.endsWith('.json'))
    .map((file) =>
      readJson<AcademyTopic>(resolve(academyDirectory, 'topics', file)),
    );
}

function readTools(): AcademyTool[] {
  return readJson<{ tools: AcademyTool[] }>(
    resolve(academyDirectory, 'tools/catalog.json'),
  ).tools;
}

describe('Chinese Academy content catalog', () => {
  it('ships the approved five-stage catalog with 25 Topics and 7 Tools', () => {
    const catalog = readJson<AcademyCatalog>(
      resolve(academyDirectory, 'catalog.json'),
    );
    const topics = readTopics();
    const tools = readTools();

    expect(catalog.stages.map(({ id }) => id)).toEqual([
      'stage-0',
      'stage-1',
      'stage-2',
      'stage-3',
      'stage-4',
    ]);
    expect(topics).toHaveLength(25);
    expect(tools).toHaveLength(7);
    expect(tools.map(({ id }) => id)).toEqual([
      'tool.codex',
      'tool.claude-code',
      'tool.opencode',
      'tool.vibe-coding',
      'tool.agent-skills',
      'tool.ollama',
      'tool.hermes-agent',
    ]);
  });

  it('gives every Topic five original sections and a source reference', () => {
    const navigationTerms = ['全部教程', '返回顶部', '上一页', '下一页'];

    readTopics().forEach((topic) => {
      expect(topic.sections).toHaveLength(5);
      expect(topic.sourceRefs).not.toHaveLength(0);
      expect(
        topic.sections.every(({ content }) =>
          navigationTerms.every((term) => !content.includes(term)),
        ),
      ).toBe(true);
    });
  });

  it('keeps reviewed Topics on their precise technical source pages', () => {
    const topicsById = new Map(readTopics().map((topic) => [topic.id, topic]));

    Object.entries(approvedTopicSourceUrls).forEach(([id, allowedUrls]) => {
      const sourceUrls = topicsById.get(id)?.sourceRefs.map(({ url }) => url);

      expect(sourceUrls).toBeDefined();
      expect(sourceUrls).toEqual(allowedUrls);
    });
  });

  it('gives every tool unique source material and complete radar guidance', () => {
    const tools = readTools();

    tools.forEach((tool) => {
      expect(tool.bestFor).not.toHaveLength(0);
      expect(tool.watchOutFor).not.toHaveLength(0);
      expect(tool.nextAction).not.toHaveLength(0);
      expect(tool.sourceRefs).not.toHaveLength(0);
    });
    const toolSourceUrls = tools.map(({ sourceRefs }) => sourceRefs[0]?.url);
    expect(new Set(toolSourceUrls).size).toBe(7);
    expect(toolSourceUrls).not.toContain(
      'https://www.runoob.com/ai/ai-tools.html',
    );
    expect(
      Object.fromEntries(
        tools.map(({ id, sourceRefs }) => [id, sourceRefs[0]?.url]),
      ),
    ).toEqual(approvedToolSourceUrls);
  });

  it('passes the Academy relationship and source validation', () => {
    expect(validateAcademyContent()).toMatchObject({
      ok: true,
      topicsChecked: 25,
      toolsChecked: 7,
      issues: [],
    });
  });
});
