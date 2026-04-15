import { describe, expect, it } from 'vitest';
import { buildPlatformGroups, flattenPlatformGroups } from './platform-groups';
import type { ServiceRecord } from './types';

function createServiceRecord(id: string, name: string, platform?: string): ServiceRecord {
  return {
    filePath: `/tmp/services/${id}/service.md`,
    slug: `${id}-service`,
    body: `# ${name}`,
    html: `<h1>${name}</h1>`,
    data: {
      id,
      name,
      owner: 'team-a',
      lifecycle: 'production',
      repo: `https://example.com/${id}`,
      ...(platform ? { platform } : {}),
    },
    issues: [],
  };
}

describe('buildPlatformGroups', () => {
  it('groups by platform label, sorts named platforms, and places missing platform entries under Other', () => {
    const alpha = createServiceRecord('alpha', 'Alpha Service', 'gcp');
    const beta = createServiceRecord('beta', 'Beta Service');
    const gamma = createServiceRecord('gamma', 'Gamma Service', 'aws-prod');
    const delta = createServiceRecord('delta', 'Delta Service', 'gcp');

    const groups = buildPlatformGroups([alpha, beta, gamma, delta]);

    expect(groups.map((group) => group.label)).toEqual(['Aws prod', 'Gcp', 'Other']);
    expect(groups[0]?.services.map((service) => service.data.id)).toEqual(['gamma']);
    expect(groups[1]?.services.map((service) => service.data.id)).toEqual(['alpha', 'delta']);
    expect(groups[2]?.services.map((service) => service.data.id)).toEqual(['beta']);
  });
});

describe('flattenPlatformGroups', () => {
  it('preserves the service order inside each platform group', () => {
    const alpha = createServiceRecord('alpha', 'Alpha Service', 'aws-prod');
    const beta = createServiceRecord('beta', 'Beta Service', 'aws-prod');
    const gamma = createServiceRecord('gamma', 'Gamma Service');
    const groups = buildPlatformGroups([beta, gamma, alpha]);

    expect(flattenPlatformGroups(groups).map((service) => service.data.id)).toEqual([
      'beta',
      'alpha',
      'gamma',
    ]);
  });
});
