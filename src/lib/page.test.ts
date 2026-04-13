import { describe, expect, it } from 'vitest';

import { createNotFoundRedirectResponse } from './page';

describe('createNotFoundRedirectResponse', () => {
  it('returns a 404 response that points to the app-aware not-found page', () => {
    const response = createNotFoundRedirectResponse();

    expect(response.status).toBe(404);
    expect(response.headers.get('Location')).toBe('/404');
  });
});
