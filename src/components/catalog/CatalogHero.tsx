import { Card, CardContent } from '@/components/ui/card';

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function CatalogHero({
  title,
  subtitle = 'Git is the database. Markdown files are the source of truth.',
  eyebrow = 'Servdir - Simple Service Catalog',
}: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-eyebrow mb-2.5 text-muted-foreground">{eyebrow}</p>
        <h1 className="text-headline mb-3">
          {title}
        </h1>
        <p className="text-body text-muted-foreground max-w-5xl">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
