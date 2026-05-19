import { createLogger } from '../logger';

const logger = createLogger('auth-cookies');

export const SESSION_COOKIE_NAME = '__servdir_session';
export const TX_COOKIE_NAME = '__servdir_oidc_tx';

const HARDENED_FLAGS = ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/'];

function buildSetCookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    ...HARDENED_FLAGS,
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

export function mintSessionCookie(value: string, maxAgeSeconds: number): string {
  logger.debug('session cookie minted', { name: SESSION_COOKIE_NAME, maxAgeSeconds });
  return buildSetCookie(SESSION_COOKIE_NAME, value, maxAgeSeconds);
}

export function mintTxCookie(value: string, maxAgeSeconds: number): string {
  logger.debug('tx cookie minted', { name: TX_COOKIE_NAME, maxAgeSeconds });
  return buildSetCookie(TX_COOKIE_NAME, value, maxAgeSeconds);
}

export function clearSessionCookie(): string {
  logger.debug('session cookie cleared');
  return buildSetCookie(SESSION_COOKIE_NAME, '', 0);
}

export function clearTxCookie(): string {
  logger.debug('tx cookie cleared');
  return buildSetCookie(TX_COOKIE_NAME, '', 0);
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }

  const prefix = `${name}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        logger.warn('cookie value failed to url-decode', { name });
        return null;
      }
    }
  }

  return null;
}

export function parseSessionCookie(header: string | null): string | null {
  return parseCookie(header, SESSION_COOKIE_NAME);
}

export function parseTxCookie(header: string | null): string | null {
  return parseCookie(header, TX_COOKIE_NAME);
}
