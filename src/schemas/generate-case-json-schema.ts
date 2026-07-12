import { format } from 'prettier';
import { z } from 'zod';

import { FdeCaseSchema } from './case.schema.ts';

export function generateFdeCaseJsonSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://fde-arena.local/schemas/fde-case.schema.json',
    title: 'FDE Arena Case',
    ...z.toJSONSchema(FdeCaseSchema, { target: 'draft-2020-12' }),
  };
}

export function serializeFdeCaseJsonSchema(): Promise<string> {
  return format(JSON.stringify(generateFdeCaseJsonSchema()), {
    parser: 'json',
  });
}
