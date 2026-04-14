import type { ServiceRecord, ValidationIssue } from './types';

export function validateCatalog(services: ServiceRecord[]): ServiceRecord[] {
  const seenIds = new Map<string, ServiceRecord>();

  // Pass 1: detect duplicate ids, producing new records rather than mutating.
  const afterDuplicateCheck = services.map((service) => {
    const duplicate = seenIds.get(service.data.id);

    if (duplicate) {
      return {
        ...service,
        issues: [
          ...service.issues,
          { level: 'error' as const, message: `duplicate service id: ${service.data.id}` },
        ],
      };
    }

    seenIds.set(service.data.id, service);
    return service;
  });

  // Pass 2: flag dependencies that reference unknown service ids.
  const knownIds = new Set(afterDuplicateCheck.map((s) => s.data.id));

  return afterDuplicateCheck.map((service) => {
    const unresolvedDeps = (service.data.depends_on ?? []).filter((dep) => !knownIds.has(dep));

    if (unresolvedDeps.length === 0) {
      return service;
    }

    const depIssues: ValidationIssue[] = unresolvedDeps.map((dep) => ({
      level: 'warning',
      message: `unresolved dependency: ${dep}`,
    }));

    return { ...service, issues: [...service.issues, ...depIssues] };
  });
}
