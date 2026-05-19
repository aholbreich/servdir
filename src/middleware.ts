import { defineMiddleware } from 'astro:middleware';
import { getConfig, tryGetConfig } from './lib/config';
import { isAuthorized } from './lib/auth/basic';
import { parseSessionCookie } from './lib/auth/cookies';
import { verifySession } from './lib/auth/session';
import { isStaticBuildMode } from './lib/build-mode';
import { createLogger } from './lib/logger';

const oidcLogger = createLogger('auth-middleware-oidc');

function misconfiguredResponse(): Response {
  return new Response('Servdir is misconfigured. Please check startup logs.', {
    status: 500,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function isHealthPath(pathname: string): boolean {
  return pathname === '/health/live' || pathname === '/health/ready';
}

function isAuthPath(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

function wantsHtml(request: Request): boolean {
  const accept = request.headers.get('accept');
  return request.method === 'GET' && (accept === null || accept.includes('text/html'));
}

function unauthenticatedResponse(request: Request, pathname: string, search: string): Response {
  if (wantsHtml(request)) {
    const returnTo = encodeURIComponent(`${pathname}${search}`);
    return new Response(null, {
      status: 302,
      headers: { Location: `/auth/login?return_to=${returnTo}` },
    });
  }
  return new Response(JSON.stringify({ error: 'unauthenticated' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Static builds do not execute request-time auth or misconfiguration handling.
  // Those concerns only apply to the server runtime path.
  if (isStaticBuildMode()) {
    return next();
  }

  const pathname = new URL(context.request.url).pathname;

  if (isHealthPath(pathname)) {
    return next();
  }

  const configResolution = tryGetConfig();

  if (!configResolution.ok) {
    return misconfiguredResponse();
  }

  const config = getConfig();

  switch (config.auth.mode) {
    case 'none':
      return next();
    case 'basic': {
      const authorization = context.request.headers.get('authorization');
      const authorized = isAuthorized(
        { enabled: true, username: config.auth.username, password: config.auth.password },
        authorization,
      );
      if (authorized) {
        return next();
      }
      return new Response('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="servdir"',
        },
      });
    }
    case 'oidc': {
      if (isAuthPath(pathname)) {
        return next();
      }

      const sessionToken = parseSessionCookie(context.request.headers.get('cookie'));
      if (!sessionToken) {
        oidcLogger.debug('no session cookie', { pathname });
        return unauthenticatedResponse(context.request, pathname, new URL(context.request.url).search);
      }

      const verification = await verifySession(sessionToken, config.auth.sessionSecret);
      if (!verification.ok) {
        oidcLogger.debug('session cookie verify failed', { pathname, reason: verification.reason });
        return unauthenticatedResponse(context.request, pathname, new URL(context.request.url).search);
      }

      context.locals.user = {
        sub: verification.payload.sub,
        email: verification.payload.email,
        name: verification.payload.name,
      };
      return next();
    }
  }
});
