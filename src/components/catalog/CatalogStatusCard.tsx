import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { SvgIcon, type IconName } from '@/components/ui/SvgIcon';
import { CatalogStatusDetailList } from './CatalogStatusDetailList';
import type { DetailItem } from './CatalogStatusDetailList';
import {
  CATALOG_STATUS_TABS,
  describeGitSourceHealth,
  describeSourceMode,
  formatDuration,
  getGitSourcesSummaryLabel,
  getGitSourceSyncBadge,
  summarizeGitSourceError,
} from '@/lib/catalog-status';
import type { GitSourceSyncStatus } from '@/lib/catalog/sources';
import type { GitSourceConfig } from '@/lib/config';

interface GitSourceItem extends GitSourceConfig {
  syncStatus?: GitSourceSyncStatus;
}

interface Props {
  servicesCount: number;
  servicesValid: number;
  servicesWithIssues: number;
  generatedAt: string;
  buildVersion: string;
  snapshotStatus: 'fresh' | 'stale';
  snapshotError?: string;
  localCatalogPath?: string;
  gitSourcesCount: number;
  gitSources: GitSourceConfig[];
  gitSyncIntervalMs: number;
  gitSourceStatuses: GitSourceSyncStatus[];
  basicAuthEnabled: boolean;
}

