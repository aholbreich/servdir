import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_AUTH_ENDPOINT = 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize';

const { authorizationCodeGrantMock } = vi.hoisted(() => ({
  authorizationCodeGrantMock: vi.fn(),
}));

vi.mock('openid-client', () => ({
  discovery: vi.fn(async () => ({ __fake: 'config' })),
  randomPKCECodeVerifier: vi.fn(() => 'fake-code-verifier'),
  calculatePKCECodeChallenge: vi.fn(async () => 'fake-code-challenge'),
  randomState: vi.fn(() => 'fake-state'),
  randomNonce: vi.fn(() => 'fake-nonce'),
  buildAuthorizationUrl: vi.fn((_config, params) => {
    const url = new URL(FAKE_AUTH_ENDPOINT);
    const entries = params instanceof URLSearchParams ? params : Object.entries(params);
    for (const [k, v] of entries as Iterable<[string, string]>) {
      url.searchParams.set(k, v);
    }
    return url;
  }),
  authorizationCodeGrant: authorizationCodeGrantMock,
}));

import {
  SCOPE,
  TX_TTL_SECONDS,
  _resetDiscoveryCache,
  buildLoginRedirect,
  handleCallback,
  signTxPayload,
  validateReturnTo,
  verifyTxPayload,
  type OidcRuntimeConfig,
  type TxPayload,
} from './oidc';
import { verifySession } from './session';
import { TX_COOKIE_NAME } from './cookies';

const SECRET = 'a'.repeat(44);

const RUNTIME_CONFIG: OidcRuntimeConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://servdir.example.com/auth/callback',
  sessionSecret: SECRET,
  sessionTtlHours: 8,
};

const TX: TxPayload = {
  state: 'fake-state',
  nonce: 'fake-nonce',
  codeVerifier: 'fake-code-verifier',
  returnTo: '/services/foo',
};

beforeEach(() => {
  _resetDiscoveryCache();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('validateReturnTo', () => {
  it('accepts a same-origin relative path', () => {
    expect(validateReturnTo('/services/foo')).toBe('/services/foo');
  });

  it('keeps query string and fragment', () => {
    expect(validateReturnTo('/tags?q=ops#x')).toBe('/tags?q=ops#x');
  });

  it('rejects scheme-relative URLs', () => {
    expect(validateReturnTo('//evil.com/x')).toBe('/');
  });

  it('rejects absolute http(s) URLs', () => {
    expect(validateReturnTo('https://evil.com/x')).toBe('/');
    expect(validateReturnTo('http://evil.com/x')).toBe('/');
  });

  it('rejects paths that do not start with /', () => {
    expect(validateReturnTo('services/foo')).toBe('/');
  });

  it('defaults to / for empty input', () => {
    expect(validateReturnTo('')).toBe('/');
    expect(validateReturnTo(null as unknown as string)).toBe('/');
    expect(validateReturnTo(undefined as unknown as string)).toBe('/');
  });
});

describe('signTxPayload / verifyTxPayload', () => {
  it('round-trips a tx payload', async () => {
    const token = await signTxPayload(TX, SECRET);
    const result = await verifyTxPayload(token, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.state).toBe(TX.state);
      expect(result.payload.nonce).toBe(TX.nonce);
      expect(result.payload.codeVerifier).toBe(TX.codeVerifier);
      expect(result.payload.returnTo).toBe(TX.returnTo);
    }
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signTxPayload(TX, SECRET);
    const result = await verifyTxPayload(token, 'b'.repeat(44));
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'invalid_signature' }));
  });

  it('rejects a tampered token', async () => {
    const token = await signTxPayload(TX, SECRET);
    const result = await verifyTxPayload(token.slice(0, -2) + 'XX', SECRET);
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed token', async () => {
    const result = await verifyTxPayload('not-a-jwt', SECRET);
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'malformed' }));
  });
});

