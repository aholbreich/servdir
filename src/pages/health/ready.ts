import type { APIRoute } from 'astro';
import { tryGetConfig } from '../../lib/config';

export const GET: APIRoute = async () => {
  const configResolution = tryGetConfig();

  if (!configResolution.ok) {
    return new Response(JSON.stringify({
      status: 'not-ready',
      reason: configResolution.error.message,
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(JSON.stringify({
    status: 'ready',
    gitSources: configResolution.config.gitSources.length,
    basicAuthEnabled: configResolution.config.basicAuth.enabled,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
