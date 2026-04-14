export type CatalogStatusTabId = 'configuration' | 'runtime' | 'issues';

export interface CatalogStatusTabDefinition {
  id: CatalogStatusTabId;
  label: string;
  icon: string;
}

export const CATALOG_STATUS_TABS: CatalogStatusTabDefinition[] = [
  { id: 'configuration', label: 'Configuration', icon: 'status/configuration' },
  { id: 'runtime', label: 'Runtime', icon: 'status/runtime' },
  { id: 'issues', label: 'Issues', icon: 'status/issues' },
];

export function formatDuration(valueMs: number): string {
  if (valueMs % 60_000 === 0) {
    const minutes = valueMs / 60_000;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  if (valueMs % 1_000 === 0) {
    const seconds = valueMs / 1_000;
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  return `${valueMs} ms`;
}

export function describeSourceMode(localPath: string | undefined, gitSourceCount: number): string {
  if (localPath && gitSourceCount > 0) {
    return 'Local + managed Git';
  }

  if (localPath) {
    return 'Local only';
  }

  if (gitSourceCount > 0) {
    return 'Managed Git only';
  }

  return 'Unconfigured';
}

export type GitSourceSyncState = {
  lastSyncSucceeded: boolean;
  lastError?: string;
};

export function describeGitSources(count: number): string {
  return `${count} source${count === 1 ? '' : 's'}`;
}

export function getGitSourcesSummaryLabel(count: number): string {
  return count === 1 ? 'Show source details' : `Show all ${describeGitSources(count)}`;
}

export function describeGitSourceHealth(totalCount: number, failedCount: number, knownStatusCount: number): string {
  if (totalCount === 0) {
    return 'No managed Git sources';
  }

  if (failedCount > 0) {
    return `${failedCount} source${failedCount === 1 ? '' : 's'} failing`;
  }

  if (knownStatusCount === 0) {
    return 'Waiting for first sync';
  }

  return 'All sources healthy';
}

export function getGitSourceSyncBadge(status?: GitSourceSyncState): { label: string; tone: 'default' | 'ok' | 'warn' } {
  if (!status) {
    return { label: 'not synced yet', tone: 'default' };
  }

  if (status.lastSyncSucceeded) {
    return { label: 'healthy', tone: 'ok' };
  }

  return { label: 'sync failed', tone: 'warn' };
}

export function summarizeGitSourceError(message: string | undefined): string | undefined {
  if (!message) {
    return undefined;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes('unauthorized') || normalized.includes('correct access rights')) {
    return 'SSH key is not authorized for this repository.';
  }

  if (normalized.includes('permission denied (publickey)')) {
    return 'SSH key was rejected by the Git host.';
  }

  if (normalized.includes('repository not found')) {
    return 'Repository not found or not accessible with the current SSH key.';
  }

  if (normalized.includes('could not resolve hostname') || normalized.includes('name or service not known')) {
    return 'Git host could not be resolved from this environment.';
  }

  if (normalized.includes('host key verification failed')) {
    return 'Host key verification failed, check known_hosts configuration.';
  }

  const meaningfulLine = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !line.startsWith('Command failed:') && !line.startsWith('Cloning into '));

  return meaningfulLine ?? message;
}

export function getCatalogStatusTabButtonId(tabsId: string, tabId: string): string {
  return `${tabsId}-${tabId}`;
}

export function getCatalogStatusTabPanelId(tabsId: string, tabId: string): string {
  return `${tabsId}-${tabId}-panel`;
}
