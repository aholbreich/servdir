import type { Catalog } from './types';
import { getCatalogCacheEntry, getCatalogCacheKey, refreshCatalogCache } from './cache';
import type { GitSourceConfig } from '../config';
import { getConfig } from '../config';
import { startGitSyncScheduler, waitForInitialGitSync } from '../git-sync';

type LoadCatalogOptions = {
  gitSources?: GitSourceConfig[];
};

let schedulerStartup: Promise<void> | undefined;

function ensureGitSchedulerStarted(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): Promise<void> {
  if (gitSources.length === 0) {
    return Promise.resolve();
  }

  if (!schedulerStartup) {
    const config = getConfig();
    schedulerStartup = startGitSyncScheduler(gitSources, config.gitSyncIntervalMs, async () => {
      try {
        await refreshCatalogCache(localCatalogRoot, gitSources);
        console.info('[catalog] refreshed in-memory snapshot after git sync cycle');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[catalog] failed to refresh in-memory snapshot after git sync cycle: ${message}`);
      }
    });
  }

  return schedulerStartup;
}

/**
 * Load the catalog for request rendering.
 *
 * Important behavior for future readers:
 * - requests should read from the in-memory cache whenever possible
 * - git sync still happens on its own scheduler cadence
 * - after the initial sync, we serve the cached snapshot instead of rescanning on every request
 * - if a later refresh fails, the cache module keeps the last known good snapshot and marks it stale
 */
export async function loadCatalog(localCatalogRoot: string | undefined, options: LoadCatalogOptions = {}): Promise<Catalog> {
  const gitSources = options.gitSources ?? [];
  const cacheKey = getCatalogCacheKey(localCatalogRoot, gitSources);
  const existingEntry = getCatalogCacheEntry(cacheKey);

  if (gitSources.length > 0) {
    await ensureGitSchedulerStarted(localCatalogRoot, gitSources);
    await waitForInitialGitSync();
  }

  if (existingEntry?.catalog) {
    return existingEntry.catalog;
  }

  return refreshCatalogCache(localCatalogRoot, gitSources);
}
