import { describe, expect, it } from 'vitest';

describe('content canonicalization', () => {
  it('sorts object keys and content sets while preserving authored sequence', async () => {
    const { canonicalizeContent } = await import('./canonicalize');
    const first = {
      skills: [{ id: 'skill-z' }, { id: 'skill-a' }],
      nodes: [{ id: 'node-2' }, { id: 'node-1' }],
      domains: ['z-domain', 'a-domain'],
      nested: { z: 1, a: 2 },
    };
    const second = {
      nested: { a: 2, z: 1 },
      domains: ['a-domain', 'z-domain'],
      nodes: [{ id: 'node-2' }, { id: 'node-1' }],
      skills: [{ id: 'skill-a' }, { id: 'skill-z' }],
    };

    expect(canonicalizeContent(first)).toBe(canonicalizeContent(second));
    expect(JSON.parse(canonicalizeContent(first))).toEqual({
      domains: ['a-domain', 'z-domain'],
      nested: { a: 2, z: 1 },
      nodes: [{ id: 'node-2' }, { id: 'node-1' }],
      skills: [{ id: 'skill-a' }, { id: 'skill-z' }],
    });
  });

  it('produces a prefixed SHA-256 digest from canonical UTF-8 JSON', async () => {
    const { sha256Content } = await import('../../scripts/content-hash');

    expect(sha256Content({})).toBe(
      'sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
    );
  });
});
