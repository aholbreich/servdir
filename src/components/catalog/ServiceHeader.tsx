import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagLink } from './TagLink';
import type { ServiceRecord } from '@/lib/catalog';

interface Props {
  service: ServiceRecord;
}

export function ServiceHeader({ service }: Props) {
  const hasIssues = service.issues.length > 0;

  const attributeItems = [
    service.data.id,
    service.data.kind,
    service.data.owner,
    service.data.lifecycle,
    ...(service.data.system ? [service.data.system] : []),
    ...(service.data.domain ? [service.data.domain] : []),
    ...(service.data.tier ? [`tier ${service.data.tier}`] : []),
  ];

  return (
    <Card className="mb-5">
      <CardContent className="p-6.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-3 text-4xl font-semibold leading-tight md:text-5xl">
              {service.data.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap gap-2 text-[0.9rem] leading-5">
              {attributeItems.map((value, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-muted-foreground"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={hasIssues ? 'destructive' : 'default'}>
              {hasIssues ? `${service.issues.length} issue(s)` : 'valid'}
            </Badge>
            {service.data.tags?.map((tag) => (
              <TagLink key={tag} tag={tag} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
