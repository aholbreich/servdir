import { loadGitServices, loadLocalServices } from './sources';
import { validateCatalog } from './validate';
import type { Catalog } from './types';
import type { GitSourceConfig } from '../config';

type LoadCatalogOptions = {
  gitSources?: GitSourceConfig[];
};

export async function loadCatalog(catalogRoot: string, options: LoadCatalogOptions = {}): Promise<Catalog> {
  const sources = [loadLocalServices(catalogRoot)];

  if (options.gitSources && options.gitSources.length > 0) {
    sources.push(loadGitServices(options.gitSources));
  }

  const loaded = await Promise.all(sources);
  const services = loaded.flat();
  const validated = validateCatalog(services).sort((a, b) => a.data.name.localeCompare(b.data.name));

  return {
    generatedAt: new Date().toISOString(),
    services: validated,
    servicesById: new Map(validated.map((service) => [service.data.id, service])),
  };
}
