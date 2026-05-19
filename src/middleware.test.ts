import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:middleware', () => ({
  defineMiddleware: (handler: unknown) => handler,
}));

type MiddlewareContext = { request: Request };
type Next = () => Promise<Response>;
type Middleware = (context: MiddlewareContext, next: Next) => Promise<Response>;

const NEXT_SENTINEL_STATUS = 299;
const next: Next = () => Promise.resolve(new Response('next-called', { status: NEXT_SENTINEL_STATUS }));

function ctx(path: string, headers: Record<string, string> = {}): MiddlewareContext {
  return { request: new Request(`http://localhost${path}`, { headers }) };
}

async function loadOnRequest(): Promise<Middleware> {
  const mod = await import('./middleware');
  return mod.onRequest as unknown as Middleware;
}

describe('middleware health bypass', () => {
  beforeEach(() => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.LOCAL_CATALOG_PATH;
    delete process.env.AUTH_MODE;
    delete process.env.BASIC_AUTH_ENABLED;
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
    delete process.env.AUTH_OIDC_TENANT_ID;
    delete process.env.AUTH_OIDC_CLIENT_ID;
    delete process.env.AUTH_OIDC_CLIENT_SECRET;
    delete process.env.AUTH_OIDC_REDIRECT_URI;
    delete process.env.AUTH_SESSION_SECRET;
  });

  function setValidOidcEnv() {
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = 'a'.repeat(44);
  }

  it('bypasses basic auth for /health/live', async () => {
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'u';
    process.env.BASIC_AUTH_PASSWORD = 'p';
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/health/live'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });

  it('bypasses basic auth for /health/ready', async () => {
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'u';
    process.env.BASIC_AUTH_PASSWORD = 'p';
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/health/ready'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });

  it('bypasses OIDC for /health/live', async () => {
    setValidOidcEnv();
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/health/live'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });

  it('bypasses OIDC for /health/ready', async () => {
    setValidOidcEnv();
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/health/ready'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });

  it('bypasses /health/live even when OIDC config is missing entirely', async () => {
    process.env.AUTH_MODE = 'oidc';
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/health/live'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });

  it('still challenges non-health paths in basic mode (baseline)', async () => {
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'u';
    process.env.BASIC_AUTH_PASSWORD = 'p';
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/'), next);
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Basic realm="servdir"');
  });

  it('returns 501 on non-health paths in oidc mode (baseline)', async () => {
    setValidOidcEnv();
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/'), next);
    expect(res.status).toBe(501);
  });
});
