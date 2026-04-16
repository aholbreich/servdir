import type { GitSourceConfig } from './config';
import { getGitSourceStatuses, syncGitSource } from './catalog/sources';
import { createLogger } from './logger';

let started = false;
let startupSyncPromise: Promise<void> | undefined;
let timer: NodeJS.Timeout | undefined;
const logger = createLogger('git-sync');

export function startGitSyncScheduler(sources: GitSourceConfig[], intervalMs: number, onCycleComplete?: () => Promise<void> | void,): Promise<void> {
  if (started || sources.length === 0) {
    return startupSyncPromise ?? Promise.resolve();
  }

  started = true;
  logger.info('Starting git sync scheduler', {
    sourceCount: sources.length,
    intervalMs,
  });

  startupSyncPromise = runScheduledSync(sources, 'startup', onCycleComplete).finally(() => {
    timer = setInterval(() => {
      void runScheduledSync(sources, 'interval', onCycleComplete);
    }, intervalMs);
  });

  return startupSyncPromise;
}

async function runScheduledSync(sources: GitSourceConfig[], trigger: 'startup' | 'interval', onCycleComplete?: () => Promise<void> | void,): Promise<void> {
  const startedAt = Date.now();
  logger.info('Git sync cycle started', {
    trigger,
    sourceCount: sources.length,
  });

  for (const source of sources) {
    try {
      await syncGitSource(source);
    } catch {
      // syncGitSource already logs structured failure details
    }
  }

  if (onCycleComplete) {
    try {
      await onCycleComplete();
    } catch (error) {
      logger.error('Git sync cycle callback failed', {
        trigger,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  logger.info('Git sync cycle finished', {
    trigger,
    durationMs: Date.now() - startedAt,
  });
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
