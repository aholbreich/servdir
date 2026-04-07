import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./catalog/sources', () => ({
  getGitSourceStatuses: vi.fn(() => []),
  syncGitSource: vi.fn(() => Promise.resolve()),
}));

describe('git sync scheduler', () => {
  afterEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('runs startup sync once and schedules interval syncs', async () => {
    vi.useFakeTimers();
    const { startGitSyncScheduler, stopGitSyncScheduler } = await import('./git-sync');
    const { syncGitSource } = await import('./catalog/sources');

    await startGitSyncScheduler([
      {
        name: 'catalog-main',
        repoUrl: 'git@example.com:org/repo.git',
        branch: 'main',
        checkoutPath: '/tmp/catalog-main',
        scanPaths: ['services'],
      },
    ], 1000);

    expect(syncGitSource).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(syncGitSource).toHaveBeenCalledTimes(2);

    stopGitSyncScheduler();
  });
});
