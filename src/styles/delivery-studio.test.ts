/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const deliveryCssPath = resolve(
  process.cwd(),
  'src/styles/delivery-studio.css',
);
const deliveryCss = existsSync(deliveryCssPath)
  ? readFileSync(deliveryCssPath, 'utf8')
  : '';
const mainSource = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');

describe('FDE Delivery Studio CSS contract', () => {
  it('uses the BLACK BOX token layer for Studio surfaces', () => {
    expect(deliveryCss).toContain('.delivery-studio');
    expect(deliveryCss).toContain('var(--color-surface');
    expect(deliveryCss).toContain('var(--color-accent');
  });

  it('keeps the stage rail responsive and motion safe', () => {
    expect(deliveryCss).toContain('.delivery-stage-rail');
    expect(deliveryCss).toMatch(
      /@media\s*\(max-width:\s*47\.999rem\)[\s\S]*\.delivery-stage-rail\s+ol\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(10rem,\s*1fr\)\)/s,
    );
    expect(deliveryCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.delivery-page\s+\*\s*\{[^}]*scroll-behavior:\s*auto/s,
    );
  });

  it('loads Delivery Studio styles after the shared BLACK BOX layer', () => {
    expect(
      mainSource.indexOf("import './styles/delivery-studio.css';"),
    ).toBeGreaterThan(mainSource.indexOf("import './styles/global.css';"));
  });
});
