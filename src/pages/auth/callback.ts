import type { APIRoute } from 'astro';
import { getConfig } from '@/lib/config';
import { handleCallback, type OidcRuntimeConfig } from '@/lib/auth/oidc';
import { isStaticBuildMode } from '@/lib/build-mode';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-callback');

// Server-rendered in normal builds; prerendered as a stub in static builds so
// the export does not pull in NoAdapterInstalled.
export const prerender = isStaticBuildMode();

export const GET: APIRoute = async ({ request }) => {
  const config = getConfig();

  if (config.auth.mode !== 'oidc') {
    logger.warn('callback route hit with non-oidc AUTH_MODE', { mode: config.auth.mode });
    return new Response('OIDC mode is not enabled', { status: 404 });
  }

  const oidcRuntimeConfig: OidcRuntimeConfig = {
    tenantId: config.auth.tenantId,
    clientId: config.auth.clientId,
    clientSecret: config.auth.clientSecret,
    redirectUri: config.auth.redirectUri,
    sessionSecret: config.auth.sessionSecret,
    sessionTtlHours: config.auth.sessionTtlHours,
  };

  const result = await handleCallback(oidcRuntimeConfig, request);

  if (!result.ok) {
    return new Response(`Login failed: ${result.reason}`, {
      status: result.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const headers = new Headers();
  headers.set('Location', result.returnTo);
  headers.append('Set-Cookie', result.sessionCookie);
  headers.append('Set-Cookie', result.txCookieClear);

  return new Response(null, { status: 302, headers });
};
