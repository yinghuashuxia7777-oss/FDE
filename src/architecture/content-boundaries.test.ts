import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const projectRoot = process.cwd();

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function productionTsxBelow(directory: string): string[] {
  return filesBelow(directory).filter(
    (file) =>
      extname(file) === '.tsx' &&
      !file.endsWith('.test.tsx') &&
      !file.endsWith('.stories.tsx'),
  );
}

describe('content architecture boundaries', () => {
  it('keeps pages behind application or repository contracts', () => {
    const forbiddenImport =
      /from\s+['"][^'"]*(?:content\/cases|generated\/content-index|storage\/|repositories\/indexeddb)[^'"]*['"]/;
    const violations = productionTsxBelow(join(projectRoot, 'src/pages'))
      .filter((file) => forbiddenImport.test(readFileSync(file, 'utf8')))
      .map((file) => relative(projectRoot, file));

    expect(violations).toEqual([]);
  });

  it('keeps question and evidence renderers independent of formal cases', () => {
    const rendererFiles = [
      ...productionTsxBelow(join(projectRoot, 'src/components/question')),
      ...productionTsxBelow(join(projectRoot, 'src/components/evidence')),
    ];
    const violations = rendererFiles
      .filter((file) =>
        /content\/cases|generated\/content-index/.test(
          readFileSync(file, 'utf8'),
        ),
      )
      .map((file) => relative(projectRoot, file));

    expect(violations).toEqual([]);
  });

  it('does not hardcode checked-in formal case IDs in production TSX', () => {
    const caseRoot = join(projectRoot, 'content/cases');
    const caseIds = filesBelow(caseRoot)
      .filter((file) => file.endsWith('.json'))
      .map((file) => JSON.parse(readFileSync(file, 'utf8')) as { id?: unknown })
      .flatMap(({ id }) => (typeof id === 'string' ? [id] : []));
    const tsxFiles = productionTsxBelow(join(projectRoot, 'src'));
    const violations = tsxFiles.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return caseIds
        .filter((caseId) => text.includes(caseId))
        .map((caseId) => `${relative(projectRoot, file)}: ${caseId}`);
    });

    expect(violations).toEqual([]);
  });
});
