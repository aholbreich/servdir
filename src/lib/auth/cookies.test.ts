import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  TX_COOKIE_NAME,
  clearSessionCookie,
  clearTxCookie,
  mintSessionCookie,
  mintTxCookie,
  parseSessionCookie,
  parseTxCookie,
} from './cookies';

describe('cookies', () => {
  describe('Set-Cookie minting', () => {
    it('sets HttpOnly Secure SameSite=Lax Path=/ Max-Age on the session cookie', () => {
      const header = mintSessionCookie('opaque-token', 28800);
      expect(header).toContain(`${SESSION_COOKIE_NAME}=opaque-token`);
      expect(header).toContain('HttpOnly');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Path=/');
      expect(header).toContain('Max-Age=28800');
    });

    it('sets the same hardened flags on the tx cookie', () => {
      const header = mintTxCookie('opaque-tx-value', 600);
      expect(header).toContain(`${TX_COOKIE_NAME}=opaque-tx-value`);
      expect(header).toContain('HttpOnly');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Path=/');
      expect(header).toContain('Max-Age=600');
    });

    it('url-encodes special characters in the cookie value', () => {
      const value = 'abc def;%';
      const header = mintSessionCookie(value, 1);
      expect(header).toContain(`${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`);
    });
  });

  describe('cookie clearing', () => {
    it('issues a Max-Age=0 cookie with the same flags', () => {
      const header = clearSessionCookie();
      expect(header).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(header).toContain('Max-Age=0');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Path=/');
    });

    it('clears the tx cookie the same way', () => {
      const header = clearTxCookie();
      expect(header).toContain(`${TX_COOKIE_NAME}=`);
      expect(header).toContain('Max-Age=0');
    });
  });

  describe('Cookie request-header parsing', () => {
    it('extracts the session cookie value from a single-cookie header', () => {
      expect(parseSessionCookie(`${SESSION_COOKIE_NAME}=opaque-token`)).toBe('opaque-token');
    });

    it('extracts the session cookie value when other cookies are present', () => {
      const header = `theme=dark; ${SESSION_COOKIE_NAME}=opaque-token; foo=bar`;
      expect(parseSessionCookie(header)).toBe('opaque-token');
    });

    it('url-decodes the cookie value', () => {
      const value = 'abc def;%';
      const header = `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`;
      expect(parseSessionCookie(header)).toBe(value);
    });

    it('returns null for a missing cookie', () => {
      expect(parseSessionCookie('other=value')).toBeNull();
    });

    it('returns null for an empty or missing header', () => {
      expect(parseSessionCookie('')).toBeNull();
      expect(parseSessionCookie(null)).toBeNull();
    });

    it('parses the tx cookie identically', () => {
      const header = `theme=dark; ${TX_COOKIE_NAME}=tx-value`;
      expect(parseTxCookie(header)).toBe('tx-value');
    });
  });
});
