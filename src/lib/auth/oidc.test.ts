import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_AUTH_ENDPOINT = 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize';

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
}));

import {
  SCOPE,
  TX_TTL_SECONDS,
  _resetDiscoveryCache,
  buildLoginRedirect,
  signTxPayload,
  validateReturnTo,
  verifyTxPayload,
  type OidcRuntimeConfig,
  type TxPayload,
} from './oidc';

const SECRET = 'a'.repeat(44);

const RUNTIME_CONFIG: OidcRuntimeConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://servdir.example.com/auth/callback',
  sessionSecret: SECRET,
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
