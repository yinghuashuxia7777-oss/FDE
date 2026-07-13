import {
  MAX_CONTENT_PACK_BYTES,
  type ContentPack,
  type ContentSource,
} from './contracts';
import { deepFreeze } from './deep-freeze';
import { ContentPackEnvelopeSchema } from './schemas';

export interface TextContentFile {
  readonly size: number;
  text(): Promise<string>;
}

function formatMiB(bytes: number): string {
  return `${Math.floor(bytes / (1024 * 1024))} MiB`;
}

export class JsonFileContentSource implements ContentSource {
  readonly sourceKind = 'file' as const;

  private snapshot: Promise<ContentPack> | undefined;

  constructor(private readonly file: TextContentFile) {}

  loadPack(): Promise<ContentPack> {
    this.snapshot ??= this.readSnapshot();
    return this.snapshot;
  }

  private async readSnapshot(): Promise<ContentPack> {
    if (this.file.size > MAX_CONTENT_PACK_BYTES) {
      throw new Error(
        `Content pack exceeds the ${formatMiB(MAX_CONTENT_PACK_BYTES)} limit.`,
      );
    }

    const text = await this.file.text();
    let untrusted: unknown;
    try {
      untrusted = JSON.parse(text);
    } catch {
      throw new Error('Content pack must be valid JSON.');
    }

    const pack = ContentPackEnvelopeSchema.parse(untrusted) as ContentPack;
    return deepFreeze(pack);
  }
}
