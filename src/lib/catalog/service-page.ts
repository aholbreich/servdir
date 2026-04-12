import { loadConfiguredCatalog } from './load';
import type { Catalog, ServiceRecord } from './types';

export type ServiceDependencyItem = {
  id: string;
  service?: ServiceRecord;
};

export type ServicePageModel = {
  service: ServiceRecord;
  dependencies: ServiceDependencyItem[];
};

function findService(catalog: Catalog, idOrSlug: string | undefined): ServiceRecord | undefined {
  if (!idOrSlug) {
    return undefined;
  }

  return catalog.services.find((entry) => entry.slug === idOrSlug || entry.data.id === idOrSlug);
}

function buildDependencies(service: ServiceRecord, catalog: Catalog): ServiceDependencyItem[] {
  return (service.data.depends_on ?? []).map((dependencyId) => ({
    id: dependencyId,
    service: catalog.servicesById.get(dependencyId),
  }));
}

export async function loadConfiguredServicePage(idOrSlug: string | undefined): Promise<ServicePageModel | undefined> {
  const catalog = await loadConfiguredCatalog();
  const service = findService(catalog, idOrSlug);

  if (!service) {
    return undefined;
  }

  return {
    service,
    dependencies: buildDependencies(service, catalog),
  };
}
