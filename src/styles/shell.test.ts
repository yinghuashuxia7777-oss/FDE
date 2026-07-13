/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokensCss = readFileSync(
  resolve(process.cwd(), 'src/styles/tokens.css'),
  'utf8',
);
const globalCss = readFileSync(
  resolve(process.cwd(), 'src/styles/global.css'),
  'utf8',
);

describe('responsive shell CSS contract', () => {
  it('uses the frozen light and dark engineering palette', () => {
    for (const color of [
      '#F3F5F7',
      '#FFFFFF',
      '#17202B',
      '#176B87',
      '#0F141A',
      '#171E26',
      '#F1F5F8',
      '#5AB3CE',
    ]) {
      expect(tokensCss.toUpperCase()).toContain(color);
    }
    expect(tokensCss).not.toMatch(/\bInter\b/);
    expect(tokensCss).toContain('ui-monospace');
  });

  it('prevents page overflow while confining evidence scrolling', () => {
    expect(globalCss).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/s);
    expect(globalCss).toMatch(/\.evidence-scroll\s*\{[^}]*overflow-x:\s*auto/s);
    expect(globalCss).toMatch(/\.evidence-scroll\s*\{[^}]*max-width:\s*100%/s);
  });

  it('defines 44px targets, the 1024px adaptive boundary, and a 1500px cap', () => {
    expect(tokensCss).toMatch(/--target-min:\s*2\.75rem/);
    expect(globalCss).toContain('@media (min-width: 64rem)');
    expect(tokensCss).toMatch(/--content-max:\s*93\.75rem/);
    expect(globalCss).toMatch(/min-height:\s*var\(--target-min\)/);
  });

  it('keeps semantic badge text on the high-contrast surface', () => {
    const badgeRules = /\.status-badge\s*\{([^}]*)\}/.exec(globalCss)?.[1];
    expect(badgeRules).toContain('background: var(--color-surface);');
    expect(badgeRules).not.toContain('var(--color-surface-subtle)');
  });

  it('near-eliminates motion without exposing transform-hidden controls', () => {
    const reducedMotion =
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/.exec(
        globalCss,
      )?.[1];
    expect(reducedMotion).toContain('animation-duration: 0.01ms');
    expect(reducedMotion).toContain('transition-duration: 0.01ms');
    expect(reducedMotion).not.toContain('transform: none');
    expect(globalCss).toMatch(
      /\.skip-link\s*\{[^}]*transform:\s*translateY\(calc\(-100%/s,
    );
  });
});
