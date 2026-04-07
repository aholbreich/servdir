import { describe, expect, it } from 'vitest';
import { parseServiceContent } from './parse';

describe('parseServiceContent', () => {
  it('parses raw markdown content into a service record', () => {
    const service = parseServiceContent({
      filePath: '/tmp/catalog-source/services/billing-api/service.md',
      raw: `---\nid: billing-api\nname: Billing API\nowner: team-payments\nlifecycle: production\nrepo: https://example.com/billing-api\n---\n\n# Billing API\n`,
    });

    expect(service.filePath).toContain('/tmp/catalog-source');
    expect(service.data.id).toBe('billing-api');
    expect(service.slug).toBe('billing-api');
    expect(service.issues).toEqual([]);
  });
});
