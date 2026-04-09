export type ValidationLevel = 'error' | 'warning';

export type ValidationIssue = {
  level: ValidationLevel;
  message: string;
};

export type ServiceFrontmatter = {
  id: string;
  name: string;
  owner: string;
  lifecycle: string;
  repo: string;
  description?: string;
  tier?: number;
  tags?: string[];
  depends_on?: string[];
  runbook?: string;
  links?: Array<{ label: string; url: string }>;
  openapi?: Array<{ label: string; url: string }>;
  system?: string;
  domain?: string;
};

export type ServiceRecord = {
  filePath: string;
  slug: string;
  body: string;
  html: string;
  data: ServiceFrontmatter;
  issues: ValidationIssue[];
};

export type CatalogSnapshotStatus = 'fresh' | 'stale';

export type Catalog = {
  generatedAt: string;
  services: ServiceRecord[];
  servicesById: Map<string, ServiceRecord>;
  snapshotStatus: CatalogSnapshotStatus;
  snapshotError?: string;
};
