import { describe, expect, it, vi } from 'vitest';

import { emitJsonReport, resolveProjectPath } from './files';

describe('project path safety', () => {
  it('resolves project-local paths and rejects traversal outside the root', () => {
    expect(resolveProjectPath('/project', 'content/cases')).toBe(
      '/project/content/cases',
    );
    expect(() => resolveProjectPath('/project', '../personal')).toThrow(
      'outside the project root',
    );
    expect(() => resolveProjectPath('/project', '/tmp/report.json')).toThrow(
      'outside the project root',
    );
  });
});

describe('emitJsonReport', () => {
  it('returns deterministic JSON without writing during dry-run', () => {
    const write = vi.fn();

    const result = emitJsonReport(
      { z: 1 },
      { output: '/project/report.json', dryRun: true },
      { write },
    );

    expect(result).toBe('{\n  "z": 1\n}\n');
    expect(write).not.toHaveBeenCalled();
  });
});
