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

export function describeGitSources(count: number): string {
  return `${count} source${count === 1 ? '' : 's'}`;
}

export function getGitSourcesSummaryLabel(count: number): string {
  return count === 1 ? 'Show source details' : `Show all ${describeGitSources(count)}`;
}

export function getCatalogStatusTabButtonId(tabsId: string, tabId: string): string {
  return `${tabsId}-${tabId}`;
}

export function getCatalogStatusTabPanelId(tabsId: string, tabId: string): string {
  return `${tabsId}-${tabId}-panel`;
}
