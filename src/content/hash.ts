import { canonicalizeContent } from './canonicalize';

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Content(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeContent(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${toHex(new Uint8Array(digest))}`;
}
