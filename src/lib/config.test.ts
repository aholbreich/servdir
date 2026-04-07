import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getConfig', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.GIT_SYNC_INTERVAL_MS;
    delete process.env.GIT_SOURCES;
    delete process.env.CATALOG_PATH;
    delete process.env.BASIC_AUTH_ENABLED;
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
  });

  it('uses a default git sync interval', async () => {
    process.env.CATALOG_PATH = './catalog';
    const { getConfig } = await import('./config');
    expect(getConfig().gitSyncIntervalMs).toBe(60000);
  });

  it('parses a custom git sync interval', async () => {
    process.env.CATALOG_PATH = './catalog';
    process.env.GIT_SYNC_INTERVAL_MS = '15000';
    const { getConfig } = await import('./config');
    expect(getConfig().gitSyncIntervalMs).toBe(15000);
  });

  it('fails fast when no catalog source is configured', async () => {
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('at least one catalog source must be configured');
  });
});
