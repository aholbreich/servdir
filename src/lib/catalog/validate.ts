import type { ServiceRecord, ValidationIssue } from './types';

export function validateCatalog(services: ServiceRecord[]): ServiceRecord[] {
  const seenIds = new Map<string, ServiceRecord>();

  for (const service of services) {
    const issues: ValidationIssue[] = [...service.issues];
    const duplicate = seenIds.get(service.data.id);

    if (duplicate) {
      issues.push({
        level: 'error',
        message: `duplicate service id: ${service.data.id}`,
      });
    } else {
      seenIds.set(service.data.id, service);
    }

    service.issues = issues;
  }

  const knownIds = new Set(services.map((service) => service.data.id));

  for (const service of services) {
    const dependsOn = service.data.depends_on ?? [];

    for (const dep of dependsOn) {
      if (!knownIds.has(dep)) {
        service.issues = [
          ...service.issues,
          {
            level: 'warning',
            message: `unresolved dependency: ${dep}`,
          },
        ];
      }
    }
  }

  return services;
}
