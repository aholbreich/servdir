import type { GitSourceConfig } from './config';
import { getGitSourceStatuses, syncGitSource } from './catalog/sources';

let started = false;
let startupSyncPromise: Promise<void> | undefined;
let timer: NodeJS.Timeout | undefined;

export function startGitSyncScheduler(sources: GitSourceConfig[], intervalMs: number): Promise<void> {
  if (started || sources.length === 0) {
    return startupSyncPromise ?? Promise.resolve();
  }

  started = true;
  console.info(`[git-sync] scheduler starting for ${sources.length} source(s), interval ${intervalMs}ms`);

  startupSyncPromise = runScheduledSync(sources, 'startup').finally(() => {
    timer = setInterval(() => {
      void runScheduledSync(sources, 'interval');
    }, intervalMs);
  });

  return startupSyncPromise;
}

async function runScheduledSync(sources: GitSourceConfig[], trigger: 'startup' | 'interval'): Promise<void> {
  const startedAt = Date.now();
  console.info(`[git-sync] ${trigger} sync cycle started for ${sources.length} source(s)`);

  for (const source of sources) {
    try {
      await syncGitSource(source);
    } catch {
      // syncGitSource already logs structured failure details
    }
  }

  console.info(`[git-sync] ${trigger} sync cycle finished in ${Date.now() - startedAt}ms`);
}

export async function waitForInitialGitSync(): Promise<void> {
  await startupSyncPromise;
}

export function getGitSyncStatuses() {
  return getGitSourceStatuses();
}

export function stopGitSyncScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }

  startupSyncPromise = undefined;
  started = false;
}
