import { describe, expect, it } from 'vitest';

import type { CaseLevel, FdeCase } from '../src/domain/cases/types';
import { createMinimalValidCase } from '../src/tests/fixtures/cases';

import { auditCoverage } from './audit-coverage';

function publishedCase(
  id: string,
  domains: string[],
  level: CaseLevel = 'intermediate',
): FdeCase {
  const candidate = createMinimalValidCase();
  candidate.id = id;
  candidate.slug = id;
  candidate.status = 'published';
  candidate.level = level;
  candidate.domains = domains;
  candidate.metadata.reviewer = 'Reviewer';
  candidate.metadata.reviewedAt = '2026-07-13T01:00:00.000Z';
  return candidate;
}

describe('auditCoverage', () => {
  it('returns an explicit non-claiming report when no cases are published', () => {
    const report = auditCoverage([createMinimalValidCase()]);

    expect(report).toMatchObject({
      empty: true,
      publishedCases: 0,
      passed: true,
      crossDomain: { eligible: 0, qualifying: 0, ratio: null },
    });
    expect(report.gaps.map(({ code }) => code)).toContain('no_published_cases');
  });

  it('rejects deprecated cases leaked into an index', () => {
    const deprecated = createMinimalValidCase();
    deprecated.status = 'deprecated';

    const report = auditCoverage([deprecated], [deprecated.id]);

    expect(report.passed).toBe(false);
    expect(report.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'deprecated_in_index' }),
      ]),
    );
  });

  it('reports intermediate/advanced cross-domain coverage below 40%', () => {
    const cases = [
      publishedCase('case-a', ['one', 'two', 'three']),
      publishedCase('case-b', ['one']),
      publishedCase('case-c', ['one']),
      publishedCase('case-d', ['one'], 'advanced'),
      publishedCase('case-e', ['one'], 'advanced'),
    ];

    const report = auditCoverage(cases);

    expect(report.crossDomain).toMatchObject({
      eligible: 5,
      qualifying: 1,
      ratio: 0.2,
      passes: false,
    });
    expect(report.gaps.map(({ code }) => code)).toContain(
      'insufficient_cross_domain_ratio',
    );
  });

  it('does not count repeated copies of one domain as cross-domain', () => {
    const report = auditCoverage([
      publishedCase('case-a', ['one', 'one', 'one']),
    ]);

    expect(report.crossDomain).toMatchObject({
      eligible: 1,
      qualifying: 0,
      ratio: 0,
      passes: false,
    });
  });

  it('accepts a 40% cross-domain ratio and reports stable counts', () => {
    const cases = [
      publishedCase('case-a', ['one', 'two', 'three']),
      publishedCase('case-b', ['one', 'two', 'three'], 'advanced'),
      publishedCase('case-c', ['one']),
      publishedCase('case-d', ['one'], 'advanced'),
      publishedCase('case-e', ['one'], 'advanced'),
    ];

    const report = auditCoverage(cases);

    expect(report.passed).toBe(true);
    expect(report.crossDomain).toMatchObject({ ratio: 0.4, passes: true });
    expect(report.counts).toMatchObject({
      domains: { one: 5, three: 2, two: 2 },
      levels: { advanced: 3, intermediate: 2 },
      statuses: { published: 5 },
      criticalErrors: { 'unsupported-action': 5 },
    });
  });
});
