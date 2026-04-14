import { defineMiddleware } from 'astro:middleware';
import { getConfig, tryGetConfig } from './lib/config';
import { isAuthorized } from './lib/auth';
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

  if (!config.basicAuth.enabled) {
    return next();
  }

  const authorization = context.request.headers.get('authorization');
  const authorized = isAuthorized(config.basicAuth, authorization);

  if (authorized) {
    return next();
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="servdir"',
    },
  });
});
