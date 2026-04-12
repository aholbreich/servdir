import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Catalog } from './types';
import { loadConfiguredServicePage } from './service-page';

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
      depends_on: ['beta', 'missing'],
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
    },
    issues: [],
  };

  return {
    generatedAt: new Date().toISOString(),
    services: [alpha, beta],
    servicesById: new Map([
      ['alpha', alpha],
      ['beta', beta],
    ]),
    snapshotStatus: 'fresh',
  };
}

describe('loadConfiguredServicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a service by slug and resolves dependencies', async () => {
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());

    const page = await loadConfiguredServicePage('alpha-service');

    expect(page?.service.data.id).toBe('alpha');
    expect(page?.dependencies).toEqual([
      expect.objectContaining({ id: 'beta', service: expect.objectContaining({ data: expect.objectContaining({ id: 'beta' }) }) }),
      { id: 'missing', service: undefined },
    ]);
  });

  it('loads a service by id', async () => {
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());

    const page = await loadConfiguredServicePage('alpha');

    expect(page?.service.slug).toBe('alpha-service');
  });

  it('returns undefined when the service is not found', async () => {
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());

    const page = await loadConfiguredServicePage('does-not-exist');

    expect(page).toBeUndefined();
  });

  it('returns undefined when no id or slug is provided', async () => {
    vi.mocked(loadConfiguredCatalog).mockResolvedValue(createCatalog());

    const page = await loadConfiguredServicePage(undefined);

    expect(page).toBeUndefined();
  });
});