describe('buildLoginRedirect', () => {
  it('returns a Location pointing at the Entra authorize endpoint with the OIDC params', async () => {
    const { redirectUrl } = await buildLoginRedirect(RUNTIME_CONFIG, '/services/foo');
    const u = new URL(redirectUrl);
    expect(u.origin + u.pathname).toBe(FAKE_AUTH_ENDPOINT);
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('scope')).toBe(SCOPE);
    expect(u.searchParams.get('state')).toBe('fake-state');
    expect(u.searchParams.get('nonce')).toBe('fake-nonce');
    expect(u.searchParams.get('code_challenge')).toBe('fake-code-challenge');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('redirect_uri')).toBe(RUNTIME_CONFIG.redirectUri);
  });

  it('returns a Set-Cookie carrying a JWT that decodes to the tx payload', async () => {
    const { txCookie } = await buildLoginRedirect(RUNTIME_CONFIG, '/services/foo');
    expect(txCookie).toContain('__servdir_oidc_tx=');
    expect(txCookie).toContain(`Max-Age=${TX_TTL_SECONDS}`);
    expect(txCookie).toContain('HttpOnly');
    expect(txCookie).toContain('Secure');
    expect(txCookie).toContain('SameSite=Lax');
    expect(txCookie).toContain('Path=/');

    const tokenSegment = txCookie.split(';')[0].split('=', 2)[1];
    const token = decodeURIComponent(tokenSegment);
    const result = await verifyTxPayload(token, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.state).toBe('fake-state');
      expect(result.payload.nonce).toBe('fake-nonce');
      expect(result.payload.codeVerifier).toBe('fake-code-verifier');
      expect(result.payload.returnTo).toBe('/services/foo');
    }
  });

  it('sanitizes a hostile returnTo to / before storing it', async () => {
    const { txCookie } = await buildLoginRedirect(RUNTIME_CONFIG, '//evil.com/x');
    const tokenSegment = txCookie.split(';')[0].split('=', 2)[1];
    const token = decodeURIComponent(tokenSegment);
    const result = await verifyTxPayload(token, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.returnTo).toBe('/');
    }
  });

  it('caches the discovery result across calls', async () => {
    const oidc = await import('openid-client');
    await buildLoginRedirect(RUNTIME_CONFIG, '/');
    await buildLoginRedirect(RUNTIME_CONFIG, '/');
    expect(oidc.discovery).toHaveBeenCalledTimes(1);
  });
});

