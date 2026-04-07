import { describe, expect, it } from 'vitest';
import { isAuthorized, parseBasicAuthHeader } from './auth';

describe('parseBasicAuthHeader', () => {
  it('parses a valid basic auth header', () => {
    const header = `Basic ${Buffer.from('alice:secret').toString('base64')}`;
    expect(parseBasicAuthHeader(header)).toEqual({ username: 'alice', password: 'secret' });
  });
});

describe('isAuthorized', () => {
  it('allows requests when auth is disabled', () => {
    expect(isAuthorized({ enabled: false }, null)).toBe(true);
  });

  it('accepts matching credentials when auth is enabled', () => {
    const header = `Basic ${Buffer.from('alice:secret').toString('base64')}`;
    expect(isAuthorized({ enabled: true, username: 'alice', password: 'secret' }, header)).toBe(true);
  });

  it('rejects invalid credentials', () => {
    const header = `Basic ${Buffer.from('alice:nope').toString('base64')}`;
    expect(isAuthorized({ enabled: true, username: 'alice', password: 'secret' }, header)).toBe(false);
  });
});
