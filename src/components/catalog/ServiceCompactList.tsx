import { Badge } from '@/components/ui/badge';
import { CatalogKindIcon } from './CatalogKindIcon';
import { TagLink } from './TagLink';
import type { CSSProperties } from 'react';
import type { ServiceRecord } from '@/lib/catalog/types';
import { toAppPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

interface Props {
  services: ServiceRecord[];
  idColumnWidthCh?: number;
}

export function ServiceCompactList({ services, idColumnWidthCh }: Props) {
  const colWidth = idColumnWidthCh ?? Math.max(...services.map((s) => s.data.id.length), 8);

  return (
    <ul
      className="divide-y divide-border rounded-2xl border border-border bg-background/85 shadow-sm"
      style={{ '--catalog-id-column': `calc(${colWidth}ch + 1.25rem)` } as CSSProperties}
    >
      {services.map((service) => (
        <li
          key={service.slug}
          data-service-kind={service.data.kind?.trim().toLowerCase() || 'service'}
          data-service-name={service.data.name.toLowerCase()}
          data-service-id={service.data.id.toLowerCase()}
        >
          <div className="group/row px-4 py-3 transition-all duration-150 hover:bg-primary/[0.03] sm:px-5">
            <div
              className="grid items-start gap-[0.5rem_0.875rem] [grid-template-columns:minmax(0,1fr)_auto] [grid-template-areas:'title_status'_'id_status'_'meta_meta'] md:gap-[0.75rem_1rem] md:[grid-template-columns:var(--catalog-id-column)_minmax(18rem,1.35fr)_minmax(0,1fr)_auto] md:[grid-template-areas:'id_title_meta_status']"
            >
              <a
                href={toAppPath(`/services/${service.slug}`)}
                className="min-w-0 text-[1rem] font-semibold leading-5 transition-colors group-hover/row:text-primary"
                style={{ gridArea: 'title' }}
              >
                {service.data.name}
              </a>

              <a
                href={toAppPath(`/services/${service.slug}`)}
                className="inline-flex items-center gap-1.5 text-[0.84rem] text-muted-foreground"
                style={{ gridArea: 'id', width: 'fit-content' }}
              >
                <CatalogKindIcon
                  kind={service.data.kind}
                  className="shrink-0 text-muted-foreground transition-colors group-hover/row:text-primary"
                />
                <span>{service.data.id}</span>
              </a>

              <span
                className="flex shrink-0 items-center gap-2 justify-self-end"
                style={{ gridArea: 'status' }}
              >
                {service.issues.length > 0 ? (
                  <Badge variant="destructive">
                    {service.issues.length} warning{service.issues.length === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">ok</Badge>
                )}
              </span>

              <span
                className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem]"
                style={{ gridArea: 'meta', marginTop: '0.125rem' }}
              >
                {service.data.tags && service.data.tags.length > 0 && (
                  <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[0.83rem] leading-5">
                    {service.data.tags.map((tag) => (
                      <TagLink key={tag} tag={tag} />
                    ))}
                  </span>
                )}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
