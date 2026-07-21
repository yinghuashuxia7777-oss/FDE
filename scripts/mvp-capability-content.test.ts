import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MvpProjectCatalogSchema } from '../src/content/mvp-project-schema';

const root = process.cwd();

function json(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;
}

describe('MVP capability content', () => {
  it('ships exactly 40 reviewed Leaf Skills', () => {
    const catalog = json(
      'content/skill-graph/v2/releases/0.2.0/catalog.json',
    ) as { expectedLeafCount: number; leaves: { status: string }[] };
    expect(catalog.expectedLeafCount).toBe(40);
    expect(catalog.leaves).toHaveLength(40);
    expect(catalog.leaves.every(({ status }) => status === 'reviewed')).toBe(
      true,
    );
  });

  it('maps exactly 50 Case versions with one primary and at most three Leaves', () => {
    const map = json('content/skill-attribution/mvp/map.v1.json') as {
      entries: { caseId: string; caseVersion: number; role: string }[];
    };
    const grouped = new Map<string, typeof map.entries>();
    map.entries.forEach((entry) => {
      const key = `${entry.caseId}@${String(entry.caseVersion)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    });
    expect(grouped.size).toBe(50);
    for (const entries of grouped.values()) {
      expect(entries).toHaveLength(entries.length);
      expect(entries.length).toBeLessThanOrEqual(3);
      expect(entries.filter(({ role }) => role === 'primary')).toHaveLength(1);
    }
  });

  it('ships exactly 40 one-action Practice definitions', () => {
    const files = readdirSync(resolve(root, 'content/practices/mvp')).filter(
      (file) => file.endsWith('.json'),
    );
    expect(files).toHaveLength(40);
    for (const file of files) {
      const practice = json(`content/practices/mvp/${file}`) as {
        action: { scored: boolean };
        primaryConceptId: string;
        primaryLeafSkillId: string;
      };
      expect(typeof practice.primaryConceptId).toBe('string');
      expect(typeof practice.primaryLeafSkillId).toBe('string');
      expect(practice.action.scored).toBe(true);
    }
  });

  it('ships exactly three definition-only Project templates', () => {
    const catalog = json('content/projects/mvp/catalog.json') as {
      projects: unknown[];
    };
    expect(catalog.projects).toHaveLength(3);
    expect(MvpProjectCatalogSchema.safeParse(catalog).success).toBe(true);
  });

  it('freezes the 10/15/10/10/5 Beta Case portfolio', () => {
    const portfolio = json('content/portfolio/beta-case-coverage.json') as {
      categories: Record<string, string[]>;
    };
    expect(
      Object.fromEntries(
        Object.entries(portfolio.categories).map(([key, ids]) => [
          key,
          ids.length,
        ]),
      ),
    ).toEqual({
      software: 10,
      aiApplication: 15,
      agent: 10,
      production: 10,
      fde: 5,
    });
    expect(new Set(Object.values(portfolio.categories).flat()).size).toBe(50);
  });
});
