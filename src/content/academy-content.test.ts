import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateAcademyContent } from '../../scripts/validate-academy-content';
import type { AcademyCatalog, AcademyTool, AcademyTopic } from '../domain/academy/types';

const academyDirectory = resolve(process.cwd(), 'content/academy/zh-CN');

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
