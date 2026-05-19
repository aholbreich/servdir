import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getConfig', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.APP_BUILD_VERSION;
    delete process.env.CATALOG_TITLE;
    delete process.env.GIT_SYNC_INTERVAL;
    delete process.env.GIT_SOURCE_CATALOG_MAIN;
    delete process.env.LOCAL_CATALOG_PATH;
    delete process.env.LOG_FORMAT;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_COLOR;
    delete process.env.AUTH_MODE;
    delete process.env.BASIC_AUTH_ENABLED;
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
    delete process.env.AUTH_OIDC_TENANT_ID;
    delete process.env.AUTH_OIDC_CLIENT_ID;
    delete process.env.AUTH_OIDC_CLIENT_SECRET;
    delete process.env.AUTH_OIDC_REDIRECT_URI;
    delete process.env.AUTH_SESSION_SECRET;
    delete process.env.AUTH_SESSION_TTL_HOURS;
  });

  it('uses a default build version, catalog title and git sync interval', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    const { getConfig } = await import('./config');
    expect(getConfig().appBuildVersion).toBe('v0.0.1 · sha-local');
    expect(getConfig().catalogTitle).toBe('Service Catalog');
    expect(getConfig().gitSyncIntervalMs).toBe(60000);
    expect(getConfig().logFormat).toBe('text');
    expect(getConfig().logLevel).toBe('info');
    expect(getConfig().logColor).toBe('auto');
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

  it('parses an optional LOG_FORMAT setting', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.LOG_FORMAT = 'json';
    const { getConfig } = await import('./config');

    expect(getConfig().logFormat).toBe('json');
  });

  it('parses an optional LOG_LEVEL setting', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.LOG_LEVEL = 'debug';
    const { getConfig } = await import('./config');

    expect(getConfig().logLevel).toBe('debug');
  });

  it('parses an optional LOG_COLOR setting', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.LOG_COLOR = 'false';
    const { getConfig } = await import('./config');

    expect(getConfig().logColor).toBe('false');
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

  it('defaults auth mode to none when AUTH_MODE is unset', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    const { getConfig } = await import('./config');
    expect(getConfig().auth).toEqual({ mode: 'none' });
  });

  it('parses AUTH_MODE=basic with credentials', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'secret';
    const { getConfig } = await import('./config');
    expect(getConfig().auth).toEqual({ mode: 'basic', username: 'dev', password: 'secret' });
  });

  it('fails when AUTH_MODE=basic but credentials are missing', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'basic';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('Basic auth enabled, but username/password missing');
  });

  it('fails when encrypted secret placeholders reach runtime env', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'ENC[AES256_GCM,data:example]';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('Encrypted secret placeholder detected in runtime env');
  });

  it('recovers after an earlier invalid config once env values become valid', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'ENC[AES256_GCM,data:example]';
    const { getConfig } = await import('./config');

    expect(() => getConfig()).toThrow('Encrypted secret placeholder detected in runtime env');

    process.env.BASIC_AUTH_PASSWORD = 'real-secret';

    expect(getConfig().auth).toEqual({
      mode: 'basic',
      username: 'dev',
      password: 'real-secret',
    });
  });

  it('infers AUTH_MODE=basic from legacy BASIC_AUTH_ENABLED=true', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.BASIC_AUTH_ENABLED = 'true';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'secret';
    const { getConfig } = await import('./config');
    expect(getConfig().auth).toEqual({ mode: 'basic', username: 'dev', password: 'secret' });
  });

  it('does not infer basic mode when AUTH_MODE is explicitly none', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'none';
    process.env.BASIC_AUTH_ENABLED = 'true';
    process.env.BASIC_AUTH_USERNAME = 'dev';
    process.env.BASIC_AUTH_PASSWORD = 'secret';
    const { getConfig } = await import('./config');
    expect(getConfig().auth).toEqual({ mode: 'none' });
  });

  it('parses AUTH_MODE=oidc carrying all env vars through', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 'tenant-1';
    process.env.AUTH_OIDC_CLIENT_ID = 'client-1';
    process.env.AUTH_OIDC_CLIENT_SECRET = 'super-secret';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = 'a'.repeat(44);
    const { getConfig } = await import('./config');
    expect(getConfig().auth).toEqual({
      mode: 'oidc',
      tenantId: 'tenant-1',
      clientId: 'client-1',
      clientSecret: 'super-secret',
      redirectUri: 'https://example.com/auth/callback',
      sessionSecret: 'a'.repeat(44),
      sessionTtlHours: 8,
    });
  });

  it('rejects AUTH_MODE=oidc when required env vars are missing', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow(/Missing required OIDC config: AUTH_OIDC_TENANT_ID, AUTH_OIDC_CLIENT_ID, AUTH_OIDC_CLIENT_SECRET, AUTH_OIDC_REDIRECT_URI, AUTH_SESSION_SECRET/);
  });

  it('rejects AUTH_MODE=oidc when only some required env vars are missing', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow(/Missing required OIDC config: AUTH_SESSION_SECRET/);
  });

  it('rejects AUTH_MODE=oidc with a too-short AUTH_SESSION_SECRET', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = 'too-short';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow(/AUTH_SESSION_SECRET must decode to at least 32 bytes/);
  });

  it('rejects AUTH_MODE=oidc with an invalid AUTH_OIDC_REDIRECT_URI', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'not-a-url';
    process.env.AUTH_SESSION_SECRET = 'a'.repeat(44);
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow(/AUTH_OIDC_REDIRECT_URI is not a valid URL/);
  });

  it('rejects AUTH_MODE=oidc when secrets are still encrypted placeholders', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 'ENC[AES256_GCM,data:example]';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = 'a'.repeat(44);
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow(/Encrypted secret placeholder detected/);
  });

  it('accepts a custom AUTH_SESSION_TTL_HOURS', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = 'a'.repeat(44);
    process.env.AUTH_SESSION_TTL_HOURS = '2';
    const { getConfig } = await import('./config');
    expect((getConfig().auth as { sessionTtlHours: number }).sessionTtlHours).toBe(2);
  });

  it('rejects a non-positive AUTH_SESSION_TTL_HOURS', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = 'a'.repeat(44);
    process.env.AUTH_SESSION_TTL_HOURS = '0';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow(/AUTH_SESSION_TTL_HOURS must be a positive number/);
  });

  it('rejects unknown AUTH_MODE values', async () => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'kerberos';
    const { getConfig } = await import('./config');
    expect(() => getConfig()).toThrow('Invalid AUTH_MODE');
  });
});
