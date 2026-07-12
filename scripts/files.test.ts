import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  emitJsonReport,
  PROJECT_ROOT,
  readContentSources,
  resolveProjectPath,
  resolveSafeProjectPath,
} from './files';

const temporaryDirectories: string[] = [];

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(resolve(PROJECT_ROOT, prefix));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

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

  it('rejects real symlink escapes for input and output paths', () => {
    const outer = temporaryDirectory('.tmp-path-safety-');
    const projectRoot = resolve(outer, 'project');
    const outsideRoot = resolve(outer, 'outside-project-root');
    mkdirSync(projectRoot);
    mkdirSync(outsideRoot);
    writeFileSync(resolve(outsideRoot, 'case.json'), '{}', 'utf8');
    writeFileSync(resolve(outsideRoot, 'existing.ts'), 'sentinel', 'utf8');

    symlinkSync(outsideRoot, resolve(projectRoot, 'input-link'), 'dir');
    symlinkSync(
      resolve(outsideRoot, 'existing.ts'),
      resolve(projectRoot, 'existing-output.ts'),
    );
    symlinkSync(outsideRoot, resolve(projectRoot, 'output-directory'), 'dir');

    expect(() => readContentSources(projectRoot, 'input-link')).toThrow(
      'outside the project root',
    );
    expect(() =>
      resolveSafeProjectPath(projectRoot, 'existing-output.ts'),
    ).toThrow('outside the project root');
    expect(() =>
      resolveSafeProjectPath(projectRoot, 'output-directory/new/case-index.ts'),
    ).toThrow('outside the project root');
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

describe('readContentSources', () => {
  it('applies limit after stable discovery and before reading JSON files', () => {
    const directory = temporaryDirectory('.tmp-content-limit-');
    writeFileSync(resolve(directory, 'a.json'), '{}', 'utf8');
    writeFileSync(resolve(directory, 'z.json'), '{', 'utf8');
    const read = vi.fn((file: string) => {
      if (basename(file) === 'z.json') {
        throw new Error('second file must not be read');
      }
      return '{}';
    });

    const sources = readContentSources(PROJECT_ROOT, directory, {
      limit: 1,
      read,
    });

    expect(sources.map(({ file }) => basename(file))).toEqual(['a.json']);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
