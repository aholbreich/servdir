import { toAppPath } from './paths';

/**
 * Astro route modules can return a Response to short-circuit rendering when content is missing.
 */
export function createNotFoundRedirectResponse() {
  return new Response(null, {
    status: 404,
    headers: {
      Location: toAppPath('/404'),
    },
  });
}
