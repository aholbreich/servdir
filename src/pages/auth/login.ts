import type { APIRoute } from 'astro';
import { getConfig } from '@/lib/config';
import { buildLoginRedirect, type OidcRuntimeConfig } from '@/lib/auth/oidc';
import { isStaticBuildMode } from '@/lib/build-mode';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-login');

// In server builds the login flow runs at request time. In static builds the
// page is prerendered as the "not available" stub so the static export has
// no broken server-only route.
export const prerender = isStaticBuildMode();

export const GET: APIRoute = async ({ request }) => {
  const config = getConfig();

  if (config.auth.mode !== 'oidc') {
    logger.warn('login route hit with non-oidc AUTH_MODE', { mode: config.auth.mode });
    return new Response('OIDC mode is not enabled', { status: 404 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') ?? '/';

  const oidcRuntimeConfig: OidcRuntimeConfig = {
    tenantId: config.auth.tenantId,
    clientId: config.auth.clientId,
    clientSecret: config.auth.clientSecret,
    redirectUri: config.auth.redirectUri,
    sessionSecret: config.auth.sessionSecret,
    sessionTtlHours: config.auth.sessionTtlHours,
  };

  const { txCookie, redirectUrl } = await buildLoginRedirect(oidcRuntimeConfig, returnTo);

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': txCookie,
    },
  });
};
