import { loadGitServices, loadLocalServices } from './sources';
import { validateCatalog } from './validate';
import type { Catalog, ServiceRecord } from './types';
import type { GitSourceConfig } from '../config';

export type CatalogCacheKey = string;

export type CatalogCacheEntry = {
  catalog?: Catalog;
  lastRefreshStartedAt?: string;
  lastRefreshFinishedAt?: string;
  lastSuccessfulRefreshAt?: string;
  lastRefreshError?: string;
  refreshPromise?: Promise<Catalog>;
};

const cacheEntries = new Map<CatalogCacheKey, CatalogCacheEntry>();

export function getCatalogCacheKey(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): CatalogCacheKey {
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

export function getCatalogCacheEntry(cacheKey: CatalogCacheKey): CatalogCacheEntry | undefined {
  return cacheEntries.get(cacheKey);
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

/**
 * Refresh the cache entry for one catalog configuration.
 *
 * Important behavior:
 * - only one refresh runs at a time per cache key
 * - a successful refresh replaces the in-memory catalog
 * - a failed refresh keeps the last known good catalog and marks it stale
 * - if no catalog was ever built successfully, the error still bubbles up
 */
export async function refreshCatalogCache(
  localCatalogRoot: string | undefined,
  gitSources: GitSourceConfig[],
): Promise<Catalog> {
  const cacheKey = getCatalogCacheKey(localCatalogRoot, gitSources);
  const entry = cacheEntries.get(cacheKey) ?? {};

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
  cacheEntries.set(cacheKey, entry);
  return refreshPromise;
}

export function clearCatalogCache(): void {
  cacheEntries.clear();
}
