import { z } from 'zod';
import { serviceFrontmatterSchema } from './schema';

export type ValidationLevel = 'error' | 'warning';

export type ValidationIssue = {
  level: ValidationLevel;
  message: string;
};

// Derived from the Zod schema so field definitions stay in one place.
export type ServiceFrontmatter = z.infer<typeof serviceFrontmatterSchema>;

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
