import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateAcademyContent } from '../../scripts/validate-academy-content';
import type { AcademyCatalog, AcademyTool, AcademyTopic } from '../domain/academy/types';

const academyDirectory = resolve(process.cwd(), 'content/academy/zh-CN');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('Chinese Academy content catalog', () => {
  it('ships the approved five-stage catalog with 25 Topics and 7 Tools', () => {
    const catalog = readJson<AcademyCatalog>(
      resolve(academyDirectory, 'catalog.json'),
    );
    const topics = readdirSync(resolve(academyDirectory, 'topics'))
      .filter((file) => file.endsWith('.json'))
      .map((file) =>
        readJson<AcademyTopic>(resolve(academyDirectory, 'topics', file)),
      );
    const tools = readJson<{ tools: AcademyTool[] }>(
      resolve(academyDirectory, 'tools/catalog.json'),
    ).tools;

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

  it('uses original engineering copy and complete tool radar guidance', () => {
    const rag = readJson<AcademyTopic>(
      resolve(academyDirectory, 'topics/academy.rag.json'),
    );
    const tools = readJson<{ tools: AcademyTool[] }>(
      resolve(academyDirectory, 'tools/catalog.json'),
    ).tools;

    expect(rag.sections).toHaveLength(5);
    expect(rag.sections.every(({ content }) => !content.includes('全部教程'))).toBe(
      true,
    );
    expect(rag.sourceRefs[0]?.url).toMatch(/^https:\/\/www\.runoob\.com\//);
    tools.forEach((tool) => {
      expect(tool.bestFor).not.toHaveLength(0);
      expect(tool.watchOutFor).not.toHaveLength(0);
      expect(tool.nextAction).not.toHaveLength(0);
      expect(tool.sourceRefs).not.toHaveLength(0);
    });
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
