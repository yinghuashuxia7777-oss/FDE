export interface MvpProjectDefinition {
  id: string;
  title: string;
  summary: string;
  requiredLeafSkillIds: string[];
  deliverables: string[];
}

export interface MvpProjectCatalog {
  schemaVersion: 1;
  status: 'draft' | 'reviewed';
  projects: MvpProjectDefinition[];
}
