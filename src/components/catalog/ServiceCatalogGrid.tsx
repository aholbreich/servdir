import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/Chip';
import { ServiceCardGrid } from './ServiceCardGrid';
import { ServiceCompactList } from './ServiceCompactList';
import { CatalogKindIcon } from './CatalogKindIcon';
import type { ServiceRecord } from '@/lib/catalog/types';
import { buildPlatformGroups, flattenPlatformGroups } from '@/lib/catalog/platform-groups';
import { normalizeCatalogKind } from '@/lib/catalog-kind-icon';
import { toAppPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'servdir:catalog-view';

interface Props {
  services: ServiceRecord[];
}

export function ServiceCatalogGrid({ services }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [activeKind, setActiveKind] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformGrouped, setPlatformGrouped] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'cards') setViewMode('cards');
  }, []);

  function handleViewMode(mode: 'list' | 'cards') {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  function toggleKind(kind: string) {
    setActiveKind((prev) => (prev === kind ? null : kind));
  }

  const uniqueKinds = useMemo(
    () => [...new Set(services.map((s) => normalizeCatalogKind(s.data.kind) || 'service'))].sort(),
    [services],
  );

  const platformGroups = useMemo(() => buildPlatformGroups(services), [services]);
  const showPlatformToggle = platformGroups.length > 1;
  const showKindFilter = uniqueKinds.length > 1;

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const kindMatch = !activeKind || normalizeCatalogKind(s.data.kind) === activeKind;
      const searchMatch =
        !q ||
        s.data.name.toLowerCase().includes(q) ||
        s.data.id.toLowerCase().includes(q);
      return kindMatch && searchMatch;
    });
  }, [services, activeKind, searchQuery]);

  const filteredGroups = useMemo(
    () =>
      platformGroups.map((group) => ({
        ...group,
        services: group.services.filter((s) => filteredServices.includes(s)),
      })).filter((g) => g.services.length > 0),
    [platformGroups, filteredServices],
  );

  const globalIdWidthCh = useMemo(
    () => Math.max(...filteredServices.map((s) => s.data.id.length), 8),
    [filteredServices],
  );

  const sortedFiltered = useMemo(() => flattenPlatformGroups(
    platformGroups.map((g) => ({ ...g, services: g.services.filter((s) => filteredServices.includes(s)) }))
  ), [platformGroups, filteredServices]);

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center">
          <h2 className="mb-2.5 text-xl font-semibold">No services found</h2>
          <p className="text-muted-foreground mx-auto max-w-3xl leading-7">
            No services were discovered from the configured sources yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or id…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background/85 px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="flex shrink-0 items-center gap-3">
          {showKindFilter && (
            <div className="inline-flex items-center gap-1" role="group" aria-label="Filter by kind">
              {uniqueKinds.map((kind) => (
                <Chip key={kind} variant="icon-button" asChild>
                  <button
                    type="button"
                    onClick={() => toggleKind(kind)}
                    aria-pressed={activeKind === kind}
                    title={kind.charAt(0).toUpperCase() + kind.slice(1)}
                  >
                    <CatalogKindIcon kind={kind} size={15} />
                  </button>
                </Chip>
              ))}
            </div>
          )}

          <div className="inline-flex rounded-full border border-border bg-background/80 p-1 shadow-sm" role="group" aria-label="Catalog view mode">
            {(['list', 'cards'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground',
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
            {showPlatformToggle && (
              <>
                <span className="mx-1 w-px self-stretch bg-border" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setPlatformGrouped((v) => !v)}
                  aria-pressed={platformGrouped}
                  title="Group by platform"
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    platformGrouped ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground',
                  )}
                >
                  Group
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <p className="text-sm">
          Showing {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'}
        </p>
        <a href={toAppPath('/tags')} className="text-sm">Browse tags</a>
        {services.some((s) => s.data.platform?.trim()) && (
          <a href={toAppPath('/platforms')} className="text-sm">Browse platforms</a>
        )}
      </div>

      {viewMode === 'list' && (
        platformGrouped ? (
          <div className="grid gap-6">
            {filteredGroups.map((group) => (
              <div key={group.platform ?? '__other__'}>
                <div className="mb-2 flex items-center gap-1.5 px-0.5">
                  <span className="text-eyebrow text-muted-foreground">{group.label}</span>
                  <Chip variant="count">{group.services.length}</Chip>
                </div>
                <ServiceCompactList services={group.services} idColumnWidthCh={globalIdWidthCh} />
              </div>
            ))}
          </div>
        ) : (
          <ServiceCompactList services={sortedFiltered} idColumnWidthCh={globalIdWidthCh} />
        )
      )}

      {viewMode === 'cards' && (
        platformGrouped ? (
          <div className="grid gap-4">
            {filteredGroups.map((group) => (
              <div key={group.platform ?? '__other__'}>
                <div className="mb-2 flex items-center gap-1.5 px-0.5">
                  <span className="text-eyebrow text-muted-foreground">{group.label}</span>
                  <Chip variant="count">{group.services.length}</Chip>
                </div>
                <ServiceCardGrid services={group.services} grouped />
              </div>
            ))}
          </div>
        ) : (
          <ServiceCardGrid services={sortedFiltered} />
        )
      )}
    </section>
  );
}
