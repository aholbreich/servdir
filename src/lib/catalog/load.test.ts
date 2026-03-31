import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadCatalog } from './load';

let tempDir: string;

async function writeService(relativePath: string, content: string): Promise<void> {
  const filePath = path.join(tempDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'servdir-test-'));
});

afterEach(async () => {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

describe('loadCatalog', () => {
  it('loads and sorts services by name', async () => {
    await writeService(
      'services/zeta/service.md',
      `---\nid: zeta\nname: Zeta Service\nowner: team-z\nlifecycle: production\nrepo: https://example.com/zeta\n---\n\n# Zeta\n`,
    );

    await writeService(
      'services/alpha/service.md',
      `---\nid: alpha\nname: Alpha Service\nowner: team-a\nlifecycle: production\nrepo: https://example.com/alpha\n---\n\n# Alpha\n`,
    );

    const catalog = await loadCatalog(tempDir);

    expect(catalog.services.map((service) => service.data.name)).toEqual(['Alpha Service', 'Zeta Service']);
    expect(catalog.servicesById.get('alpha')?.data.owner).toBe('team-a');
  });

  it('keeps invalid services in the catalog and records validation issues', async () => {
    await writeService(
      'services/broken/service.md',
      `---\nid: broken\nname: Broken Service\nowner: team-x\nlifecycle: production\nrepo: not-a-url\ndepends_on:\n  - missing-service\n---\n\n# Broken\n`,
    );

    const catalog = await loadCatalog(tempDir);
    const service = catalog.services[0];

    expect(service).toBeDefined();
    expect(service?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 'error' }),
        expect.objectContaining({
          level: 'warning',
          message: 'unresolved dependency: missing-service',
        }),
      ]),
    );
  });
});
