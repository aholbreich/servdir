import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IssueList } from '@/components/ui/IssueList';
import type { ServiceRecord } from '@/lib/catalog';

interface Props {
  service: ServiceRecord;
}

export function ServiceValidationCard({ service }: Props) {
  const hasIssues = service.issues.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Validation</CardTitle>
      </CardHeader>
      <CardContent>
        {hasIssues ? (
          <IssueList issues={service.issues} />
        ) : (
          <p className="leading-6 text-green-700 dark:text-green-400">No validation issues.</p>
        )}
      </CardContent>
    </Card>
  );
}
