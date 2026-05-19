import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/oidc', () => ({
  buildLoginRedirect: vi.fn(async (_cfg: unknown, returnTo: string) => ({
    txCookie: '__servdir_oidc_tx=fake-tx-token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600',
    redirectUrl: `https://login.test/authorize?state=fake&return_to_echo=${encodeURIComponent(returnTo)}`,
  })),
}));

type LoginHandler = (ctx: { request: Request }) => Promise<Response>;

async function loadHandler(): Promise<LoginHandler> {
  const mod = await import('@/pages/auth/login');
  return mod.GET as unknown as LoginHandler;
}

function req(path: string): { request: Request } {
  return { request: new Request(`http://localhost${path}`) };
}

beforeEach(() => {
  process.env.LOCAL_CATALOG_PATH = './catalog';
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.LOCAL_CATALOG_PATH;
  delete process.env.AUTH_MODE;
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

describe('GET /auth/login', () => {
  it('returns 404 when AUTH_MODE is not oidc', async () => {
    process.env.AUTH_MODE = 'none';
    const GET = await loadHandler();
    const res = await GET(req('/auth/login'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when AUTH_MODE is basic', async () => {
    process.env.AUTH_MODE = 'basic';
    process.env.BASIC_AUTH_USERNAME = 'u';
    process.env.BASIC_AUTH_PASSWORD = 'p';
    const GET = await loadHandler();
    const res = await GET(req('/auth/login'));
    expect(res.status).toBe(404);
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;
  });

  it('returns 302 with Location and Set-Cookie when oidc is configured', async () => {
    setValidOidcEnv();
    const GET = await loadHandler();
    const res = await GET(req('/auth/login'));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('https://login.test/authorize');
    expect(res.headers.get('Set-Cookie')).toContain('__servdir_oidc_tx=');
    expect(res.headers.get('Set-Cookie')).toContain('HttpOnly');
  });

  it('passes return_to through to buildLoginRedirect', async () => {
    setValidOidcEnv();
    const GET = await loadHandler();
    const oidc = await import('@/lib/auth/oidc');
    await GET(req('/auth/login?return_to=/services/foo'));
    expect(oidc.buildLoginRedirect).toHaveBeenCalledWith(expect.any(Object), '/services/foo');
  });

  it('defaults return_to to / when not provided', async () => {
    setValidOidcEnv();
    const GET = await loadHandler();
    const oidc = await import('@/lib/auth/oidc');
    await GET(req('/auth/login'));
    expect(oidc.buildLoginRedirect).toHaveBeenCalledWith(expect.any(Object), '/');
  });
});
