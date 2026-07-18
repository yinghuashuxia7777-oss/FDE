import type { PracticeDefinition } from '../domain/practices/types';
import type { PracticeRuntimeRule } from '../application/practice';
import rulesJson from '../../content/practice-runtime/mvp/rules.json';

const modules = import.meta.glob<PracticeDefinition>(
  '../../content/practices/mvp/*.json',
  {
    eager: true,
    import: 'default',
  },
);

export const mvpPractices: readonly PracticeDefinition[] = Object.values(
  modules,
).sort((left, right) => left.id.localeCompare(right.id));

export const mvpPracticeRules: readonly PracticeRuntimeRule[] = rulesJson.rules;

export function findMvpPractice(
  practiceId: string,
): PracticeDefinition | undefined {
  return mvpPractices.find(({ id }) => id === practiceId);
}

export function findMvpPracticeRule(
  practiceId: string,
): PracticeRuntimeRule | undefined {
  return mvpPracticeRules.find((rule) => rule.practiceId === practiceId);
}
