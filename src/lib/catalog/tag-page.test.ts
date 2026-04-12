import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Catalog } from './types';
import { loadConfiguredTagPage, loadConfiguredTagsIndex, toTagSlug } from './tag-page';

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
      tags: ['Payments', 'Backend'],
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
      tags: ['Payments', 'API Design'],
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
    },
    issues: [],
  };

  return {
    generatedAt: new Date().toISOString(),
    services: [beta, gamma, alpha],
    servicesById: new Map([
      ['alpha', alpha],
      ['beta', beta],
      ['gamma', gamma],
    ]),
    snapshotStatus: 'fresh',
  };
}

describe('toTagSlug', () => {
  it('normalizes a tag for URL usage', () => {
    expect(toTagSlug('API Design')).toBe('api-design');
    expect(toTagSlug('  Team_Payments  ')).toBe('team-payments');
  });
});

describe('loadConfiguredTagsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());
  });

  it('aggregates tags with counts and sorts them by label', async () => {
    const page = await loadConfiguredTagsIndex();

    expect(page.tags).toEqual([
      { label: 'API Design', slug: 'api-design', serviceCount: 1 },
      { label: 'Backend', slug: 'backend', serviceCount: 1 },
      { label: 'Payments', slug: 'payments', serviceCount: 2 },
    ]);
  });
});

describe('loadConfiguredTagPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());
  });

  it('loads one tag page and returns matching services sorted by name', async () => {
    const page = await loadConfiguredTagPage('payments');

    expect(page?.tag).toEqual({
      label: 'Payments',
      slug: 'payments',
      serviceCount: 2,
    });
    expect(page?.services.map((service) => service.data.name)).toEqual(['Alpha Service', 'Beta Service']);
  });

  it('returns undefined when the tag does not exist', async () => {
    const page = await loadConfiguredTagPage('does-not-exist');

    expect(page).toBeUndefined();
  });

  it('returns undefined when no tag slug is provided', async () => {
    const page = await loadConfiguredTagPage(undefined);

    expect(page).toBeUndefined();
  });
});
