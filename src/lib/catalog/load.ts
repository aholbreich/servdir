import path from 'node:path';
import { glob } from 'glob';
import { parseServiceFile } from './parse';
import { validateCatalog } from './validate';
import type { Catalog } from './types';

export async function loadCatalog(catalogRoot: string): Promise<Catalog> {
  const pattern = path.join(catalogRoot, 'services', '*', 'service.md').replaceAll('\\', '/');
  console.info(`[catalog] loading services from pattern: ${pattern}`);

  const filePaths = await glob(pattern);
  console.info(`[catalog] discovered ${filePaths.length} service definition file(s)`);

  if (filePaths.length > 0) {
    console.info(`[catalog] first discovered file: ${filePaths[0]}`);
  }

  const services = await Promise.all(filePaths.map((filePath) => parseServiceFile(filePath)));
  const validated = validateCatalog(services).sort((a, b) => a.data.name.localeCompare(b.data.name));

  return {
    generatedAt: new Date().toISOString(),
    services: validated,
    servicesById: new Map(validated.map((service) => [service.data.id, service])),
  };
}
