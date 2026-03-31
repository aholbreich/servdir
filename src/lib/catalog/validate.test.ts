import { describe, expect, it } from 'vitest';
import { validateCatalog } from './validate';
import type { ServiceRecord } from './types';

function makeService(overrides: Partial<ServiceRecord> & { data?: Partial<ServiceRecord['data']> } = {}): ServiceRecord {
  const data = {
    id: 'billing-api',
    name: 'Billing API',
    owner: 'team-payments',
    lifecycle: 'production',
    repo: 'https://github.com/acme/billing-api',
    ...overrides.data,
  };

  return {
    filePath: '/tmp/service.md',
    slug: data.id,
    body: 'Example body',
    html: '<p>Example body</p>',
    data,
    issues: [],
    ...overrides,
  };
}

describe('validateCatalog', () => {
  it('flags duplicate service ids as errors', () => {
    const first = makeService({ data: { id: 'shared-id', name: 'First' } });
    const second = makeService({ data: { id: 'shared-id', name: 'Second' } });

    const result = validateCatalog([first, second]);

    expect(result[1]?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: 'duplicate service id: shared-id',
        }),
      ]),
    );
  });

  it('warns when a dependency cannot be resolved', () => {
    const service = makeService({ data: { depends_on: ['auth-api'] } });

    const result = validateCatalog([service]);

    expect(result[0]?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warning',
          message: 'unresolved dependency: auth-api',
        }),
      ]),
    );
  });

  it('does not add issues for valid references', () => {
    const auth = makeService({ data: { id: 'auth-api', name: 'Auth API' } });
    const billing = makeService({ data: { id: 'billing-api', depends_on: ['auth-api'] } });

    const result = validateCatalog([auth, billing]);

    expect(result.every((service) => service.issues.length === 0)).toBe(true);
  });
});
