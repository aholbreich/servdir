import { defineMiddleware } from 'astro:middleware';
import { getConfig, tryGetConfig } from './lib/config';
import { isAuthorized } from './lib/auth/basic';
import { isStaticBuildMode } from './lib/build-mode';

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
    case 'oidc':
      return new Response('OIDC authentication is not yet implemented', {
        status: 501,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
  }
});
