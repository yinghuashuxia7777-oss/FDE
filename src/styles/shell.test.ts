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

function cssBlockAfter(source: string, marker: string): string | undefined {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }

  const openingBrace = source.indexOf('{', markerIndex + marker.length);
  if (openingBrace < 0) {
    return undefined;
  }

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openingBrace + 1, index);
      }
    }
  }

  return undefined;
}

function requiredCssBlock(source: string, marker: string): string {
  const block = cssBlockAfter(source, marker);
  if (block === undefined) {
    throw new Error(`Missing CSS block: ${marker}`);
  }
  return block;
}

describe('responsive shell CSS contract', () => {
  it('uses the approved dark professional training palette', () => {
    for (const color of [
      '#07090D',
      '#080B12',
      '#10141D',
      '#121826',
      '#F7F9FC',
      '#9EA8B7',
      '#3B82F6',
      '#6D5CFF',
    ]) {
      expect(tokensCss.toUpperCase()).toContain(color);
    }
    expect(tokensCss).not.toMatch(/\bInter\b/);
    expect(tokensCss).toContain('ui-monospace');
  });

  it('defines the Growth OS header and responsive capability command center', () => {
    expect(globalCss).toMatch(/\.growth-os-header\s*\{[^}]*display:\s*grid/s);
    expect(globalCss).toMatch(
      /\.growth-os-navigation\s*\{[^}]*display:\s*flex/s,
    );
    expect(globalCss).toMatch(
      /\.dashboard-command-center\s*\{[^}]*display:\s*grid/s,
    );
    expect(globalCss).toMatch(
      /\.dashboard-metric-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
    );
    expect(globalCss).toMatch(/\.growth-os-grid\s*\{[^}]*display:\s*grid/s);
    expect(globalCss).toMatch(
      /@media\s*\(min-width:\s*90rem\)[\s\S]*\.growth-os-grid\s*\{[^}]*grid-template-columns:\s*minmax\(17rem,\s*0\.78fr\)\s+minmax\(32rem,\s*1\.65fr\)\s+minmax\(\s*19rem,\s*0\.88fr\s*\)/,
    );
    expect(globalCss).toMatch(
      /\.capability-orbit\s*\{[^}]*position:\s*relative/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\s*\{[^}]*position:\s*absolute/s,
    );
    expect(globalCss).toMatch(
      /\.capability-map__badge\s*\{[^}]*background:\s*var\(--color-accent-soft\)[^}]*border-radius:\s*var\(--radius-round\)/s,
    );
    const notStartedRule =
      /\.capability-node\[data-mastery='not-started'\]\s*\{([^}]*)\}/s.exec(
        globalCss,
      )?.[1];
    expect(notStartedRule).toContain(
      '--capability-tone: var(--color-text-muted);',
    );
    expect(notStartedRule).toContain('--capability-node-opacity: 0.7;');
    expect(globalCss).toMatch(
      /\.capability-node\[data-mastery='learning'\]\s*\{[^}]*--capability-tone:\s*var\(--color-warning\)/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\[data-mastery='competent'\]\s*\{[^}]*--capability-tone:\s*var\(--color-accent\)/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\[data-mastery='proficient'\]\s*\{[^}]*--capability-tone:\s*var\(--color-success\)/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.capability-orbit__core\s*\{[^}]*display:\s*grid[^}]*grid-column:\s*1\s*\/\s*-1[^}]*transform:\s*none/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.capability-orbit__core-content\s*\{[^}]*grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)[^}]*justify-items:\s*start/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.capability-node__surface\s*\{[^}]*grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)[^}]*justify-items:\s*start/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*30rem\)[\s\S]*\.capability-orbit\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    );
  });

  it('renders the Capability Map as a responsive visual constellation', () => {
    expect(globalCss).toMatch(
      /\.capability-orbit__ring--three\s*\{[^}]*width:/s,
    );
    expect(globalCss).toMatch(
      /\.capability-orbit__core\s*\{[^}]*isolation:\s*isolate[^}]*radial-gradient/s,
    );
    expect(globalCss).toMatch(
      /\.capability-orbit__core::before\s*\{[^}]*border-radius:\s*50%[^}]*box-shadow:/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\s*\{[^}]*display:\s*grid[^}]*justify-items:\s*center[^}]*text-align:\s*center/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node::after\s*\{[^}]*linear-gradient/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node__glyph\s*\{[^}]*position:\s*relative[^}]*box-shadow:/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node__glyph::before\s*\{[^}]*border:[^}]*var\(--capability-tone\)/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node__copy\s*\{[^}]*display:\s*grid[^}]*justify-items:\s*center[^}]*text-align:\s*center/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.capability-node,\s*\.capability-node\[data-orbit-index\]\s*\{[^}]*grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)[^}]*text-align:\s*left/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.capability-node__copy\s*\{[^}]*justify-items:\s*start[^}]*text-align:\s*left/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)[\s\S]*\.capability-orbit__core::before\s*\{[^}]*animation:\s*capability-core-breathe/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)[\s\S]*\.capability-node\s*\{[^}]*animation:\s*capability-node-reveal/s,
    );
  });

  it('anchors constellation connectors to centered glyphs and protects compact layouts', () => {
    expect(globalCss).toMatch(
      /\.capability-orbit\s*\{[^}]*width:\s*min\(100%,\s*44rem\)[^}]*justify-self:\s*center/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\s*\{[^}]*z-index:\s*2[^}]*width:\s*10\.5rem/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node::after\s*\{[^}]*top:\s*calc\(var\(--space-2\)\s*\+\s*1\.625rem\)[^}]*width:\s*clamp\(6\.5rem,\s*12vw,\s*9rem\)/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\[data-orbit-index='1'\]::after\s*\{[^}]*right:\s*50%/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\[data-orbit-index='0'\]::after\s*\{[^}]*top:\s*100%[^}]*left:\s*50%/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\[data-orbit-index='5'\]::after\s*\{[^}]*left:\s*50%/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node\[data-orbit-index='0'\]::after,[\s\S]*\.capability-node\[data-orbit-index='6'\]::after\s*\{[^}]*linear-gradient\(\s*90deg,\s*color-mix[^}]*transparent/s,
    );
    expect(globalCss).toMatch(
      /\.capability-node small\s*\{[^}]*max-width:\s*100%[^}]*font-size:\s*var\(--font-size-1\)/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*30rem\)[\s\S]*\.capability-map\s*>\s*\.growth-card__heading\s*\{[^}]*flex-direction:\s*column/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*30rem\)[\s\S]*\.capability-map__actions\s*\{[^}]*width:\s*100%[^}]*justify-content:\s*space-between/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(prefers-reduced-transparency:\s*reduce\)[\s\S]*\.capability-orbit::before\s*\{[^}]*display:\s*none/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(prefers-reduced-transparency:\s*reduce\)[\s\S]*\.capability-orbit__core,[\s\S]*\.capability-node__glyph\s*\{[^}]*box-shadow:\s*none/s,
    );
  });

  it('coordinates premium compositor-only Capability Map and Mentor Orb motion', () => {
    const motion = requiredCssBlock(
      globalCss,
      '@media (prefers-reduced-motion: no-preference)',
    );
    expect(motion).not.toContain('will-change:');
    const atmosphere = requiredCssBlock(motion, '.capability-orbit::before');
    const core = requiredCssBlock(motion, '.capability-orbit__core');
    const coreHalo = requiredCssBlock(
      motion,
      '.capability-orbit__core::before',
    );
    const coreHighlight = requiredCssBlock(
      motion,
      '.capability-orbit__core::after',
    );
    const nodes = requiredCssBlock(motion, '.capability-node');
    const connectors = requiredCssBlock(motion, '.capability-node::after');
    const statusGlow = requiredCssBlock(
      motion,
      '.capability-node__glyph::before',
    );
    const secondRing = requiredCssBlock(motion, '.capability-orbit__ring--two');
    const mentorOrb = requiredCssBlock(motion, '.mentor-card__orb');
    const mentorOuter = requiredCssBlock(motion, '.mentor-card__orb::before');
    const mentorInner = requiredCssBlock(motion, '.mentor-card__orb::after');
    const mentorParticles = requiredCssBlock(motion, '.mentor-card__orb span');

    expect(atmosphere).toMatch(
      /animation:\s*capability-atmosphere-enter\s+600ms[^;]*0ms[^;]*both/,
    );
    expect(atmosphere).not.toContain('will-change:');
    expect(core).toMatch(
      /animation:\s*capability-core-enter\s+520ms[^;]*300ms[^;]*both/,
    );
    expect(coreHalo).toMatch(/1200ms\s+infinite\s+backwards/);
    expect(coreHighlight).toMatch(/1300ms\s+infinite\s+backwards/);
    expect(nodes).toContain('--capability-stagger: 0ms;');
    expect(nodes).toMatch(
      /animation-delay:\s*calc\(600ms\s*\+\s*var\(--capability-stagger\)\)/,
    );
    expect(nodes).not.toContain('will-change:');
    expect(connectors).toContain('capability-connector-enter');
    expect(connectors).toContain('capability-connector-flow');
    expect(connectors).toMatch(
      /animation-delay:[^;]*calc\(900ms\s*\+\s*var\(--capability-stagger\)\)/,
    );
    expect(statusGlow).toMatch(
      /animation:\s*capability-status-glow\s+5\.4s[^;]*1200ms[^;]*infinite\s+backwards/,
    );
    expect(secondRing).toContain('capability-orbit-spin');
    expect(motion).not.toMatch(
      /\.capability-orbit__ring--three\s*\{[^}]*capability-orbit-spin/s,
    );
    expect(mentorOrb).toContain('mentor-orb-breathe');
    expect(mentorOuter).toMatch(/mentor-track-outer\s+60s/);
    expect(mentorInner).toMatch(/mentor-track-inner\s+40s/);
    expect(mentorParticles).toContain('mentor-particle-orbit');
    expect(requiredCssBlock(globalCss, '.mentor-card__orb span')).toContain(
      'opacity: 0.72;',
    );

    const connectorFlow = requiredCssBlock(
      motion,
      '@keyframes capability-connector-flow',
    );
    expect(connectorFlow).toMatch(
      /0%,\s*100%\s*\{[^}]*opacity:\s*0\.82[^}]*scaleX\(1\)/s,
    );

    const keyframeNames = Array.from(
      motion.matchAll(/@keyframes\s+([a-z][a-z0-9-]*)/g),
      (match) => match[1],
    ).filter(
      (name): name is string =>
        name !== undefined &&
        (name.startsWith('capability-') || name.startsWith('mentor-')),
    );
    expect(keyframeNames).toEqual(
      expect.arrayContaining([
        'capability-atmosphere-enter',
        'capability-core-enter',
        'capability-node-reveal',
        'capability-connector-enter',
        'capability-connector-flow',
        'capability-status-glow',
        'mentor-orb-breathe',
        'mentor-track-outer',
        'mentor-track-inner',
        'mentor-particle-orbit',
      ]),
    );

    for (const name of keyframeNames) {
      const keyframes = requiredCssBlock(motion, `@keyframes ${name}`);
      const properties = Array.from(
        keyframes.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:/gm),
        (match) => match[1],
      );
      expect(
        properties.length,
        `${name} should animate a property`,
      ).toBeGreaterThan(0);
      expect(
        properties.every(
          (property) => property === 'opacity' || property === 'transform',
        ),
        `${name} must animate only opacity and transform`,
      ).toBe(true);
    }
  });

  it('adds restrained mastery-state and transient evolution feedback', () => {
    const motion = requiredCssBlock(
      globalCss,
      '@media (prefers-reduced-motion: no-preference)',
    );
    const nodeEvolution = requiredCssBlock(
      motion,
      ".capability-node[data-evolving='true'] .capability-node__surface",
    );
    const nodeHalo = requiredCssBlock(
      motion,
      ".capability-node[data-evolving='true']::before",
    );
    const coreEvolution = requiredCssBlock(
      motion,
      '.capability-orbit__core-feedback',
    );

    expect(nodeEvolution).toContain('capability-node-evolution');
    expect(nodeHalo).toContain('capability-evolution-halo');
    expect(coreEvolution).toContain('capability-core-evolution');
    expect(
      requiredCssBlock(motion, ".capability-node[data-mastery='not-started']"),
    ).toContain('animation: none;');
    expect(
      requiredCssBlock(motion, ".capability-node[data-mastery='learning']"),
    ).toContain('animation-duration: 4.8s;');

    const reducedMotion = requiredCssBlock(
      globalCss,
      '@media (prefers-reduced-motion: reduce)',
    );
    expect(reducedMotion).toContain('.capability-orbit__core-feedback');
    expect(reducedMotion).toContain('.capability-node__surface');
    expect(reducedMotion).toContain('.capability-node::before');
  });

  it('stops continuous motion for mobile and reduced-motion users', () => {
    const mobileMotion = requiredCssBlock(
      globalCss,
      '@media (max-width: 47.999rem) and',
    );
    expect(
      requiredCssBlock(mobileMotion, '.capability-orbit__core::before'),
    ).toContain('animation: none;');
    expect(
      requiredCssBlock(mobileMotion, '.capability-node[data-orbit-index]'),
    ).toContain('--capability-stagger: 0ms;');
    expect(mobileMotion).toContain(
      ".capability-node[data-evolving='true']::before",
    );
    expect(mobileMotion).toContain(
      ".capability-orbit__core[data-evolving='true']",
    );
    expect(
      requiredCssBlock(mobileMotion, '.capability-orbit__core::before'),
    ).toContain('animation: none;');
    expect(
      requiredCssBlock(
        mobileMotion,
        ".capability-node[data-evolving='true']::before",
      ),
    ).toContain('animation: none;');
    expect(mobileMotion).toContain('.capability-orbit__core-feedback');
    expect(requiredCssBlock(mobileMotion, '.mentor-card__orb')).toContain(
      'mentor-orb-enter',
    );
    expect(
      requiredCssBlock(mobileMotion, '.mentor-card__orb::before'),
    ).toContain('animation: none;');

    const reducedMotion = requiredCssBlock(
      globalCss,
      '@media (prefers-reduced-motion: reduce)',
    );
    expect(reducedMotion).toContain('.capability-orbit__core::before');
    expect(reducedMotion).toContain('.capability-node::after');
    expect(reducedMotion).toContain('.mentor-card__orb::before');
    expect(reducedMotion).toContain('.mentor-card__orb span');
    expect(reducedMotion).toContain('animation: none !important;');
    expect(reducedMotion).not.toContain('transform: none');
  });

  it('defines a responsive capability proof layout with a semantic readiness dial', () => {
    expect(globalCss).toMatch(
      /\.capability-profile__top-grid\s*\{[^}]*display:\s*grid/s,
    );
    expect(globalCss).toMatch(
      /\.capability-profile__skill-grid\s*\{[^}]*display:\s*grid/s,
    );
    expect(globalCss).toMatch(
      /\.capability-profile__readiness-meter\s*\{[^}]*conic-gradient/s,
    );
    expect(globalCss).toMatch(
      /@media\s*\(min-width:\s*64rem\)[\s\S]*\.capability-profile__top-grid\s*\{[^}]*grid-template-columns:/,
    );
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.capability-profile__skill-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
  });

  it('prevents page overflow while confining evidence scrolling', () => {
    expect(globalCss).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/s);
    expect(globalCss).toMatch(/\.evidence-scroll\s*\{[^}]*overflow-x:\s*auto/s);
    expect(globalCss).toMatch(/\.evidence-scroll\s*\{[^}]*max-width:\s*100%/s);
    expect(globalCss).toMatch(
      /\.growth-readiness\s*>\s*progress\.sr-only\s*\{[^}]*width:\s*1px[^}]*height:\s*1px/s,
    );
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
