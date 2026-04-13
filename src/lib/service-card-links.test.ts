import { describe, expect, it } from 'vitest';

import { getServiceCardLinks } from './service-card-links';

describe('getServiceCardLinks', () => {
  it('returns stable first-class card links in a predictable order', () => {
    const links = getServiceCardLinks({
      id: 'billing-api',
      name: 'Billing API',
      kind: 'service',
      owner: 'team-payments',
      lifecycle: 'production',
      repo: 'https://example.com/repo',
      runbook: 'https://example.com/runbook',
      openapi: [{ label: 'Public API', url: 'https://example.com/openapi.yaml' }],
      delivery: [{ label: 'GitHub Actions', url: 'https://example.com/actions' }],
    });

    expect(links).toEqual([
      { kind: 'repository', href: 'https://example.com/repo', label: 'Repository' },
      { kind: 'runbook', href: 'https://example.com/runbook', label: 'Runbook' },
      { kind: 'openapi', href: 'https://example.com/openapi.yaml', label: 'Public API' },
      { kind: 'delivery', href: 'https://example.com/actions', label: 'GitHub Actions' },
    ]);
  });

  it('ignores free-form links and delivery entries without urls', () => {
    const links = getServiceCardLinks({
      id: 'adr-tool',
      name: 'ADR Tool',
      kind: 'tool',
      owner: 'team-platform',
      lifecycle: 'experimental',
      repo: 'https://example.com/repo',
      links: [{ label: 'Docs', url: 'https://example.com/docs' }],
      delivery: [{ label: 'Managed elsewhere', text: 'See infra repo' }],
    });

    expect(links).toEqual([{ kind: 'repository', href: 'https://example.com/repo', label: 'Repository' }]);
  });
});
