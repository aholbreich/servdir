import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { handleCallbackMock } = vi.hoisted(() => ({ handleCallbackMock: vi.fn() }));

vi.mock('@/lib/auth/oidc', () => ({
  handleCallback: handleCallbackMock,
}));

type CallbackHandler = (ctx: { request: Request }) => Promise<Response>;

async function loadHandler(): Promise<CallbackHandler> {
  const mod = await import('@/pages/auth/callback');
  return mod.GET as unknown as CallbackHandler;
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

describe('GET /auth/callback', () => {
  it('returns 404 when AUTH_MODE is not oidc', async () => {
    process.env.AUTH_MODE = 'none';
    const GET = await loadHandler();
    const res = await GET(req('/auth/callback?code=x&state=y'));
    expect(res.status).toBe(404);
    expect(handleCallbackMock).not.toHaveBeenCalled();
  });

  it('returns 302 with Location and two Set-Cookie headers on success', async () => {
    setValidOidcEnv();
    handleCallbackMock.mockResolvedValueOnce({
      ok: true,
      sessionToken: 'fake-session-token',
      sessionCookie: '__servdir_session=opaque; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800',
      txCookieClear: '__servdir_oidc_tx=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      returnTo: '/services/foo',
      user: { sub: 'u', email: 'e', name: 'n' },
    });

    const GET = await loadHandler();
    const res = await GET(req('/auth/callback?code=x&state=y'));

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/services/foo');

    const setCookieValues = res.headers.getSetCookie();
    expect(setCookieValues).toHaveLength(2);
    expect(setCookieValues.some((s) => s.includes('__servdir_session=opaque'))).toBe(true);
    expect(setCookieValues.some((s) => s.includes('__servdir_oidc_tx=') && s.includes('Max-Age=0'))).toBe(true);
  });

  it('returns 400 on tx_missing failure', async () => {
    setValidOidcEnv();
    handleCallbackMock.mockResolvedValueOnce({ ok: false, reason: 'tx_missing', status: 400 });

    const GET = await loadHandler();
    const res = await GET(req('/auth/callback?code=x&state=y'));

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('tx_missing');
  });

  it('returns 403 on tenant_mismatch failure', async () => {
    setValidOidcEnv();
    handleCallbackMock.mockResolvedValueOnce({ ok: false, reason: 'tenant_mismatch', status: 403 });

    const GET = await loadHandler();
    const res = await GET(req('/auth/callback?code=x&state=y'));

    expect(res.status).toBe(403);
    expect(await res.text()).toContain('tenant_mismatch');
  });

  it('forwards request as-is to handleCallback (with cookie + query intact)', async () => {
    setValidOidcEnv();
    handleCallbackMock.mockResolvedValueOnce({ ok: false, reason: 'state_mismatch', status: 400 });

    const GET = await loadHandler();
    const request = new Request('http://localhost/auth/callback?code=abc&state=xyz', {
      headers: { cookie: '__servdir_oidc_tx=encoded-token' },
    });
    await GET({ request });

    expect(handleCallbackMock).toHaveBeenCalledTimes(1);
    const passedRequest = handleCallbackMock.mock.calls[0][1] as Request;
    expect(new URL(passedRequest.url).searchParams.get('code')).toBe('abc');
    expect(passedRequest.headers.get('cookie')).toContain('__servdir_oidc_tx=encoded-token');
  });
});