export function CatalogStatusCard({
  servicesCount,
  servicesValid,
  servicesWithIssues,
  generatedAt,
  buildVersion,
  snapshotStatus,
  snapshotError,
  localCatalogPath,
  gitSourcesCount,
  gitSources,
  gitSyncIntervalMs,
  gitSourceStatuses,
  basicAuthEnabled,
}: Props) {
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const gitSourceStatusByPath = new Map(gitSourceStatuses.map((s) => [s.checkoutPath, s]));
  const gitSourcesWithStatus: GitSourceItem[] = gitSources.map((source) => ({
    ...source,
    syncStatus: gitSourceStatusByPath.get(source.checkoutPath),
  }));
  const gitSourceFailureCount = gitSourcesWithStatus.filter((s) => s.syncStatus && !s.syncStatus.lastSyncSucceeded).length;
  const gitSourceKnownStatusCount = gitSourcesWithStatus.filter((s) => s.syncStatus).length;

  const configurationItems: DetailItem[] = [
    { label: 'Source mode', value: describeSourceMode(localCatalogPath, gitSourcesCount) },
    { label: 'Local catalog', value: localCatalogPath ?? 'disabled', asCode: Boolean(localCatalogPath) },
    { label: 'Git sync health', value: describeGitSourceHealth(gitSourcesCount, gitSourceFailureCount, gitSourceKnownStatusCount) },
    { label: 'Basic auth', value: basicAuthEnabled ? 'enabled' : 'disabled' },
  ];

  const runtimeItems: DetailItem[] = [
    { label: 'Generated', value: dateFormatter.format(new Date(generatedAt)) },
    { label: 'Snapshot', value: snapshotStatus },
    { label: 'Build', value: buildVersion },
    { label: 'Git sync interval', value: formatDuration(gitSyncIntervalMs) },
  ];

  const issueItems: DetailItem[] = [
    {
      label: 'Validation warnings',
      value: servicesWithIssues > 0
        ? `${servicesWithIssues} service${servicesWithIssues === 1 ? '' : 's'} with warnings`
        : 'None',
    },
    ...(gitSourcesCount > 0 ? [{ label: 'Git source sync', value: describeGitSourceHealth(gitSourcesCount, gitSourceFailureCount, gitSourceKnownStatusCount) }] : []),
    ...(snapshotError ? [{ label: 'Last refresh error', value: snapshotError }] : []),
  ];

  type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
  const summaryBadges: Array<{ variant: BadgeVariant; label: string }> = [
    { variant: 'secondary', label: `${servicesCount} services` },
    { variant: 'secondary', label: `${servicesValid} valid` },
    { variant: servicesWithIssues > 0 ? 'destructive' : 'secondary', label: servicesWithIssues > 0 ? `${servicesWithIssues} warnings` : 'No warnings' },
    ...(gitSourcesCount > 0 ? [{
      variant: (gitSourceFailureCount > 0 ? 'destructive' : gitSourceKnownStatusCount > 0 ? 'secondary' : 'outline') as BadgeVariant,
      label: describeGitSourceHealth(gitSourcesCount, gitSourceFailureCount, gitSourceKnownStatusCount),
    }] : []),
    { variant: snapshotStatus === 'fresh' ? 'secondary' : 'destructive', label: snapshotStatus },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Catalog status</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="configuration">
          <TabsList className="mb-4">
            {CATALOG_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="inline-flex items-center gap-1.5">
                <SvgIcon name={tab.icon as IconName} size={14} />
                <span className="sr-only sm:not-sr-only">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="configuration">
            <CatalogStatusDetailList items={configurationItems}>
              <dt className="text-muted-foreground font-medium">Git sources</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-2 text-foreground">
                {gitSources.length > 0 ? (
                  <GitSourcesPopover
                    gitSources={gitSourcesWithStatus}
                    summaryLabel={getGitSourcesSummaryLabel(gitSourcesCount)}
                    countLabel={String(gitSourcesCount)}
                  />
                ) : (
                  <span>{gitSourcesCount}</span>
                )}
              </dd>
            </CatalogStatusDetailList>
          </TabsContent>

          <TabsContent value="runtime">
            <CatalogStatusDetailList items={runtimeItems} />
          </TabsContent>

          <TabsContent value="issues">
            <div className="mb-4 flex flex-wrap gap-2">
              {summaryBadges.map((badge, i) => (
                <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
              ))}
            </div>
            <CatalogStatusDetailList items={issueItems} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface GitSourcesPopoverProps {
  gitSources: GitSourceItem[];
  summaryLabel: string;
  countLabel: string;
}

function GitSourcesPopover({ gitSources, summaryLabel, countLabel }: GitSourcesPopoverProps) {
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center text-[0.88rem] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary"
        aria-label={summaryLabel}
        title={summaryLabel}
      >
        {countLabel}…
      </PopoverTrigger>
      <PopoverContent className="w-[min(21rem,calc(100vw-3rem))] p-2.5" align="end">
        <div className="grid gap-1.5 overflow-auto" style={{ maxHeight: 'min(18rem, 52vh)' }}>
          {gitSources.map((source, i) => {
            const syncBadge = getGitSourceSyncBadge(source.syncStatus);
            const syncHint = summarizeGitSourceError(source.syncStatus?.lastError);
            return (
              <section key={i} className="rounded-lg border bg-muted/40 px-2.5 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-[0.78rem] font-semibold">{source.name}</h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={syncBadge.tone === 'ok' ? 'secondary' : syncBadge.tone === 'warn' ? 'destructive' : 'outline'}>
                      {syncBadge.label}
                    </Badge>
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.66rem] font-medium text-muted-foreground">
                      {source.branch}
                    </span>
                  </div>
                </div>
                <dl className="grid gap-x-2 gap-y-0.5 text-[0.75rem] leading-4.5"
                  style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
                >
                  <dt className="text-muted-foreground">Repo</dt>
                  <dd className="min-w-0 break-all"><code className="text-[0.72rem]">{source.repoUrl}</code></dd>
                  <dt className="text-muted-foreground">Scan</dt>
                  <dd className="min-w-0 break-words">{source.scanPaths ? source.scanPaths.join(', ') : '(repo root)'}</dd>
                  {source.syncStatus?.lastSyncFinishedAt && (
                    <>
                      <dt className="text-muted-foreground">Last sync</dt>
                      <dd className="min-w-0 break-words">{dateFormatter.format(new Date(source.syncStatus.lastSyncFinishedAt))}</dd>
                    </>
                  )}
                  {syncHint && (
                    <>
                      <dt className="text-muted-foreground">Issue</dt>
                      <dd className="min-w-0 break-words text-destructive">{syncHint}</dd>
                    </>
                  )}
                </dl>
              </section>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
