import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { resolveSafeProjectPath } from './files';
import type { ContentTextSource } from './validate-content';

function discoverCatalogFiles(input: string): string[] {
  if (statSync(input).isFile()) {
    return input.endsWith('.json') ? [input] : [];
  }
  if (!statSync(input).isDirectory()) return [];

  return readdirSync(input, { withFileTypes: true })
    .flatMap((entry): string[] => {
      const child = resolve(input, entry.name);
      if (entry.isDirectory()) return discoverCatalogFiles(child);
      return entry.isFile() && entry.name === 'catalog.json' ? [child] : [];
    })
    .sort();
}

/**
 * A directory input discovers only release `catalog.json` files. A direct
 * JSON file remains available for bounded validation and review workflows.
 */
export function readSkillCatalogSources(
  root: string,
  input: string,
  options: { limit?: number } = {},
): ContentTextSource[] {
  const inputPath = resolveSafeProjectPath(root, input);
  if (!existsSync(inputPath)) {
    throw new Error(`Input path does not exist: ${inputPath}`);
  }
  const discoveredFiles = discoverCatalogFiles(inputPath);
  const files =
    options.limit === undefined
      ? discoveredFiles
      : discoveredFiles.slice(0, options.limit);
  return files.map((file) => ({
    file: relative(root, file).split(sep).join('/'),
    text: readFileSync(file, 'utf8'),
  }));
}
