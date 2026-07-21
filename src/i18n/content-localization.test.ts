import { bundledConceptSource } from '../content/concept-source';
import { bundledFoundationSource } from '../content/foundation-source';
import { contentIndex } from '../generated/content-index';
import {
  localizeCase,
  localizeConcepts,
  localizeFoundations,
} from './content-localization';

const HAN_PATTERN = /[\u3400-\u9fff]/u;

describe('English content projection', () => {
  it('removes Chinese text from every bundled Foundation and Concept', async () => {
    const [foundations, concepts] = await Promise.all([
      bundledFoundationSource.loadAll(),
      bundledConceptSource.loadAll(),
    ]);

    const localizedFoundations = localizeFoundations(foundations, 'en-US');
    const localizedConcepts = localizeConcepts(concepts, 'en-US');

    expect(JSON.stringify(localizedFoundations)).not.toMatch(HAN_PATTERN);
    expect(JSON.stringify(localizedConcepts)).not.toMatch(HAN_PATTERN);
    expect(localizedFoundations.map(({ id }) => id)).toEqual(
      foundations.map(({ id }) => id),
    );
    expect(localizedConcepts.map(({ id }) => id)).toEqual(
      concepts.map(({ id }) => id),
    );
  });

  it('removes Chinese text from every bundled Case without changing identity', async () => {
    const cases = await Promise.all(
      contentIndex.map(async ({ load }) => (await load()).default),
    );

    for (const item of cases) {
      const localized = localizeCase(item, 'en-US');
      expect(JSON.stringify(localized), item.id).not.toMatch(HAN_PATTERN);
      expect(localized.id).toBe(item.id);
      expect(localized.metadata.version).toBe(item.metadata.version);
      expect(localized.nodes.map(({ id }) => id)).toEqual(
        item.nodes.map(({ id }) => id),
      );
      expect(localized.nodes.map(({ answer }) => answer)).toEqual(
        item.nodes.map(({ answer }) => answer),
      );
    }
  });

  it('returns the original authored objects in Chinese mode', async () => {
    const [foundations, concepts, firstCaseModule] = await Promise.all([
      bundledFoundationSource.loadAll(),
      bundledConceptSource.loadAll(),
      contentIndex[0]!.load(),
    ]);

    expect(localizeFoundations(foundations, 'zh-CN')).toBe(foundations);
    expect(localizeConcepts(concepts, 'zh-CN')).toBe(concepts);
    expect(localizeCase(firstCaseModule.default, 'zh-CN')).toBe(
      firstCaseModule.default,
    );
  });
});
