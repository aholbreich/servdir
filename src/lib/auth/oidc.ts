import {
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  type Configuration,
} from 'openid-client';
import { SignJWT, errors, jwtVerify } from 'jose';
import { createLogger } from '../logger';
import { mintTxCookie } from './cookies';

const logger = createLogger('auth-oidc');

export const SCOPE = 'openid profile email';
export const TX_TTL_SECONDS = 600;

const JWT_ALG = 'HS256';
const CLOCK_TOLERANCE_SECONDS = 60;
const MIN_SECRET_BYTES = 32;

export type OidcRuntimeConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  sessionSecret: string;
};

export type TxPayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
};

export type TxVerifyResult =
  | { ok: true; payload: TxPayload & { iat: number; exp: number } }
  | { ok: false; reason: 'expired' | 'invalid_signature' | 'malformed' | 'unknown' };

export type BuildLoginRedirectResult = {
  txCookie: string;
  redirectUrl: string;
};

function entraIssuerUrl(tenantId: string): URL {
  return new URL(`https://login.microsoftonline.com/${tenantId}/v2.0`);
}

let configurationCache: { tenantId: string; clientId: string; promise: Promise<Configuration> } | null = null;

export async function getDiscoveredConfiguration(oidcConfig: OidcRuntimeConfig): Promise<Configuration> {
  if (
    configurationCache &&
    configurationCache.tenantId === oidcConfig.tenantId &&
    configurationCache.clientId === oidcConfig.clientId
  ) {
    return configurationCache.promise;
  }

  logger.info('discovering OIDC issuer metadata', { tenantId: oidcConfig.tenantId });
  const promise = discovery(entraIssuerUrl(oidcConfig.tenantId), oidcConfig.clientId, oidcConfig.clientSecret).catch(
    (err: unknown) => {
      configurationCache = null;
      logger.error('OIDC discovery failed', { tenantId: oidcConfig.tenantId, error: err });
      throw err;
    },
  );

  configurationCache = { tenantId: oidcConfig.tenantId, clientId: oidcConfig.clientId, promise };
  return promise;
}

export function _resetDiscoveryCache(): void {
  configurationCache = null;
}

export function validateReturnTo(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '/';
  if (!input.startsWith('/') || input.startsWith('//')) return '/';
  try {
    new URL(input);
    // If new URL() succeeded, the value is an absolute URL — reject.
    return '/';
  } catch {
    return input;
  }
}

function encodeSecret(secret: string): Uint8Array {
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`tx secret too short for HS256 (need >= ${MIN_SECRET_BYTES} bytes)`);
  }
  return new TextEncoder().encode(secret);
}

export async function signTxPayload(payload: TxPayload, secret: string): Promise<string> {
  const key = encodeSecret(secret);
  const nowSeconds = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + TX_TTL_SECONDS)
    .sign(key);
}

export async function verifyTxPayload(token: string, secret: string): Promise<TxVerifyResult> {
  const key = encodeSecret(secret);
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [JWT_ALG],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    return { ok: true, payload: payload as unknown as TxPayload & { iat: number; exp: number } };
  } catch (err) {
    const reason = classifyVerifyError(err);
    logger.warn('tx cookie verify failed', { reason });
    return { ok: false, reason };
  }
}

function classifyVerifyError(err: unknown): 'expired' | 'invalid_signature' | 'malformed' | 'unknown' {
  if (err instanceof errors.JWTExpired) return 'expired';
  if (err instanceof errors.JWSSignatureVerificationFailed) return 'invalid_signature';
  if (err instanceof errors.JWTInvalid || err instanceof errors.JWSInvalid || err instanceof errors.JOSEError) {
    return 'malformed';
  }
  return 'unknown';
}

export async function buildLoginRedirect(
  oidcConfig: OidcRuntimeConfig,
  returnTo: string,
): Promise<BuildLoginRedirectResult> {
  const configuration = await getDiscoveredConfiguration(oidcConfig);

  const codeVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const state = randomState();
  const nonce = randomNonce();
  const safeReturnTo = validateReturnTo(returnTo);

  const authUrl = buildAuthorizationUrl(configuration, {
    redirect_uri: oidcConfig.redirectUri,
    scope: SCOPE,
    response_type: 'code',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const txToken = await signTxPayload({ state, nonce, codeVerifier, returnTo: safeReturnTo }, oidcConfig.sessionSecret);
  const txCookie = mintTxCookie(txToken, TX_TTL_SECONDS);

  logger.info('login redirect built', { statePrefix: state.slice(0, 8), returnTo: safeReturnTo });
  return { txCookie, redirectUrl: authUrl.toString() };
}
