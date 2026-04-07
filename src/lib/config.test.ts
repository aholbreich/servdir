import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getConfig', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.GIT_SYNC_INTERVAL_MS;
    delete process.env.GIT_SOURCES;
    delete process.env.CATALOG_PATH;
    delete process.env.HOST;
    delete process.env.PORT;
    delete process.env.BASIC_AUTH_ENABLED;
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
  });

  it('uses a default git sync interval', async () => {
    const { getConfig } = await import('./config');
    expect(getConfig().gitSyncIntervalMs).toBe(60000);
  });

  it('parses a custom git sync interval', async () => {
    process.env.GIT_SYNC_INTERVAL_MS = '15000';
    const { getConfig } = await import('./config');
    expect(getConfig().gitSyncIntervalMs).toBe(15000);
  });
});
