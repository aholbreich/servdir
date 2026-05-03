import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagLink } from './TagLink';
import type { TagSummary } from '@/lib/catalog/tag-page';

interface Props {
  tags: TagSummary[];
}

export function TagCloud({ tags }: Props) {
  if (tags.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center">
          <p className="text-muted-foreground mx-auto max-w-3xl leading-7">
            No tags were discovered from the configured services.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tags.map((tag) => (
        <Card key={tag.label} className="flex items-center justify-between gap-4 px-5 py-4">
          <TagLink tag={tag.label} className="text-base" />
          <Badge variant="secondary">
            {tag.serviceCount} service{tag.serviceCount === 1 ? '' : 's'}
          </Badge>
        </Card>
      ))}
    </section>
  );
}