describe('handleCallback', () => {
  async function makeRequest(opts: { state?: string; code?: string; cookie?: string }): Promise<Request> {
    const url = new URL(RUNTIME_CONFIG.redirectUri);
    if (opts.code !== undefined) url.searchParams.set('code', opts.code);
    if (opts.state !== undefined) url.searchParams.set('state', opts.state);
    const headers: Record<string, string> = {};
    if (opts.cookie) headers['cookie'] = opts.cookie;
    return new Request(url, { headers });
  }

  async function validTxCookie(): Promise<string> {
    const token = await signTxPayload(TX, SECRET);
    return `${TX_COOKIE_NAME}=${encodeURIComponent(token)}`;
  }

  function mockTokenResponse(claims: Record<string, unknown>): void {
    authorizationCodeGrantMock.mockResolvedValueOnce({
      access_token: 'fake-access',
      id_token: 'fake.id.token',
      token_type: 'Bearer',
      claims: () => claims,
    });
  }

  it('succeeds with a session cookie and validated returnTo on the happy path', async () => {
    mockTokenResponse({
      sub: 'user-1',
      email: 'alice@example.com',
      name: 'Alice Example',
      oid: 'oid-1',
      tid: 'test-tenant',
    });
    const request = await makeRequest({ code: 'fake-code', state: TX.state, cookie: await validTxCookie() });

    const result = await handleCallback(RUNTIME_CONFIG, request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.returnTo).toBe(TX.returnTo);
      expect(result.user).toEqual({
        sub: 'user-1',
        email: 'alice@example.com',
        name: 'Alice Example',
        oid: 'oid-1',
      });
      expect(result.sessionCookie).toContain('__servdir_session=');
      expect(result.sessionCookie).toContain('HttpOnly');
      expect(result.txCookieClear).toContain('Max-Age=0');

      const sessionResult = await verifySession(result.sessionToken, SECRET);
      expect(sessionResult.ok).toBe(true);
      if (sessionResult.ok) {
        expect(sessionResult.payload.sub).toBe('user-1');
      }
    }
  });

  it('uses the configured redirect URI when exchanging codes behind a reverse proxy', async () => {
    mockTokenResponse({
      sub: 'user-1',
      email: 'alice@example.com',
      name: 'Alice Example',
      tid: 'test-tenant',
    });
    const request = new Request('http://localhost:4321/auth/callback?code=fake-code&state=fake-state', {
      headers: { cookie: await validTxCookie() },
    });

    const result = await handleCallback(RUNTIME_CONFIG, request);

    expect(result.ok).toBe(true);
    const callbackUrl = authorizationCodeGrantMock.mock.calls[0][1] as URL;
    expect(callbackUrl.toString()).toBe(`${RUNTIME_CONFIG.redirectUri}?code=fake-code&state=fake-state`);
  });

  it('rejects when the tx cookie is missing', async () => {
    const request = await makeRequest({ code: 'fake-code', state: TX.state });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual({ ok: false, reason: 'tx_missing', status: 400 });
  });

  it('rejects when the tx cookie is tampered', async () => {
    const token = await signTxPayload(TX, SECRET);
    const tampered = token.slice(0, -2) + 'XX';
    const request = await makeRequest({
      code: 'fake-code',
      state: TX.state,
      cookie: `${TX_COOKIE_NAME}=${encodeURIComponent(tampered)}`,
    });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'tx_invalid', status: 400 }));
  });

  it('rejects when query state is missing', async () => {
    const request = await makeRequest({ code: 'fake-code', cookie: await validTxCookie() });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual({ ok: false, reason: 'state_missing', status: 400 });
  });

  it('rejects when query state does not match tx cookie state', async () => {
    const request = await makeRequest({ code: 'fake-code', state: 'wrong-state', cookie: await validTxCookie() });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual({ ok: false, reason: 'state_mismatch', status: 400 });
  });

  it('rejects when authorizationCodeGrant throws', async () => {
    authorizationCodeGrantMock.mockRejectedValueOnce(new Error('boom'));
    const request = await makeRequest({ code: 'fake-code', state: TX.state, cookie: await validTxCookie() });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'token_exchange_failed', status: 400 }));
  });

  it('rejects when tenant pin (tid) does not match', async () => {
    mockTokenResponse({
      sub: 'user-1',
      email: 'mallory@otherorg.com',
      name: 'Mallory',
      tid: 'attacker-tenant',
    });
    const request = await makeRequest({ code: 'fake-code', state: TX.state, cookie: await validTxCookie() });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual({ ok: false, reason: 'tenant_mismatch', status: 403 });
  });

  it('rejects when sub claim is missing', async () => {
    mockTokenResponse({
      email: 'a@b.com',
      tid: 'test-tenant',
    });
    const request = await makeRequest({ code: 'fake-code', state: TX.state, cookie: await validTxCookie() });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result).toEqual({ ok: false, reason: 'missing_claims', status: 400 });
  });

  it('falls back to preferred_username when email claim is missing', async () => {
    mockTokenResponse({
      sub: 'user-1',
      preferred_username: 'fallback@example.com',
      name: 'Fallback',
      tid: 'test-tenant',
    });
    const request = await makeRequest({ code: 'fake-code', state: TX.state, cookie: await validTxCookie() });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe('fallback@example.com');
    }
  });

  it('sanitizes a hostile returnTo from the tx cookie', async () => {
    const hostileTx = { ...TX, returnTo: '//evil.com' };
    const hostileToken = await signTxPayload(hostileTx, SECRET);
    mockTokenResponse({ sub: 'user-1', email: 'a@b.com', name: 'A', tid: 'test-tenant' });
    const request = await makeRequest({
      code: 'fake-code',
      state: hostileTx.state,
      cookie: `${TX_COOKIE_NAME}=${encodeURIComponent(hostileToken)}`,
    });
    const result = await handleCallback(RUNTIME_CONFIG, request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.returnTo).toBe('/');
    }
  });
});
