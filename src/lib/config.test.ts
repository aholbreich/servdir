import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getConfig', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.APP_BUILD_VERSION;
    delete process.env.CATALOG_TITLE;
    delete process.env.GIT_SYNC_INTERVAL;
    delete process.env.GIT_SOURCE_CATALOG_MAIN;
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
    process.env.GIT_SYNC_INTERVAL = '15s';
    const { getConfig } = await import('./config');
    expect(getConfig().appBuildVersion).toBe('v0.3.1 · sha-635bfd6');
    expect(getConfig().catalogTitle).toBe('Platform Service Catalog');
    expect(getConfig().gitSyncIntervalMs).toBe(15000);
  });

  it('parses GIT_SOURCE_* env vars into git sources', async () => {
    process.env.GIT_SOURCE_CATALOG_MAIN = 'git@bitbucket.org:example/service-catalog.git|main|services';
    const { getConfig } = await import('./config');
    expect(getConfig().gitSources).toEqual([
      {
        name: 'catalog-main',
        repoUrl: 'git@bitbucket.org:example/service-catalog.git',
        branch: 'main',
        checkoutPath: 'catalog-cache/catalog-main-1',
        scanPaths: ['services'],
      },
    ]);
  });

  it('parses GIT_SOURCE_* without scanPaths as undefined', async () => {
    process.env.GIT_SOURCE_CATALOG_MAIN = 'git@bitbucket.org:example/service-catalog.git|main';
    const { getConfig } = await import('./config');
    expect(getConfig().gitSources).toEqual([
      {
        name: 'catalog-main',
        repoUrl: 'git@bitbucket.org:example/service-catalog.git',
        branch: 'main',
        checkoutPath: 'catalog-cache/catalog-main-1',
        scanPaths: undefined,
      },
    ]);
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

  it('recovers after an earlier invalid config once env values become valid', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.BASIC_AUTH_ENABLED = 'true';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'ENC[AES256_GCM,data:example]';
    const { getConfig } = await import('./config');

    expect(() => getConfig()).toThrow('Encrypted secret placeholder detected in runtime env');

    process.env.BASIC_AUTH_PASSWORD = 'real-secret';

    expect(getConfig().basicAuth).toEqual({
      enabled: true,
      username: 'dev',
      password: 'real-secret',
    });
  });
});
