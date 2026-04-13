import { describe, expect, it } from 'vitest';

import { getServiceSummary } from './service-summary';

describe('getServiceSummary', () => {
  it('prefers a trimmed frontmatter description when present', () => {
    expect(
      getServiceSummary({
        data: { description: '  Clear catalog summary.  ' },
        body: '# Heading\nFallback body copy',
      }),
    ).toBe('Clear catalog summary.');
  });

  it('falls back to the first non-heading markdown line', () => {
    expect(
      getServiceSummary({
        data: {},
        body: '# Billing API\n\nHandles invoice generation.\n\nMore details later.',
      }),
    ).toBe('Handles invoice generation.');
  });

  it('returns a stable empty-state message when no summary is available', () => {
    expect(
      getServiceSummary({
        data: {},
        body: '# Billing API\n\n## Overview',
      }),
    ).toBe('No description provided.');
  });
});
