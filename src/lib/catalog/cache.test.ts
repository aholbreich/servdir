import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCatalogCache, getCatalogCacheEntry, refreshCatalogCache } from './cache';

let tempDir: string;

async function writeService(relativePath: string, content: string): Promise<void> {
  const filePath = path.join(tempDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'servdir-cache-test-'));
  clearCatalogCache();
});

afterEach(async () => {
  clearCatalogCache();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

describe('catalog cache', () => {
  it('stores refresh metadata for a successful refresh', async () => {
    await writeService(
      'services/alpha/service.md',
      `---\nid: alpha\nname: Alpha Service\nowner: team-a\nlifecycle: production\nrepo: https://example.com/alpha\n---\n\n# Alpha\n`,
    );

    const catalog = await refreshCatalogCache(tempDir, []);
    const entry = getCatalogCacheEntry(tempDir, []);

    expect(catalog.snapshotStatus).toBe('fresh');
    expect(entry?.catalog?.services).toHaveLength(1);
    expect(entry?.lastRefreshStartedAt).toBeDefined();
    expect(entry?.lastRefreshFinishedAt).toBeDefined();
    expect(entry?.lastSuccessfulRefreshAt).toBeDefined();
    expect(entry?.lastRefreshError).toBeUndefined();
  });

  it('keeps the last known good catalog when a later refresh fails', async () => {
    await writeService(
      'services/alpha/service.md',
      `---\nid: alpha\nname: Alpha Service\nowner: team-a\nlifecycle: production\nrepo: https://example.com/alpha\n---\n\n# Alpha\n`,
    );

    const first = await refreshCatalogCache(tempDir, []);
    expect(first.snapshotStatus).toBe('fresh');

    const localSources = await import('./sources/local');
    const loadSpy = vi.spyOn(localSources, 'loadLocalServices').mockRejectedValueOnce(new Error('simulated refresh failure'));

    const second = await refreshCatalogCache(tempDir, []);
    const entry = getCatalogCacheEntry(tempDir, []);

    expect(second.snapshotStatus).toBe('stale');
    expect(second.snapshotError).toBe('simulated refresh failure');
    expect(entry?.catalog?.services).toHaveLength(1);
    expect(entry?.lastRefreshError).toBe('simulated refresh failure');

    loadSpy.mockRestore();
  });
});
