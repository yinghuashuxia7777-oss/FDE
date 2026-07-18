import {
  bundledContentManifest,
  bundledCoveragePlan,
  bundledDomains,
  bundledSkills,
  contentIndex,
} from '../generated/content-index';
import type { ContentPack, ContentSource } from './contracts';
import { deepFreeze } from './deep-freeze';
import { ContentPackSchema } from './schemas';

export class LocalContentSource implements ContentSource {
  readonly sourceKind = 'bundled' as const;

  private snapshot: Promise<ContentPack> | undefined;

  loadPack(): Promise<ContentPack> {
    this.snapshot ??= this.loadBundledSnapshot();
    return this.snapshot;
  }

  private async loadBundledSnapshot(): Promise<ContentPack> {
    const cases = await Promise.all(
      contentIndex.map(async ({ load }) => (await load()).default),
    );
    const pack = ContentPackSchema.parse({
      formatVersion: 1,
      manifest: bundledContentManifest,
      cases,
      skills: [...bundledSkills],
      domains: [...bundledDomains],
      coverage: bundledCoveragePlan,
    });

    return deepFreeze(pack);
  }
}
