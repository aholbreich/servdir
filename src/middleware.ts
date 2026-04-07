import { defineMiddleware } from 'astro:middleware';
import { getConfig } from './lib/config';
import { isAuthorized } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
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
