import { describe, expect, it } from 'vitest';
import { signSession, verifySession, type SessionPayload } from './session';

const SECRET = 'a'.repeat(44); // 44 base64 chars => 33 bytes decoded, > 32
const SHORT_SECRET = 'abc';
const PAYLOAD: SessionPayload = {
  sub: 'user-123',
  email: 'alice@example.com',
  name: 'Alice Example',
};

describe('session', () => {
  it('round-trips a payload through sign and verify', async () => {
    const token = await signSession(PAYLOAD, SECRET, 3600);
    const result = await verifySession(token, SECRET);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.sub).toBe(PAYLOAD.sub);
      expect(result.payload.email).toBe(PAYLOAD.email);
      expect(result.payload.name).toBe(PAYLOAD.name);
      expect(result.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    }
  });

  it('verifies tokens issued up to 60s in the past clock-skew window', async () => {
    // Token that expired 30s ago — should still verify thanks to clock tolerance.
    const token = await signSession(PAYLOAD, SECRET, -30);
    const result = await verifySession(token, SECRET);

    expect(result.ok).toBe(true);
  });

  it('rejects a token that has expired well beyond clock tolerance', async () => {
    const token = await signSession(PAYLOAD, SECRET, -120);
    const result = await verifySession(token, SECRET);

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'expired' }));
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession(PAYLOAD, SECRET, 3600);
    const result = await verifySession(token, 'b'.repeat(44));

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'invalid_signature' }));
  });

  it('rejects a token whose payload has been tampered with', async () => {
    const token = await signSession(PAYLOAD, SECRET, 3600);
    const [header, payload, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')), sub: 'attacker' }),
    ).toString('base64url').replace(/=+$/, '');
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
    const result = await verifySession(tamperedToken, SECRET);

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'invalid_signature' }));
  });

  it('rejects a malformed token', async () => {
    const result = await verifySession('not-a-jwt', SECRET);
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'malformed' }));
  });

  it('refuses to sign with a too-short secret', async () => {
    await expect(signSession(PAYLOAD, SHORT_SECRET, 3600)).rejects.toThrow(/session secret too short/);
  });
});
