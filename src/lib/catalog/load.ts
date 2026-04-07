import { loadGitServices, loadLocalServices } from './sources';
import { validateCatalog } from './validate';
import type { Catalog } from './types';
import type { GitSourceConfig } from '../config';
import { getConfig } from '../config';
import { startGitSyncScheduler, waitForInitialGitSync } from '../git-sync';

type LoadCatalogOptions = {
  gitSources?: GitSourceConfig[];
};

let schedulerStartup: Promise<void> | undefined;

function ensureGitSchedulerStarted(gitSources: GitSourceConfig[]): Promise<void> {
  if (gitSources.length === 0) {
    return Promise.resolve();
  }

  if (!schedulerStartup) {
    const config = getConfig();
    schedulerStartup = startGitSyncScheduler(config.gitSources, config.gitSyncIntervalMs);
  }

  return schedulerStartup;
}

export async function loadCatalog(catalogRoot: string | undefined, options: LoadCatalogOptions = {}): Promise<Catalog> {
  const sources = [];

  if (catalogRoot) {
    sources.push(loadLocalServices(catalogRoot));
  }

  if (options.gitSources && options.gitSources.length > 0) {
    await ensureGitSchedulerStarted(options.gitSources);
    await waitForInitialGitSync();
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
