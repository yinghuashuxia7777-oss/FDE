import type {
  ActiveContentCatalog,
  ContentSource,
} from '../../content/contracts';
import {
  ContentInstaller,
  type ContentInstallPreview,
  type PreparedContentInstallation,
} from '../../content/installer';
import {
  JsonFileContentSource,
  type TextContentFile,
} from '../../content/json-file-content-source';
import { LocalContentSource } from '../../content/local-content-source';
import type {
  ContentRepository,
  InstalledContentPackRecord,
} from '../../repositories/contracts';

export interface ContentStatus {
  catalog: ActiveContentCatalog | undefined;
  pack: InstalledContentPackRecord | undefined;
  historicalCaseVersionCount: number;
  checksumMatchesCatalog: boolean;
}

export interface ContentStatusExport {
  exportedAt: string;
  activeCatalog: ActiveContentCatalog | null;
  manifest: InstalledContentPackRecord['manifest'] | null;
  historicalCaseVersionCount: number;
  checksumMatchesCatalog: boolean;
}

export interface ContentManagement {
  getStatus(): Promise<ContentStatus>;
  prepareFile(file: TextContentFile): Promise<PreparedContentInstallation>;
  install(prepared: PreparedContentInstallation): Promise<ActiveContentCatalog>;
  restoreBundled(): Promise<ActiveContentCatalog>;
  ensureBundledInitialized(): Promise<void>;
  exportStatus(): Promise<ContentStatusExport>;
}

function compareSemanticVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

export class ContentManagementService implements ContentManagement {
  constructor(
    private readonly repository: ContentRepository,
    private readonly installer: ContentInstaller,
    private readonly bundledSource: ContentSource = new LocalContentSource(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getStatus(): Promise<ContentStatus> {
    const [catalog, pack, historicalCaseVersionCount] = await Promise.all([
      this.repository.getActiveCatalog(),
      this.repository.getActivePack(),
      this.repository.countHistoricalCaseVersions(),
    ]);
    return {
      catalog,
      pack,
      historicalCaseVersionCount,
      checksumMatchesCatalog:
        catalog !== undefined && catalog.checksum === pack?.checksum,
    };
  }

  prepareFile(file: TextContentFile): Promise<PreparedContentInstallation> {
    return this.installer.prepare(new JsonFileContentSource(file));
  }

  install(
    prepared: PreparedContentInstallation,
  ): Promise<ActiveContentCatalog> {
    return this.installer.install(prepared);
  }

  async restoreBundled(): Promise<ActiveContentCatalog> {
    return this.installer.install(
      await this.installer.prepare(this.bundledSource),
    );
  }

  async ensureBundledInitialized(): Promise<void> {
    const catalog = await this.repository.getActiveCatalog();
    if (catalog?.sourceKind !== undefined && catalog.sourceKind !== 'bundled') {
      return;
    }
    const bundled = await this.bundledSource.loadPack();
    if (
      catalog === undefined ||
      compareSemanticVersions(
        catalog.contentVersion,
        bundled.manifest.contentVersion,
      ) < 0
    ) {
      await this.restoreBundled();
    }
  }

  async exportStatus(): Promise<ContentStatusExport> {
    const status = await this.getStatus();
    return {
      exportedAt: this.now(),
      activeCatalog: status.catalog ?? null,
      manifest: status.pack?.manifest ?? null,
      historicalCaseVersionCount: status.historicalCaseVersionCount,
      checksumMatchesCatalog: status.checksumMatchesCatalog,
    };
  }
}

export type { ContentInstallPreview, PreparedContentInstallation };
