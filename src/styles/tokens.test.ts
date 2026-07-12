/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokensCss = readFileSync(
  resolve(process.cwd(), 'src/styles/tokens.css'),
  'utf8',
);

describe('theme tokens', () => {
  it('uses a dark color scheme when the system preference is dark', () => {
    const systemDarkDeclarations =
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme\]\),\s*:root\[data-theme=['"]system['"]\]\s*\{([^}]*)\}/.exec(
        tokensCss,
      )?.[1];

    expect(systemDarkDeclarations).toContain('color-scheme: dark;');
  });
});
