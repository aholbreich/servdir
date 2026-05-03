import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyValueList } from '@/components/ui/KeyValueList';
import type { ServiceRecord } from '@/lib/catalog';

interface Props {
  service: ServiceRecord;
}

export function ServiceMetadataCard({ service }: Props) {
  const metadataItems = [
    { label: 'Kind', value: service.data.kind },
    { label: 'Repository', href: service.data.repo, text: 'Open repository ↗' },
    { label: 'Runbook', href: service.data.runbook, text: 'Open runbook ↗' },
    { label: 'System', value: service.data.system },
    { label: 'Domain', value: service.data.domain },
    ...(service.data.links ?? []).map((link) => ({
      label: link.label,
      href: link.url,
      text: 'Visit ↗',
    })),
  ];

  const openApiItems = (service.data.openapi ?? []).map((entry) => ({
    label: entry.label,
    href: entry.url,
    text: 'OpenAPI spec ↗',
  }));

  const deliveryItems = (service.data.delivery ?? []).map((entry) => ({
    label: entry.label,
    value: entry.text,
    href: entry.url,
    text: entry.url ? 'Open pipeline ↗' : undefined,
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValueList items={metadataItems} />
        </CardContent>
      </Card>

      {openApiItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">OpenAPI</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueList items={openApiItems} />
          </CardContent>
        </Card>
      )}

      {deliveryItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueList items={deliveryItems} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
