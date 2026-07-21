/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokensCss = readFileSync(
  resolve(process.cwd(), 'src/styles/tokens.css'),
  'utf8',
);
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('theme tokens', () => {
  it('locks the approved dark professional training palette', () => {
    const darkDeclarations =
      /:root\[data-theme=['"]dark['"]\]\s*\{([^}]*)\}/.exec(tokensCss)?.[1];

    expect(darkDeclarations).toContain('--canvas: #07090d;');
    expect(darkDeclarations).toContain('--surface: #10141d;');
    expect(darkDeclarations).toContain('--text: #f7f9fc;');
    expect(darkDeclarations).toContain('--accent: #3b82f6;');
    expect(darkDeclarations).toContain('--accent-violet: #6d5cff;');
    expect(tokensCss).toContain('--radius-hero: 1.5rem;');
    expect(tokensCss).toContain('--shadow-card:');
  });

  it('follows the operating-system theme before React mounts', () => {
    expect(indexHtml).toMatch(/<html[^>]*data-theme=["']system["']/);
  });

  it('uses a dark color scheme when the system preference is dark', () => {
    const systemDarkDeclarations =
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme\]\),\s*:root\[data-theme=['"]system['"]\]\s*\{([^}]*)\}/.exec(
        tokensCss,
      )?.[1];

    expect(systemDarkDeclarations).toContain('color-scheme: dark;');
  });
});
