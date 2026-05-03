import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

export interface DependencyItem {
  id: string;
  service?: ServiceRecord;
}

interface Props {
  dependencies: DependencyItem[];
}

export function ServiceDependenciesCard({ dependencies }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Dependencies</CardTitle>
      </CardHeader>
      <CardContent>
        {dependencies.length > 0 ? (
          <ul className="grid gap-2 pl-4.5 leading-6">
            {dependencies.map((dep) => (
              <li key={dep.id}>
                {dep.service ? (
                  <a href={toAppPath(`/services/${dep.service.slug}`)}>{dep.id}</a>
                ) : (
                  dep.id
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground leading-6">No dependencies declared.</p>
        )}
      </CardContent>
    </Card>
  );
}
