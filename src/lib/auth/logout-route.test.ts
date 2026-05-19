import { afterEach, describe, expect, it, vi } from 'vitest';

type Locals = { user?: { sub: string; email: string; name: string } };
type LogoutHandler = (ctx: { locals: Locals }) => Promise<Response>;

async function loadHandler(): Promise<LogoutHandler> {
  const mod = await import('@/pages/auth/logout');
  return mod.POST as unknown as LogoutHandler;
}

afterEach(() => {
  vi.resetModules();
});

describe('POST /auth/logout', () => {
  it('clears the session cookie and redirects to /', async () => {
    const POST = await loadHandler();
    const res = await POST({ locals: { user: { sub: 'u', email: 'e', name: 'n' } } });

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain('__servdir_session=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
  });

  it('also works without a current user (idempotent)', async () => {
    const POST = await loadHandler();
    const res = await POST({ locals: {} });
    expect(res.status).toBe(302);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
