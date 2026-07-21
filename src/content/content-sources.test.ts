import { MAX_CONTENT_PACK_BYTES, type ContentPack } from './contracts';
import { JsonFileContentSource } from './json-file-content-source';
import { LocalContentSource } from './local-content-source';

describe('content sources', () => {
  it('loads one complete immutable bundled snapshot', async () => {
    const source = new LocalContentSource();
    const first = await source.loadPack();
    const second = await source.loadPack();

    expect(source.sourceKind).toBe('bundled');
    expect(second).toBe(first);
    expect(first.manifest.packId).toBe('fde-arena-bundled');
    expect(first.manifest.activePublishedCaseCount).toBe(
      first.manifest.activeCases.length,
    );
    expect(first.manifest.activePublishedCaseCount).toBe(50);
    expect(first.manifest.caseVersionCount).toBe(first.cases.length);
    expect(first.cases).toHaveLength(53);
    expect(first.domains).toHaveLength(15);
    expect(first.skills).toHaveLength(15);
    expect(first.coverage.targetCaseCount).toBe(362);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.domains)).toBe(true);
  });

  it('rejects an oversized JSON file before reading its text', async () => {
    const text = vi.fn<() => Promise<string>>();
    const source = new JsonFileContentSource({
      size: MAX_CONTENT_PACK_BYTES + 1,
      text,
    });

    await expect(source.loadPack()).rejects.toThrow(/10 MiB/i);
    expect(text).not.toHaveBeenCalled();
  });

  it('reads and validates one file snapshot once', async () => {
    const bundled = await new LocalContentSource().loadPack();
    const text = vi.fn(() => Promise.resolve(JSON.stringify(bundled)));
    const source = new JsonFileContentSource({
      size: 1_024,
      text,
    });

    const first = await source.loadPack();
    const second = await source.loadPack();

    expect(source.sourceKind).toBe('file');
    expect(second).toBe(first);
    expect(text).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('rejects unknown future pack formats explicitly', async () => {
    const bundled = await new LocalContentSource().loadPack();
    const future = { ...bundled, formatVersion: 2 } as unknown as ContentPack;
    const source = new JsonFileContentSource({
      size: 1_024,
      text: () => Promise.resolve(JSON.stringify(future)),
    });

    await expect(source.loadPack()).rejects.toThrow(/formatVersion/i);
  });

  it('rejects user data fields in a content pack envelope', async () => {
    const bundled = await new LocalContentSource().loadPack();
    const source = new JsonFileContentSource({
      size: 1_024,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            ...bundled,
            attempts: [{ id: 'private-user-history' }],
          }),
        ),
    });

    await expect(source.loadPack()).rejects.toThrow(/unrecognized key/i);
  });
});
