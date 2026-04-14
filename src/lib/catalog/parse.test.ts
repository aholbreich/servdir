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

  it('parses a structured tech_stack when present', () => {
    const service = parseServiceContent({
      filePath: '/tmp/catalog-source/services/care-api/service.md',
      raw: `---\nid: care-api\nname: Care API\nowner: team-care\nlifecycle: production\nrepo: https://example.com/care-api\ntech_stack:\n  languages:\n    - java\n  frameworks:\n    - spring\n  data:\n    - mariadb\n  platform:\n    - kubernetes\n    - keycloak\n  tooling:\n    - maven\n---\n\n# Care API\n`,
    });

    expect(service.data.tech_stack).toEqual({
      languages: ['java'],
      frameworks: ['spring'],
      data: ['mariadb'],
      platform: ['kubernetes', 'keycloak'],
      tooling: ['maven'],
    });
    expect(service.issues).toEqual([]);
  });

  it('keeps a best-effort tech_stack when other validation fails', () => {
    const service = parseServiceContent({
      filePath: '/tmp/catalog-source/services/care-api/service.md',
      raw: `---\nid: care-api\nname: Care API\nowner: team-care\nlifecycle: production\nrepo: not-a-url\ntech_stack:\n  languages:\n    - java\n  frameworks:\n    - spring\n---\n\n# Care API\n`,
    });

    expect(service.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: 'repo: Invalid URL',
        }),
      ]),
    );
    expect(service.data.tech_stack).toEqual({
      languages: ['java'],
      frameworks: ['spring'],
      data: undefined,
      platform: undefined,
      tooling: undefined,
    });
  });
});
