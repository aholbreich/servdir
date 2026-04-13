import { describe, expect, it } from 'vitest';

import {
  describeGitSources,
  describeSourceMode,
  formatDuration,
  getGitSourcesSummaryLabel,
} from './catalog-status';

describe('catalog status helpers', () => {
  it('formats minute-based durations cleanly', () => {
    expect(formatDuration(60_000)).toBe('1 minute');
    expect(formatDuration(180_000)).toBe('3 minutes');
  });

  it('formats second-based durations cleanly', () => {
    expect(formatDuration(1_000)).toBe('1 second');
    expect(formatDuration(15_000)).toBe('15 seconds');
  });

  it('falls back to milliseconds for non-round durations', () => {
    expect(formatDuration(1_500)).toBe('1500 ms');
  });

  it('describes the configured source mode', () => {
    expect(describeSourceMode('/catalog', 2)).toBe('Local + managed Git');
    expect(describeSourceMode('/catalog', 0)).toBe('Local only');
    expect(describeSourceMode(undefined, 2)).toBe('Managed Git only');
    expect(describeSourceMode(undefined, 0)).toBe('Unconfigured');
  });

  it('describes git source counts and summary labels', () => {
    expect(describeGitSources(1)).toBe('1 source');
    expect(describeGitSources(3)).toBe('3 sources');
    expect(getGitSourcesSummaryLabel(1)).toBe('Show source details');
    expect(getGitSourcesSummaryLabel(3)).toBe('Show all 3 sources');
  });
});
