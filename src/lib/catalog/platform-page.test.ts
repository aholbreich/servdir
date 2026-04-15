import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Catalog } from './types';
import { loadConfiguredPlatformPage, loadConfiguredPlatformsIndex, toPlatformSlug } from './platform-page';

vi.mock('./load', () => ({
  loadConfiguredCatalog: vi.fn(),
}));

const { loadConfiguredCatalog } = await import('./load');

function createCatalog(): Catalog {
  const alpha = {
    filePath: '/tmp/services/alpha/service.md',
    slug: 'alpha-service',
    body: '# Alpha',
    html: '<h1>Alpha</h1>',
    data: {
      id: 'alpha',
      name: 'Alpha Service',
      owner: 'team-a',
      lifecycle: 'production',
      repo: 'https://example.com/alpha',
      platform: 'aws-prod',
    },
    issues: [],
  };

  const beta = {
    filePath: '/tmp/services/beta/service.md',
    slug: 'beta-service',
    body: '# Beta',
    html: '<h1>Beta</h1>',
    data: {
      id: 'beta',
      name: 'Beta Service',
      owner: 'team-b',
      lifecycle: 'production',
      repo: 'https://example.com/beta',
      platform: 'aws-prod',
    },
    issues: [],
  };

  const gamma = {
    filePath: '/tmp/services/gamma/service.md',
    slug: 'gamma-service',
    body: '# Gamma',
    html: '<h1>Gamma</h1>',
    data: {
      id: 'gamma',
      name: 'Gamma Service',
      owner: 'team-c',
      lifecycle: 'experimental',
      repo: 'https://example.com/gamma',
      platform: 'on-prem',
    },
    issues: [],
  };

  const delta = {
    filePath: '/tmp/services/delta/service.md',
    slug: 'delta-service',
    body: '# Delta',
    html: '<h1>Delta</h1>',
    data: {
      id: 'delta',
      name: 'Delta Service',
      owner: 'team-a',
      lifecycle: 'production',
      repo: 'https://example.com/delta',
    },
    issues: [],
  };

  return {
    generatedAt: new Date().toISOString(),
    services: [beta, gamma, alpha, delta],
    servicesById: new Map([
      ['alpha', alpha],
      ['beta', beta],
      ['gamma', gamma],
      ['delta', delta],
    ]),
    snapshotStatus: 'fresh',
  };
}

describe('toPlatformSlug', () => {
  it('normalizes a platform value for URL usage', () => {
    expect(toPlatformSlug('aws-prod')).toBe('aws-prod');
    expect(toPlatformSlug('  On Prem  ')).toBe('on-prem');
    expect(toPlatformSlug('Legacy_K8s')).toBe('legacy-k8s');
  });
});

describe('loadConfiguredPlatformsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());
  });

  it('aggregates platforms with counts, excludes services without platform, and sorts by label', async () => {
    const page = await loadConfiguredPlatformsIndex();

    expect(page.platforms).toEqual([
      { label: 'Aws prod', slug: 'aws-prod', serviceCount: 2 },
      { label: 'On prem', slug: 'on-prem', serviceCount: 1 },
    ]);
  });
});

describe('loadConfiguredPlatformPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());
  });

  it('loads one platform page and returns matching services sorted by name', async () => {
    const page = await loadConfiguredPlatformPage('aws-prod');

    expect(page?.platform).toEqual({
      label: 'Aws prod',
      slug: 'aws-prod',
      serviceCount: 2,
    });
    expect(page?.services.map((s) => s.data.name)).toEqual(['Alpha Service', 'Beta Service']);
  });

  it('returns undefined when the platform does not exist', async () => {
    expect(await loadConfiguredPlatformPage('does-not-exist')).toBeUndefined();
  });

  it('returns undefined when no platform slug is provided', async () => {
    expect(await loadConfiguredPlatformPage(undefined)).toBeUndefined();
  });
});
