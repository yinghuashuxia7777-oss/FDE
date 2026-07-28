import { z } from 'zod';

import type {
  AcademyCatalog,
  AcademyTool,
  AcademyTopic,
} from '../domain/academy/types';
import {
  AcademyCatalogSchema,
  AcademyContentCollectionSchema,
  AcademyToolSchema,
  AcademyTopicSchema,
} from './academy-schema';
import { deepFreeze } from './deep-freeze';

const catalogModules = import.meta.glob(
  '../../content/academy/zh-CN/catalog.json',
  {
    eager: true,
    import: 'default',
  },
);

const topicModules = import.meta.glob(
  '../../content/academy/zh-CN/topics/*.json',
  {
    eager: true,
    import: 'default',
  },
);

const toolCatalogModules = import.meta.glob(
  '../../content/academy/zh-CN/tools/catalog.json',
  {
    eager: true,
    import: 'default',
  },
);

const AcademyToolCatalogSchema = z
  .object({ tools: z.array(AcademyToolSchema) })
  .strict();

export interface AcademyContentSource {
  loadCatalog(): Promise<AcademyCatalog>;
  loadTopics(): Promise<readonly AcademyTopic[]>;
  findTopic(id: string): Promise<AcademyTopic | undefined>;
  loadTools(): Promise<readonly AcademyTool[]>;
  findTool(id: string): Promise<AcademyTool | undefined>;
}

function singleModuleValue(
  modules: Readonly<Record<string, unknown>>,
  label: string,
): unknown {
  const values = Object.values(modules);
  if (values.length !== 1) {
    throw new Error(`Expected exactly one bundled Academy ${label}.`);
  }
  return values[0];
}

function sortTopicsByCatalog(
  topics: AcademyTopic[],
  catalog: AcademyCatalog,
): void {
  const topicOrder = new Map(
    catalog.stages
      .flatMap(({ topicIds }) => topicIds)
      .map((id, index) => [id, index]),
  );

  topics.sort((left, right) => {
    const leftOrder = topicOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = topicOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id.localeCompare(right.id);
  });
}

export class StaticAcademyContentSource implements AcademyContentSource {
  private readonly catalogSnapshot: AcademyCatalog;
  private readonly topicSnapshot: readonly AcademyTopic[];
  private readonly toolSnapshot: readonly AcademyTool[];
  private readonly topicsById: ReadonlyMap<string, AcademyTopic>;
  private readonly toolsById: ReadonlyMap<string, AcademyTool>;

  constructor(
    catalogValue: unknown,
    topicValues: readonly unknown[],
    toolCatalogValue: unknown,
  ) {
    const catalog = AcademyCatalogSchema.parse(catalogValue);
    const topics = topicValues.map((value) => AcademyTopicSchema.parse(value));
    const tools = AcademyToolCatalogSchema.parse(toolCatalogValue).tools;
    const collection = AcademyContentCollectionSchema.parse({
      catalog,
      topics,
      tools,
    });

    const topicsInCatalogOrder = [...collection.topics];
    sortTopicsByCatalog(topicsInCatalogOrder, collection.catalog);

    this.catalogSnapshot = deepFreeze(collection.catalog);
    this.topicSnapshot = deepFreeze(topicsInCatalogOrder);
    this.toolSnapshot = deepFreeze(collection.tools);
    this.topicsById = new Map(
      this.topicSnapshot.map((topic) => [topic.id, topic]),
    );
    this.toolsById = new Map(this.toolSnapshot.map((tool) => [tool.id, tool]));
  }

  loadCatalog(): Promise<AcademyCatalog> {
    return Promise.resolve(this.catalogSnapshot);
  }

  loadTopics(): Promise<readonly AcademyTopic[]> {
    return Promise.resolve(this.topicSnapshot);
  }

  findTopic(id: string): Promise<AcademyTopic | undefined> {
    return Promise.resolve(this.topicsById.get(id));
  }

  loadTools(): Promise<readonly AcademyTool[]> {
    return Promise.resolve(this.toolSnapshot);
  }

  findTool(id: string): Promise<AcademyTool | undefined> {
    return Promise.resolve(this.toolsById.get(id));
  }
}

export const bundledAcademySource: AcademyContentSource =
  new StaticAcademyContentSource(
    singleModuleValue(catalogModules, 'Catalog'),
    Object.values(topicModules),
    singleModuleValue(toolCatalogModules, 'Tool catalog'),
  );
