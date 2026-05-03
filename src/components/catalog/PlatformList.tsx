import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlatformSummary } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

interface Props {
  platforms: PlatformSummary[];
}

export function PlatformList({ platforms }: Props) {
  if (platforms.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center">
          <p className="text-muted-foreground mx-auto max-w-3xl leading-7">
            No platforms were found in the configured services.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => (
        <Card key={platform.slug} className="flex items-center justify-between gap-3 px-4 py-2">
          <a
            href={toAppPath(`/platforms/${platform.slug}`)}
            className="font-medium hover:underline"
          >
            {platform.label}
          </a>
          <Badge variant="secondary" className="shrink-0">
            {platform.serviceCount} service{platform.serviceCount === 1 ? '' : 's'}
          </Badge>
        </Card>
      ))}
    </section>
  );
}
