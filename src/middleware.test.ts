import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signSession } from './lib/auth/session';
import { SESSION_COOKIE_NAME } from './lib/auth/cookies';

vi.mock('astro:middleware', () => ({
  defineMiddleware: (handler: unknown) => handler,
}));

type Locals = { user?: { sub: string; email: string; name: string } };
type MiddlewareContext = { request: Request; locals: Locals };
type Next = () => Promise<Response>;
type Middleware = (context: MiddlewareContext, next: Next) => Promise<Response>;

const NEXT_SENTINEL_STATUS = 299;
const next: Next = () => Promise.resolve(new Response('next-called', { status: NEXT_SENTINEL_STATUS }));

function ctx(path: string, headers: Record<string, string> = {}): MiddlewareContext {
  return { request: new Request(`http://localhost${path}`, { headers }), locals: {} };
}

async function loadOnRequest(): Promise<Middleware> {
  const mod = await import('./middleware');
  return mod.onRequest as unknown as Middleware;
}

const SESSION_SECRET = 'a'.repeat(44);

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
    process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
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

  it('bypasses OIDC for /auth/login (login route must run unauthenticated)', async () => {
    setValidOidcEnv();
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/auth/login'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });

  it('bypasses OIDC for /auth/callback', async () => {
    setValidOidcEnv();
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/auth/callback?code=x&state=y'), next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
  });
});

describe('middleware oidc session check', () => {
  beforeEach(() => {
    process.env.LOCAL_CATALOG_PATH = './catalog';
    process.env.AUTH_MODE = 'oidc';
    process.env.AUTH_OIDC_TENANT_ID = 't';
    process.env.AUTH_OIDC_CLIENT_ID = 'c';
    process.env.AUTH_OIDC_CLIENT_SECRET = 's';
    process.env.AUTH_OIDC_REDIRECT_URI = 'https://example.com/auth/callback';
    process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.LOCAL_CATALOG_PATH;
    delete process.env.AUTH_MODE;
    delete process.env.AUTH_OIDC_TENANT_ID;
    delete process.env.AUTH_OIDC_CLIENT_ID;
    delete process.env.AUTH_OIDC_CLIENT_SECRET;
    delete process.env.AUTH_OIDC_REDIRECT_URI;
    delete process.env.AUTH_SESSION_SECRET;
  });

  async function validSessionCookieHeader(): Promise<string> {
    const token = await signSession({ sub: 'u-1', email: 'a@b.com', name: 'Alice' }, SESSION_SECRET, 3600);
    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
  }

  it('redirects unauthenticated browser GET to /auth/login with return_to', async () => {
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/services/foo?bar=baz', { accept: 'text/html' }), next);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(`/auth/login?return_to=${encodeURIComponent('/services/foo?bar=baz')}`);
  });

  it('returns 401 JSON for an unauthenticated API request', async () => {
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/api/services', { accept: 'application/json' }), next);
    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({ error: 'unauthenticated' });
  });

  it('treats Accept-less GET as a browser request (HTML default)', async () => {
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/'), next);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/auth/login');
  });

  it('passes through when a valid session cookie is present and populates locals.user', async () => {
    const cookie = await validSessionCookieHeader();
    const context = ctx('/services/foo', { accept: 'text/html', cookie });
    const onRequest = await loadOnRequest();
    const res = await onRequest(context, next);
    expect(res.status).toBe(NEXT_SENTINEL_STATUS);
    expect(context.locals.user).toEqual({ sub: 'u-1', email: 'a@b.com', name: 'Alice' });
  });

  it('rejects a tampered session cookie', async () => {
    const token = await signSession({ sub: 'u-1', email: 'a@b.com', name: 'Alice' }, SESSION_SECRET, 3600);
    const tampered = token.slice(0, -2) + 'XX';
    const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(tampered)}`;
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/services/foo', { accept: 'text/html', cookie }), next);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/auth/login');
  });

  it('rejects a session cookie signed with a different secret', async () => {
    const token = await signSession({ sub: 'u-1', email: 'a@b.com', name: 'Alice' }, 'b'.repeat(44), 3600);
    const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
    const onRequest = await loadOnRequest();
    const res = await onRequest(ctx('/services/foo', { accept: 'application/json', cookie }), next);
    expect(res.status).toBe(401);
  });
});
