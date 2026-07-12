import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ContentTextSource } from './validate-content';

export const PROJECT_ROOT = resolve(import.meta.dirname, '..');

function isInside(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === '' ||
    (!isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`))
  );
}

export function resolveProjectPath(root: string, candidate: string): string {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(resolvedRoot, candidate);
  if (!isInside(resolvedRoot, resolvedCandidate)) {
    throw new Error(`Path is outside the project root: ${candidate}`);
  }
  return resolvedCandidate;
}

export function resolveSafeProjectPath(
  root: string,
  candidate: string,
): string {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolveProjectPath(resolvedRoot, candidate);
  let existingAncestor = resolvedCandidate;
  while (!existsSync(existingAncestor)) {
    const parent = dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  const realRoot = realpathSync(resolvedRoot);
  const realAncestor = realpathSync(existingAncestor);
  if (!isInside(realRoot, realAncestor)) {
    throw new Error(`Resolved path is outside the project root: ${candidate}`);
  }
  return resolvedCandidate;
}

function discoverJsonFiles(input: string): string[] {
  if (!existsSync(input)) {
    throw new Error(`Input path does not exist: ${input}`);
  }
  if (statSync(input).isFile()) {
    return input.endsWith('.json') ? [input] : [];
  }
  if (!statSync(input).isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(input, { withFileTypes: true })) {
    const child = resolve(input, entry.name);
    if (entry.isDirectory()) {
      files.push(...discoverJsonFiles(child));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(child);
    }
  }
  return files.sort();
}

export function readContentSources(
  root: string,
  input: string,
  options: {
    limit?: number;
    read?: (file: string) => string;
  } = {},
): ContentTextSource[] {
  const inputPath = resolveSafeProjectPath(root, input);
  const selectedFiles = discoverJsonFiles(inputPath).slice(0, options.limit);
  const read = options.read ?? ((file: string) => readFileSync(file, 'utf8'));
  return selectedFiles.map((file) => ({
    file: relative(resolve(root), file).split(sep).join('/'),
    text: read(file),
  }));
}

export interface ReportWriter {
  write(output: string, content: string): void;
}

export const nodeReportWriter: ReportWriter = {
  write: (output, content) => writeFileSync(output, content, 'utf8'),
};

export function emitJsonReport(
  report: unknown,
  options: { output?: string; dryRun: boolean },
  writer: ReportWriter = nodeReportWriter,
): string {
  const content = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output !== undefined && !options.dryRun) {
    writer.write(options.output, content);
  }
  return content;
}

export function isDirectRun(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return entry !== undefined && moduleUrl === pathToFileURL(entry).href;
}

export function printCliError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: { code: 'cli_error', message } })}\n`,
  );
  return 1;
}

export function writeCliReport(content: string, ok: boolean): void {
  (ok ? process.stdout : process.stderr).write(content);
}
