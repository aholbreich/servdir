import { describe, expect, it } from 'vitest';

import {
  describeGitSourceHealth,
  describeGitSources,
  describeSourceMode,
  formatDuration,
  getGitSourceSyncBadge,
  getGitSourcesSummaryLabel,
  summarizeGitSourceError,
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

  it('describes git source health for healthy, failing, and pending states', () => {
    expect(describeGitSourceHealth(0, 0, 0)).toBe('No managed Git sources');
    expect(describeGitSourceHealth(2, 1, 2)).toBe('1 source failing');
    expect(describeGitSourceHealth(2, 0, 0)).toBe('Waiting for first sync');
    expect(describeGitSourceHealth(2, 0, 2)).toBe('All sources healthy');
  });

  it('maps git sync badge state cleanly', () => {
    expect(getGitSourceSyncBadge()).toEqual({ label: 'not synced yet', tone: 'default' });
    expect(getGitSourceSyncBadge({ lastSyncSucceeded: true })).toEqual({ label: 'healthy', tone: 'ok' });
    expect(getGitSourceSyncBadge({ lastSyncSucceeded: false, lastError: 'Unauthorized' })).toEqual({ label: 'sync failed', tone: 'warn' });
  });

  it('summarizes noisy git errors into friendlier hints', () => {
    expect(summarizeGitSourceError('Unauthorized\nfatal: Could not read from remote repository.')).toBe('SSH key is not authorized for this repository.');
    expect(summarizeGitSourceError('Host key verification failed.')).toBe('Host key verification failed, check known_hosts configuration.');
    expect(summarizeGitSourceError('plain unexpected error')).toBe('plain unexpected error');
  });
});
