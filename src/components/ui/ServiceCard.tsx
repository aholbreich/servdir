import { Card, CardContent } from '@/components/ui/card';
import { IssueList } from '@/components/ui/IssueList';
import { CatalogKindIcon } from '@/components/catalog/CatalogKindIcon';
import { ServiceCardLinkIcon } from '@/components/catalog/ServiceCardLinkIcon';
import { TagLink } from '@/components/catalog/TagLink';
import { getServiceSummary } from '@/lib/catalog';
import type { ServiceRecord } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { getServiceCardLinks } from '@/lib/service-card-links';

interface Props {
  service: ServiceRecord;
}

export function ServiceCard({ service }: Props) {
  const summary = getServiceSummary(service);
  const hasIssues = service.issues.length > 0;
  const cardLinks = getServiceCardLinks(service.data);

  return (
    <Card className="flex h-full flex-col px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
      <div>
        <h2 className="min-w-0 text-[1.2rem] leading-tight font-semibold sm:text-[1.28rem]">
          <a href={toAppPath(`/services/${service.slug}`)}>{service.data.name}</a>
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground">
          <CatalogKindIcon kind={service.data.kind} className="shrink-0 text-muted-foreground" />
          <span>{service.data.id}</span>
        </span>
        {service.data.tags && service.data.tags.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.83rem] leading-5">
            {service.data.tags.map((tag) => (
              <TagLink key={tag} tag={tag} />
            ))}
          </p>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-[0.98rem] leading-6 text-muted-foreground">
        {summary}
      </p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-[0.95rem]">
        <div className="flex flex-wrap items-center gap-2">
          {cardLinks.map((link) => (
            <ServiceCardLinkIcon key={link.kind} kind={link.kind} href={link.href} label={link.label} />
          ))}
        </div>
        <a href={toAppPath(`/services/${service.slug}`)}>View details →</a>
      </div>

      {hasIssues && <IssueList issues={service.issues} className="mt-3 gap-1.5" />}
    </Card>
  );
}
