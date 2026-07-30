export type DeliveryStageId =
  'discover' | 'define-value' | 'design' | 'activate' | 'review-reuse';

export type FdeDeliveryLinkKind = 'practice' | 'academy' | 'project';

export interface FdeDeliveryRelatedLink {
  readonly kind: FdeDeliveryLinkKind;
  readonly label: string;
  readonly href: string;
}

export interface FdeDeliveryStageDefinition {
  readonly id: DeliveryStageId;
  readonly title: string;
  readonly artifactLabel: string;
  readonly prompt: string;
  readonly whatThisProves: string;
  readonly relatedLinks: readonly FdeDeliveryRelatedLink[];
}

export interface FdeDeliveryTemplate {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly attributionUrl: string;
  readonly stages: readonly FdeDeliveryStageDefinition[];
}

export interface FdeDeliveryCatalog {
  readonly schemaVersion: 1;
  readonly templates: readonly FdeDeliveryTemplate[];
}

export interface FdeDeliveryRecord {
  readonly templateId: string;
  readonly artifacts: Partial<Record<DeliveryStageId, string>>;
  readonly completedStageIds: readonly DeliveryStageId[];
  readonly updatedAt: string;
}

export interface FdeDeliveryStore {
  load(templateId: string): FdeDeliveryRecord;
  save(record: FdeDeliveryRecord): void;
  reset(templateId: string): void;
}
