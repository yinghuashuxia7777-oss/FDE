import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const globalCss = readFileSync(
  resolve(process.cwd(), 'src/styles/global.css'),
  'utf8',
);

describe('training workspace styles', () => {
  it('uses the authored 26/40/34 desktop grid with a sticky decision panel', () => {
    expect(globalCss).toMatch(
      /\.training-workspace--desktop\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*26fr\)\s+minmax\(0,\s*40fr\)\s+minmax\(0,\s*34fr\)/s,
    );
    expect(globalCss).toMatch(
      /\.training-workspace__decision\s*\{[^}]*position:\s*sticky[^}]*top:/s,
    );
    expect(globalCss).toMatch(
      /\.training-workspace__evidence\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s,
    );
  });

  it('keeps decision controls operable under narrow and 200% text layouts', () => {
    expect(globalCss).toMatch(
      /\.training-workspace\s*>\s*\*\s*\{[^}]*min-width:\s*0/s,
    );
    expect(globalCss).toMatch(
      /\.question-option\s*\{[^}]*min-height:\s*var\(--target-min\)[^}]*overflow-wrap:\s*anywhere/s,
    );
    expect(globalCss).toMatch(/\.decision-controls\s*\{[^}]*min-width:\s*0/s);
  });
});
