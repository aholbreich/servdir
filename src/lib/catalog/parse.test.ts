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
    expect(service.data.kind).toBe('service');
    expect(service.slug).toBe('billing-api');
    expect(service.issues).toEqual([]);
  });

  it('uses an explicitly provided kind when present', () => {
    const service = parseServiceContent({
      filePath: '/tmp/catalog-source/services/servdir/service.md',
      raw: `---\nid: servdir\nname: Servdir\nkind: application\nowner: team-platform\nlifecycle: experimental\nrepo: https://example.com/servdir\n---\n\n# Servdir\n`,
    });

    expect(service.data.kind).toBe('application');
  });
});
