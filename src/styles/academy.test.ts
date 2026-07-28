/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const academyCssPath = resolve(process.cwd(), 'src/styles/academy.css');
const academyCss = existsSync(academyCssPath)
  ? readFileSync(academyCssPath, 'utf8')
  : '';
const globalCss = readFileSync(
  resolve(process.cwd(), 'src/styles/global.css'),
  'utf8',
);
const mainSource = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
const academyPagesSource = readFileSync(
  resolve(process.cwd(), 'src/pages/academy/AcademyPages.tsx'),
  'utf8',
);

describe('AI Academy CSS contract', () => {
  it('defines the academy file, stage, topic, and radar surfaces', () => {
    expect(academyCss).toContain('.academy-hero');
    expect(academyCss).toContain('.academy-stage-grid');
    expect(academyCss).toContain('.academy-topic-layout');
    expect(academyCss).toContain('.academy-tool-radar');
    expect(academyCss).toContain('.bb-btn--academy');
  });

  it('keeps topic reading responsive and the directory native', () => {
    expect(academyCss).toContain('@media (max-width: 64rem)');
    expect(academyCss).toMatch(
      /\.academy-topic-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*2fr\)\s+minmax\(14rem,\s*0\.72fr\)/s,
    );
    expect(academyCss).toMatch(
      /@media\s*\(max-width:\s*64rem\)[\s\S]*\.academy-topic-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    );
    expect(academyCss).toContain('.academy-directory details');
    expect(academyPagesSource).toContain('className="academy-directory"');
    expect(academyPagesSource).toContain('<details open>');
    expect(academyPagesSource).toContain('<summary>');
  });

  it('gates radar and card motion behind the user motion preference', () => {
    expect(academyCss).toContain(
      '@media (prefers-reduced-motion: no-preference)',
    );
    expect(academyCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.academy-tool-radar::after[\s\S]*animation:\s*none/s,
    );
  });

  it('loads academy styles after tokens and the shared BLACK BOX layer', () => {
    expect(
      mainSource.indexOf("import './styles/academy.css';"),
    ).toBeGreaterThan(mainSource.indexOf("import './styles/global.css';"));
    expect(globalCss).toContain('.bb-hero');
    expect(globalCss).toContain('.bb-dossier');
    expect(globalCss).toContain('.bb-btn--primary');
  });
});
