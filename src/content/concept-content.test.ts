import {
  conceptsForCase,
  conceptsForFoundation,
  summarizeConceptRelations,
} from '../application/concepts';
import { bundledContentManifest } from '../generated/content-index';
import { bundledConceptSource } from './concept-source';
import { bundledFoundationSource } from './foundation-source';

describe('bundled FDE Concept Layer', () => {
  it('loads exactly 50 authored Concepts with the planned category split', async () => {
    const concepts = await bundledConceptSource.loadAll();
    const counts = Object.fromEntries(
      ['api-backend', 'system', 'ai', 'fde'].map((category) => [
        category,
        concepts.filter((concept) => concept.category === category).length,
      ]),
    );

    expect(concepts).toHaveLength(50);
    expect(counts).toEqual({
      'api-backend': 12,
      system: 13,
      ai: 15,
      fde: 10,
    });
    expect(new Set(concepts.map(({ id }) => id)).size).toBe(50);
    expect(concepts.map(({ order }) => order)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
  });

  it('bridges every bundled Foundation and active Case through stable IDs', async () => {
    const [concepts, foundations] = await Promise.all([
      bundledConceptSource.loadAll(),
      bundledFoundationSource.loadAll(),
    ]);

    expect(summarizeConceptRelations(concepts)).toEqual({
      conceptCount: 50,
      foundationRelationCount: 142,
      relatedFoundationCount: 100,
      caseRelationCount: 119,
      relatedCaseCount: 50,
    });
    expect(
      foundations.every(
        ({ id }) => conceptsForFoundation(concepts, id).length > 0,
      ),
    ).toBe(true);
    expect(
      bundledContentManifest.activeCaseIds.every(
        (caseId) => conceptsForCase(concepts, caseId).length > 0,
      ),
    ).toBe(true);
  });
});
