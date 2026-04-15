import type { ServiceRecord } from './types';

export interface PlatformGroup {
  platform: string;
  label: string;
  services: ServiceRecord[];
}

function toPlatformLabel(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1).replace(/-/g, ' ');
}

export function buildPlatformGroups(services: ServiceRecord[]): PlatformGroup[] {
  const platformMap = new Map<string, ServiceRecord[]>();
  const noPlatform: ServiceRecord[] = [];

  for (const service of services) {
    const platform = service.data.platform?.trim();
    if (!platform) {
      noPlatform.push(service);
      continue;
    }

    if (!platformMap.has(platform)) {
      platformMap.set(platform, []);
    }

    platformMap.get(platform)!.push(service);
  }

  const groups = [...platformMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([platform, groupedServices]) => ({
      platform,
      label: toPlatformLabel(platform),
      services: groupedServices,
    }));

  if (noPlatform.length > 0) {
    groups.push({
      platform: '',
      label: 'Other',
      services: noPlatform,
    });
  }

  return groups;
}

export function flattenPlatformGroups(groups: PlatformGroup[]): ServiceRecord[] {
  return groups.flatMap((group) => group.services);
}
