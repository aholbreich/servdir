import type { ServiceFrontmatter } from './catalog';

export type ServiceCardLinkKind = 'repository' | 'runbook' | 'openapi' | 'delivery';

export interface ServiceCardLink {
  kind: ServiceCardLinkKind;
  href: string;
  label: string;
}

export function getServiceCardLinks(service: ServiceFrontmatter): ServiceCardLink[] {
  const openApiEntry = service.openapi?.find((entry) => entry.url);
  const deliveryEntry = service.delivery?.find((entry) => entry.url);

  return [
    { kind: 'repository', href: service.repo, label: 'Repository' },
    ...(service.runbook ? [{ kind: 'runbook' as const, href: service.runbook, label: 'Runbook' }] : []),
    ...(openApiEntry ? [{ kind: 'openapi' as const, href: openApiEntry.url, label: openApiEntry.label || 'OpenAPI' }] : []),
    ...(deliveryEntry ? [{ kind: 'delivery' as const, href: deliveryEntry.url!, label: deliveryEntry.label || 'Delivery pipeline' }] : []),
  ];
}
