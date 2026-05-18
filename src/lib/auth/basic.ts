import crypto from 'node:crypto';

export type BasicAuthConfig = {
  enabled: boolean;
  username?: string;
  password?: string;
};

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseBasicAuthHeader(value: string | null): { username: string; password: string } | null {
  if (!value || !value.startsWith('Basic ')) {
    return null;
  }

  const encoded = value.slice('Basic '.length).trim();

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');

    if (separator < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function isAuthorized(config: BasicAuthConfig, authorizationHeader: string | null): boolean {
  if (!config.enabled) {
    return true;
  }

  if (!config.username || !config.password) {
    return false;
  }

  const credentials = parseBasicAuthHeader(authorizationHeader);

  if (!credentials) {
    return false;
  }

  return safeEqual(credentials.username, config.username) && safeEqual(credentials.password, config.password);
}
