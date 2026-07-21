/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const globalCss = readFileSync(
  resolve(process.cwd(), 'src/styles/global.css'),
  'utf8',
);

describe('surface depth CSS contract', () => {
  it('visibly separates the Foundation reading surface from its next action', () => {
    expect(globalCss).toMatch(
      /\.foundation-detail-layout \.foundation-reading\s*\{[^}]*box-shadow:\s*var\(--shadow-float\)[^}]*transform:\s*translateY\(-0\.25rem\)/s,
    );
    expect(globalCss).toMatch(
      /\.journey-next-step\s*\{[^}]*box-shadow:\s*var\(--shadow-float-front\)[^}]*transform:\s*translateY\(-0\.5rem\)/s,
    );
    expect(globalCss).toMatch(
      /\.journey-next-step:is\(:hover,\s*:focus-within\)\s*\{[^}]*transform:\s*translateY\(-0\.75rem\)/s,
    );
  });

  it('uses the same foreground depth language in the first-loop preview', () => {
    expect(globalCss).toMatch(
      /\.first-loop-preview__result\s*\{[^}]*box-shadow:\s*var\(--shadow-float-front\)[^}]*transform:\s*translateY\(-0\.75rem\)/s,
    );
    expect(globalCss).toMatch(
      /\.first-loop-preview__workflow\s*\{[^}]*box-shadow:\s*var\(--shadow-float-front\)[^}]*transform:\s*translateY\(-0\.375rem\)/s,
    );
  });

  it('turns the active Dashboard into an atmospheric three-depth workspace', () => {
    expect(globalCss).toMatch(
      /\.dashboard-command-center\[data-dashboard-mode='active'\]\s*\{[^}]*isolation:\s*isolate[^}]*background:/s,
    );
    expect(globalCss).toMatch(
      /\.dashboard-command-center\[data-dashboard-mode='active'\] \.growth-card\s*\{[^}]*box-shadow:\s*var\(--shadow-card\)/s,
    );
    expect(globalCss).toMatch(
      /\.dashboard-command-center\[data-dashboard-mode='active'\] \.capability-map\s*\{[^}]*z-index:\s*3[^}]*box-shadow:\s*var\(--shadow-float-front\)[^}]*transform:\s*translateY\(-0\.375rem\)/s,
    );
    expect(globalCss).toMatch(
      /\.dashboard-command-center\[data-dashboard-mode='active'\]\s*:is\(\s*\.growth-mission,\s*\.challenge-card,\s*\.evidence-timeline\s*\)\s*\{[^}]*z-index:\s*4[^}]*box-shadow:\s*var\(--shadow-float-front\)/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.dashboard-command-center\[data-dashboard-mode='active'\]\s*:is\(\s*\.growth-mission,\s*\.capability-map,\s*\.challenge-card,\s*\.evidence-timeline\s*\)\s*\{[^}]*margin:\s*0[^}]*transform:\s*none/s,
    );
  });
});
