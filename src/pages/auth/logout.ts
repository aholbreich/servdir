import type { APIRoute } from 'astro';
import { clearSessionCookie } from '@/lib/auth/cookies';
import { isStaticBuildMode } from '@/lib/build-mode';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-logout');

export const prerender = isStaticBuildMode();

export const POST: APIRoute = async ({ locals }) => {
  if (locals.user) {
    logger.info('logout', { sub: locals.user.sub });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
