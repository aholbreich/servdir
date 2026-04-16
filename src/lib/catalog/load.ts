import type { Catalog } from './types';
import { getCatalogCacheEntry, refreshCatalogCache } from './cache';
import type { GitSourceConfig } from '../config';
import { getConfig } from '../config';
import { startGitSyncScheduler, waitForInitialGitSync } from '../git-sync';
import { isStaticBuildMode } from '../build-mode';
import { createLogger } from '../logger';

type LoadCatalogOptions = {
  gitSources?: GitSourceConfig[];
};

let schedulerStartup: Promise<void> | undefined;
const logger = createLogger('catalog');

function ensureGitSchedulerStarted(localCatalogRoot: string | undefined, gitSources: GitSourceConfig[]): Promise<void> {
  if (gitSources.length === 0) {
    return Promise.resolve();
  }

  if (!schedulerStartup) {
    const config = getConfig();
    schedulerStartup = startGitSyncScheduler(gitSources, config.gitSyncIntervalMs, async () => {
      try {
        await refreshCatalogCache(localCatalogRoot, gitSources);
      } catch (error) {
        logger.error('Catalog snapshot refresh failed after git sync cycle', {
          error: error instanceof Error ? error : new Error(String(error)),
        });
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
export async function loadCatalogFromSources(localCatalogRoot: string | undefined, options: LoadCatalogOptions = {}): Promise<Catalog> {
  const gitSources = options.gitSources ?? [];
  const existingEntry = getCatalogCacheEntry(localCatalogRoot, gitSources);

  // Static export mode must not start the long-lived git sync scheduler.
  // In static builds, we only need a one-off catalog snapshot at build time.
  if (gitSources.length > 0 && !isStaticBuildMode()) {
    await ensureGitSchedulerStarted(localCatalogRoot, gitSources);
    await waitForInitialGitSync();
  }

  if (existingEntry?.catalog) {
    return existingEntry.catalog;
  }

  return refreshCatalogCache(localCatalogRoot, gitSources);
}

export async function loadConfiguredCatalog(): Promise<Catalog> {
  const config = getConfig();
  return loadCatalogFromSources(config.localCatalogPath, {
    gitSources: config.gitSources,
  });
}
