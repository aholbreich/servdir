import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCatalogFromSources } from './load';

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
  delete process.env.GIT_SOURCE_CATALOG_MAIN;
});

describe('loadCatalogFromSources', () => {
  it('loads and sorts services by name', async () => {
    await writeService(
      'services/zeta/service.md',
      `---\nid: zeta\nname: Zeta Service\nowner: team-z\nlifecycle: production\nrepo: https://example.com/zeta\n---\n\n# Zeta\n`,
    );

    await writeService(
      'services/alpha/service.md',
      `---\nid: alpha\nname: Alpha Service\nowner: team-a\nlifecycle: production\nrepo: https://example.com/alpha\n---\n\n# Alpha\n`,
    );

    const catalog = await loadCatalogFromSources(tempDir);

    expect(catalog.services.map((service) => service.data.name)).toEqual(['Alpha Service', 'Zeta Service']);
    expect(catalog.servicesById.get('alpha')?.data.owner).toBe('team-a');
    expect(catalog.snapshotStatus).toBe('fresh');
  });

  it('keeps invalid services in the catalog and records validation issues', async () => {
    await writeService(
      'services/broken/service.md',
      `---\nid: broken\nname: Broken Service\nowner: team-x\nlifecycle: production\nrepo: not-a-url\ndepends_on:\n  - missing-service\n---\n\n# Broken\n`,
    );

    const catalog = await loadCatalogFromSources(tempDir);
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
    expect(catalog.snapshotStatus).toBe('fresh');
  });

  it('loads a single-repo definition from .servdir.md in the local catalog root', async () => {
    await writeService(
      '.servdir.md',
      `---\nid: servdir\nname: Servdir\nkind: application\nowner: team-platform\nlifecycle: production\nrepo: https://example.com/servdir\n---\n\n# Servdir\n`,
    );

    const catalog = await loadCatalogFromSources(tempDir);

    expect(catalog.services).toHaveLength(1);
    expect(catalog.services[0]?.filePath).toContain('.servdir.md');
    expect(catalog.services[0]?.data.id).toBe('servdir');
    expect(catalog.services[0]?.data.kind).toBe('application');
    expect(catalog.snapshotStatus).toBe('fresh');
  });

  it('loads a single-repo definition from .servdir.md in a git scan root', async () => {
    process.env.GIT_SOURCE_CATALOG_MAIN = 'git@bitbucket.org:example/service-catalog.git|main';

    await writeService(
      'git-checkout/.servdir.md',
      `---\nid: flux-gitops\nname: Flux GitOps\nkind: iac\nowner: devops\nlifecycle: production\nrepo: https://example.com/flux-gitops\n---\n\n# Flux GitOps\n`,
    );
    await fs.mkdir(path.join(tempDir, 'git-checkout', '.git'), { recursive: true });

    const catalog = await loadCatalogFromSources(undefined, {
      gitSources: [
        {
          name: 'catalog-main',
          repoUrl: 'git@bitbucket.org:example/service-catalog.git',
          branch: 'main',
          checkoutPath: path.join(tempDir, 'git-checkout'),
          scanPaths: [],
        },
      ],
    });

    expect(catalog.services).toHaveLength(1);
    expect(catalog.services[0]?.filePath).toContain('.servdir.md');
    expect(catalog.services[0]?.data.id).toBe('flux-gitops');
    expect(catalog.snapshotStatus).toBe('fresh');
  });

  it('keeps git-backed services with validation issues in the catalog snapshot', async () => {
    process.env.GIT_SOURCE_CATALOG_MAIN = 'git@bitbucket.org:example/service-catalog.git|main|services';

    await writeService(
      'git-checkout/services/broken/service.md',
      `---\nid: broken\nname: Broken Service\nowner: team-x\nlifecycle: production\nrepo: not-a-url\n---\n\n# Broken\n`,
    );
    await fs.mkdir(path.join(tempDir, 'git-checkout', '.git'), { recursive: true });

    const catalog = await loadCatalogFromSources(undefined, {
      gitSources: [
        {
          name: 'catalog-main',
          repoUrl: 'git@bitbucket.org:example/service-catalog.git',
          branch: 'main',
          checkoutPath: path.join(tempDir, 'git-checkout'),
          scanPaths: ['services'],
        },
      ],
    });

    expect(catalog.services).toHaveLength(1);
    expect(catalog.snapshotStatus).toBe('fresh');
    expect(catalog.services[0]?.issues).toEqual([
      {
        level: 'error',
        message: 'repo: Invalid URL',
      },
    ]);
  });

  it('reuses the in-memory snapshot between repeated loads', async () => {
    const localLoadSpy = vi.spyOn(await import('./sources/local'), 'loadLocalServices');

    await writeService(
      'services/alpha/service.md',
      `---\nid: alpha\nname: Alpha Service\nowner: team-a\nlifecycle: production\nrepo: https://example.com/alpha\n---\n\n# Alpha\n`,
    );

    const first = await loadCatalogFromSources(tempDir);
    const second = await loadCatalogFromSources(tempDir);

    expect(first.services).toHaveLength(1);
    expect(second.services).toHaveLength(1);
    expect(localLoadSpy).toHaveBeenCalledTimes(1);

    localLoadSpy.mockRestore();
  });
});
