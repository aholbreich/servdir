import { loadGitServices, loadLocalServices } from './sources';
import { validateCatalog } from './validate';
import type { Catalog, ServiceRecord } from './types';
import type { GitSourceConfig } from '../config';

export type CatalogCacheEntry = {
  sourceSignature: string;
  catalog?: Catalog;
  lastRefreshStartedAt?: string;
  lastRefreshFinishedAt?: string;
  lastSuccessfulRefreshAt?: string;
  lastRefreshError?: string;
  refreshPromise?: Promise<Catalog>;
};

let cacheEntry: CatalogCacheEntry | undefined;

function getSourceSignature(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): string {
  return JSON.stringify({
    localCatalogRoot: localCatalogRoot ?? null,
    gitSources: gitSources.map((source) => ({
      name: source.name,
      repoUrl: source.repoUrl,
      branch: source.branch,
      checkoutPath: source.checkoutPath,
      scanPaths: source.scanPaths,
    })),
  });
}

function getOrCreateCacheEntry(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): CatalogCacheEntry {
  const sourceSignature = getSourceSignature(localCatalogRoot, gitSources);

  if (!cacheEntry || cacheEntry.sourceSignature !== sourceSignature) {
    cacheEntry = { sourceSignature };
  }

  return cacheEntry;
}

export function getCatalogCacheEntry(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): CatalogCacheEntry | undefined {
  const sourceSignature = getSourceSignature(localCatalogRoot, gitSources);

  if (!cacheEntry || cacheEntry.sourceSignature !== sourceSignature) {
    return undefined;
  }

  return cacheEntry;
}

function createCatalog(services: ServiceRecord[], snapshotStatus: Catalog['snapshotStatus'], snapshotError?: string): Catalog {
  const validated = validateCatalog(services).sort((a, b) => a.data.name.localeCompare(b.data.name));

  return {
    generatedAt: new Date().toISOString(),
    services: validated,
    servicesById: new Map(validated.map((service) => [service.data.id, service])),
    snapshotStatus,
    snapshotError,
  };
}

async function buildCatalog(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): Promise<Catalog> {
  const sources = [];

  if (localCatalogRoot) {
    sources.push(loadLocalServices(localCatalogRoot));
  }

  if (gitSources.length > 0) {
    sources.push(loadGitServices(gitSources));
  }

  const loaded = await Promise.all(sources);
  return createCatalog(loaded.flat(), 'fresh');
}

export async function refreshCatalogCache(
  localCatalogRoot: string | undefined,
  gitSources: GitSourceConfig[],
): Promise<Catalog> {
  const entry = getOrCreateCacheEntry(localCatalogRoot, gitSources);

  // If a refresh is already in flight, return the same promise rather than
  // starting a second concurrent build. Two simultaneous requests that both
  // miss the cache will share one catalog build instead of duplicating work.
  if (entry.refreshPromise) {
    return entry.refreshPromise;
  }

  entry.lastRefreshStartedAt = new Date().toISOString();
  entry.lastRefreshError = undefined;

  const refreshPromise = buildCatalog(localCatalogRoot, gitSources)
    .then((catalog) => {
      entry.catalog = catalog;
      entry.lastRefreshFinishedAt = new Date().toISOString();
      entry.lastSuccessfulRefreshAt = entry.lastRefreshFinishedAt;
      entry.lastRefreshError = undefined;
      return catalog;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      entry.lastRefreshFinishedAt = new Date().toISOString();
      entry.lastRefreshError = message;

      if (entry.catalog) {
        entry.catalog = {
          ...entry.catalog,
          snapshotStatus: 'stale',
          snapshotError: message,
        };
        return entry.catalog;
      }

      throw error;
    })
    .finally(() => {
      entry.refreshPromise = undefined;
    });

  entry.refreshPromise = refreshPromise;
  return refreshPromise;
}

export function clearCatalogCache(): void {
  cacheEntry = undefined;
}
