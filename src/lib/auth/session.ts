import { SignJWT, errors, jwtVerify } from 'jose';
import { createLogger } from '../logger';

const logger = createLogger('auth-session');

const ALGORITHM = 'HS256';
const CLOCK_TOLERANCE_SECONDS = 60;
const MIN_SECRET_BYTES = 32;

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

export type VerifiedSession = SessionPayload & {
  exp: number;
  iat: number;
};

export type VerifyFailureReason = 'expired' | 'invalid_signature' | 'malformed' | 'unknown';

export type VerifyResult =
  | { ok: true; payload: VerifiedSession }
  | { ok: false; reason: VerifyFailureReason };

function encodeSecret(secret: string): Uint8Array {
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`session secret too short for HS256 (need >= ${MIN_SECRET_BYTES} bytes)`);
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, secret: string, ttlSeconds: number): Promise<string> {
  const key = encodeSecret(secret);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + ttlSeconds;

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(exp)
    .sign(key);

  logger.info('session minted', { sub: payload.sub, exp, ttlSeconds });
  return token;
}

export async function verifySession(token: string, secret: string): Promise<VerifyResult> {
  const key = encodeSecret(secret);

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });

    const verified = payload as unknown as VerifiedSession;
    logger.debug('session verified', { sub: verified.sub, exp: verified.exp });
    return { ok: true, payload: verified };
  } catch (err) {
    const reason = classifyVerifyError(err);
    logger.warn('session verify failed', { reason });
    return { ok: false, reason };
  }
}

function classifyVerifyError(err: unknown): VerifyFailureReason {
  if (err instanceof errors.JWTExpired) {
    return 'expired';
  }
  if (err instanceof errors.JWSSignatureVerificationFailed) {
    return 'invalid_signature';
  }
  if (err instanceof errors.JWTInvalid || err instanceof errors.JWSInvalid || err instanceof errors.JOSEError) {
    return 'malformed';
  }
  return 'unknown';
}
