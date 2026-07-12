import { readFileSync } from 'node:fs';

import {
  generateFdeCaseJsonSchema,
  serializeFdeCaseJsonSchema,
} from './generate-case-json-schema';

const checkedInSchemaPath = 'content/schemas/fde-case.schema.json';

describe('FDE case JSON Schema artifact', () => {
  it('identifies the generated schema as the canonical FDE case contract', () => {
    expect(generateFdeCaseJsonSchema()).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://fde-arena.local/schemas/fde-case.schema.json',
      title: 'FDE Arena Case',
      type: 'object',
    });
  });

  it('does not drift from the checked-in JSON Schema', async () => {
    expect(readFileSync(checkedInSchemaPath, 'utf8')).toBe(
      await serializeFdeCaseJsonSchema(),
    );
  });
});
