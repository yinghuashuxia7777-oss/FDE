import { createHash } from 'node:crypto';

import { canonicalizeContent } from '../src/content/canonicalize';

export function sha256Content(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalizeContent(value), 'utf8').digest('hex')}`;
}
