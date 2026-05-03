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
      <CardContent className="p-7">
        <p className="text-muted-foreground mb-2.5 text-[0.82rem] tracking-[0.02em]">{eyebrow}</p>
        <h1 className="mb-3 text-4xl font-semibold leading-tight tracking-[-0.03em] md:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-5xl leading-7">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
