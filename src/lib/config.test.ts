import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getConfig', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.APP_BUILD_VERSION;
    delete process.env.CATALOG_TITLE;
    delete process.env.GIT_SYNC_INTERVAL_MS;
    delete process.env.GIT_SOURCES;
    delete process.env.LOCAL_CATALOG_PATH;
    delete process.env.BASIC_AUTH_ENABLED;
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
  });

  it('uses a default build version, catalog title and git sync interval', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    const { getConfig } = await import('./config');
    expect(getConfig().appBuildVersion).toBe('v0.0.1 · sha-local');
    expect(getConfig().catalogTitle).toBe('Service Catalog');
    expect(getConfig().gitSyncIntervalMs).toBe(60000);
  });

  it('parses a custom build version, catalog title and git sync interval', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.APP_BUILD_VERSION = 'v0.3.1 · sha-635bfd6';
    process.env.CATALOG_TITLE = 'Platform Service Catalog';
    process.env.GIT_SYNC_INTERVAL_MS = '15000';
    const { getConfig } = await import('./config');
    expect(getConfig().appBuildVersion).toBe('v0.3.1 · sha-635bfd6');
    expect(getConfig().catalogTitle).toBe('Platform Service Catalog');
    expect(getConfig().gitSyncIntervalMs).toBe(15000);
  });

  it('fails fast when no catalog source is configured', async () => {
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('at least one catalog source must be configured');
  });

  it('fails when basic auth is enabled but credentials are missing', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.BASIC_AUTH_ENABLED = 'true';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('Basic auth enabled, but username/password missing');
  });

  it('fails when encrypted secret placeholders reach runtime env', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.BASIC_AUTH_ENABLED = 'true';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'ENC[AES256_GCM,data:example]';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('Encrypted secret placeholder detected in runtime env');
  });
});
