/// <reference types="node" />

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

import { enUS } from './en-US';
import { zhCN } from './zh-CN';

const zhDictionary: Record<string, string> = zhCN;

function productionTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionTsxFiles(path);
    return entry.isFile() &&
      path.endsWith('.tsx') &&
      !path.endsWith('.test.tsx')
      ? [path]
      : [];
  });
}

const sourceFiles = ['app', 'components', 'pages'].flatMap((directory) =>
  productionTsxFiles(resolve(process.cwd(), 'src', directory)),
);

function renderedStringLiterals(expression: ts.Expression): string[] {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return [expression.text];
  }
  if (ts.isParenthesizedExpression(expression)) {
    return renderedStringLiterals(expression.expression);
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...renderedStringLiterals(expression.whenTrue),
      ...renderedStringLiterals(expression.whenFalse),
    ];
  }
  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return [
        ...renderedStringLiterals(expression.left),
        ...renderedStringLiterals(expression.right),
      ];
    }
    if (
      expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      return renderedStringLiterals(expression.right);
    }
  }
  if (ts.isTemplateExpression(expression)) {
    return [
      expression.head.text,
      ...expression.templateSpans.map(({ literal }) => literal.text),
    ];
  }
  return [];
}

describe('UI translation coverage', () => {
  it('keeps the Simplified Chinese and English dictionaries in parity', () => {
    expect(Object.keys(enUS).sort()).toEqual(Object.keys(zhCN).sort());
    expect(Object.values(zhCN).every((value) => value.trim() !== '')).toBe(
      true,
    );
    expect(Object.values(enUS).every((value) => value.trim() !== '')).toBe(
      true,
    );
  });

  it('defines every literal translation key used by production TSX', () => {
    const missing = new Set<string>();
    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
        const key = match[1];
        if (key !== undefined && !(key in zhCN)) missing.add(key);
      }
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('defines translation keys stored in dynamic key registries', () => {
    const missing = new Set<string>();
    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const inspect = (node: ts.Node) => {
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text.toLowerCase().endsWith('keys') &&
          node.initializer !== undefined
        ) {
          let initializer: ts.Expression = node.initializer;
          while (
            ts.isAsExpression(initializer) ||
            ts.isParenthesizedExpression(initializer) ||
            ts.isSatisfiesExpression(initializer)
          ) {
            initializer = initializer.expression;
          }
          if (ts.isObjectLiteralExpression(initializer)) {
            for (const property of initializer.properties) {
              if (
                ts.isPropertyAssignment(property) &&
                (ts.isStringLiteral(property.initializer) ||
                  ts.isNoSubstitutionTemplateLiteral(property.initializer)) &&
                !(property.initializer.text in zhCN)
              ) {
                missing.add(property.initializer.text);
              }
            }
          }
        }
        if (
          ts.isPropertyAssignment(node) &&
          node.name.getText(sourceFile).endsWith('Key') &&
          (ts.isStringLiteral(node.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(node.initializer)) &&
          !(node.initializer.text in zhCN)
        ) {
          missing.add(node.initializer.text);
        }
        ts.forEachChild(node, inspect);
      };
      inspect(sourceFile);
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('keeps Chinese copy out of production TSX files', () => {
    const filesWithChinese = sourceFiles
      .filter((file) => /[\u3400-\u9fff]/u.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(`${process.cwd()}/`, ''));
    expect(filesWithChinese).toEqual([]);
  });

  it('keeps direct visible JSX copy behind the translation boundary', () => {
    const violations: string[] = [];
    const allowedBrandCopy = new Set(['Arena', 'FDE', 'FDE Arena']);
    const visibleStringProps = new Set([
      'alt',
      'aria-label',
      'aria-description',
      'aria-valuetext',
      'description',
      'eyebrow',
      'label',
      'message',
      'placeholder',
      'summary',
      'title',
    ]);

    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const inspect = (node: ts.Node) => {
        let copies: string[] = [];
        if (ts.isJsxText(node)) {
          copies = [node.getText(sourceFile)];
        } else if (
          ts.isJsxAttribute(node) &&
          visibleStringProps.has(node.name.getText(sourceFile)) &&
          node.initializer !== undefined
        ) {
          if (ts.isStringLiteral(node.initializer)) {
            copies = [node.initializer.text];
          } else if (
            ts.isJsxExpression(node.initializer) &&
            node.initializer.expression !== undefined
          ) {
            copies = renderedStringLiterals(node.initializer.expression);
          }
        } else if (
          ts.isJsxExpression(node) &&
          !ts.isJsxAttribute(node.parent) &&
          node.expression !== undefined
        ) {
          copies = renderedStringLiterals(node.expression);
        }
        for (const rawCopy of copies) {
          const copy = rawCopy.replace(/\s+/g, ' ').trim();
          if (
            /[A-Za-z\u3400-\u9fff]/u.test(copy) &&
            !allowedBrandCopy.has(copy)
          ) {
            violations.push(
              `${file.replace(`${process.cwd()}/`, '')}: ${copy}`,
            );
          }
        }
        ts.forEachChild(node, inspect);
      };
      inspect(sourceFile);
    }
    expect(violations).toEqual([]);
  });

  it('does not leak Chinese copy into English UI translations', () => {
    const leakingKeys = Object.entries(enUS)
      .filter(([, value]) => /[\u3400-\u9fff]/u.test(value))
      .map(([key]) => key);
    expect(leakingKeys).toEqual([]);
  });

  it('preserves the approved English technical vocabulary in Chinese copy', () => {
    const protectedTerms = [
      'FDE',
      'Agent',
      'RAG',
      'LLM',
      'Prompt',
      'Embedding',
      'Vector Database',
      'Tool Calling',
      'Eval',
      'Guardrails',
      'MCP',
      'Memory',
      'Mastery',
      'API',
      'HTTP',
      'JSON',
      'Docker',
      'Kubernetes',
      'Git',
      'SQL',
      'CI/CD',
      'SDK',
      'OAuth',
      'Webhook',
      'Token',
    ];
    const translatedTerms: string[] = [];
    for (const [key, english] of Object.entries(enUS)) {
      for (const term of protectedTerms) {
        if (english.includes(term) && !zhDictionary[key]?.includes(term)) {
          translatedTerms.push(`${key}: ${term}`);
        }
      }
    }
    expect(translatedTerms).toEqual([]);
  });
});
