import { readFileSync } from 'node:fs';
import { z } from 'zod';

import { createMinimalValidCase } from '../tests/fixtures/cases';

import {
  generateFdeCaseJsonSchema,
  serializeFdeCaseJsonSchema,
} from './generate-case-json-schema';
import { FdeCaseSchema } from './case.schema';

const checkedInSchemaPath = 'content/schemas/fde-case.schema.json';
const checkedInArtifact = JSON.parse(
  readFileSync(checkedInSchemaPath, 'utf8'),
) as Parameters<typeof z.fromJSONSchema>[0];
const checkedInSchema = z.fromJSONSchema(checkedInArtifact);

interface NodeJsonSchemaVariant {
  properties: {
    type: { const?: string };
    answer: {
      properties: {
        correctOptionIds?: { uniqueItems?: boolean };
      };
    };
  };
}

interface CaseJsonSchemaArtifact {
  oneOf: {
    properties: {
      nodes: { items: { oneOf: NodeJsonSchemaVariant[] } };
    };
  }[];
}

describe('FDE case JSON Schema artifact', () => {
  it('identifies the generated schema as the canonical FDE case contract', () => {
    const generatedSchema = generateFdeCaseJsonSchema();

    expect(generatedSchema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://fde-arena.local/schemas/fde-case.schema.json',
      title: 'FDE Arena Case',
    });
    expect(generatedSchema.oneOf).toHaveLength(2);
  });

  it('does not drift from the checked-in JSON Schema', async () => {
    expect(readFileSync(checkedInSchemaPath, 'utf8')).toBe(
      await serializeFdeCaseJsonSchema(),
    );
  });

  it('accepts a valid case through the checked-in JSON Schema', () => {
    expect(checkedInSchema.safeParse(createMinimalValidCase()).success).toBe(
      true,
    );
  });

  it.each(['reviewed', 'published'])(
    'rejects %s cases without review metadata through JSON Schema',
    (status) => {
      const candidate = createMinimalValidCase();
      candidate.status = status as 'reviewed' | 'published';

      expect(checkedInSchema.safeParse(candidate).success).toBe(false);
    },
  );

  it('declares unique answer IDs and enforces them in canonical Zod', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0]!,
      type: 'multiple-choice',
      answer: { correctOptionIds: ['option-a', 'option-a'] },
    };

    const artifact = checkedInArtifact as unknown as CaseJsonSchemaArtifact;
    const multipleChoiceSchema =
      artifact.oneOf[0]!.properties.nodes.items.oneOf.find(
        ({ properties }) => properties.type.const === 'multiple-choice',
      );

    expect(
      multipleChoiceSchema?.properties.answer.properties.correctOptionIds
        ?.uniqueItems,
    ).toBe(true);
    expect(FdeCaseSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects empty answers through the checked-in JSON Schema', () => {
    const candidate = createMinimalValidCase();
    candidate.nodes[0] = {
      ...candidate.nodes[0]!,
      type: 'multiple-choice',
      answer: { correctOptionIds: [] },
    };

    expect(checkedInSchema.safeParse(candidate).success).toBe(false);
  });
});
