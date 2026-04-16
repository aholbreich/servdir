import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseServiceFile } from '../parse';
import type { ServiceRecord } from '../types';
import type { GitSourceConfig } from '../../config';
import { createLogger } from '../../logger';

const execFileAsync = promisify(execFile);
const DEFAULT_SSH_KEY_PATH = '/etc/servdir/ssh/id_ed25519';
const DEFAULT_KNOWN_HOSTS_PATH = '/etc/servdir/ssh/known_hosts';
const logger = createLogger('catalog-git');

export type GitCatalogSource = GitSourceConfig;

export type GitSourceSyncStatus = {
  sourceName: string;
  repoUrl: string;
  branch: string;
  checkoutPath: string;
  lastSyncStartedAt?: string;
  lastSyncFinishedAt?: string;
  lastSyncDurationMs?: number;
  lastSyncSucceeded: boolean;
  lastError?: string;
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createGitEnv(): Promise<NodeJS.ProcessEnv> {
  const env = { ...process.env };

  if (env.GIT_SSH_COMMAND) {
    return env;
  }

  const hasDefaultKey = await pathExists(DEFAULT_SSH_KEY_PATH);
  const hasKnownHosts = await pathExists(DEFAULT_KNOWN_HOSTS_PATH);

  if (hasDefaultKey) {
    const sshParts = [
      'ssh',
      `-i ${DEFAULT_SSH_KEY_PATH}`,
    ];

    if (hasKnownHosts) {
      sshParts.push(`-o UserKnownHostsFile=${DEFAULT_KNOWN_HOSTS_PATH}`);
    }

    env.GIT_SSH_COMMAND = sshParts.join(' ');
  }

  return env;
}

async function runGit(args: string[], cwd?: string): Promise<void> {
  const env = await createGitEnv();
  await execFileAsync('git', args, cwd ? { cwd, env } : { env });
}

async function removeCheckoutIfInvalid(checkoutPath: string): Promise<void> {
  const hasGitDir = await pathExists(path.join(checkoutPath, '.git'));

  if (!hasGitDir && await pathExists(checkoutPath)) {
    logger.warn('Removing invalid git checkout directory', {
      checkoutPath,
    });
    await fs.rm(checkoutPath, { recursive: true, force: true });
  }
}

async function ensureCheckout(source: GitCatalogSource): Promise<void> {
  const gitDir = path.join(source.checkoutPath, '.git');
  const hasCheckout = await pathExists(gitDir);

  await fs.mkdir(path.dirname(source.checkoutPath), { recursive: true });
  await removeCheckoutIfInvalid(source.checkoutPath);

  if (!hasCheckout) {
    logger.info('Cloning managed git source', {
      sourceName: source.name,
      repoUrl: source.repoUrl,
      branch: source.branch,
      checkoutPath: source.checkoutPath,
    });
    await runGit(['clone', '--branch', source.branch, '--single-branch', source.repoUrl, source.checkoutPath]);
    return;
  }

  logger.info('Refreshing managed git source checkout', {
    sourceName: source.name,
    branch: source.branch,
    checkoutPath: source.checkoutPath,
  });
  await runGit(['fetch', 'origin', source.branch], source.checkoutPath);
  await runGit(['checkout', source.branch], source.checkoutPath);
  await runGit(['reset', '--hard', `origin/${source.branch}`], source.checkoutPath);
}

async function scanCheckout(source: GitCatalogSource): Promise<ServiceRecord[]> {
  const paths = source.scanPaths && source.scanPaths.length > 0 ? source.scanPaths : [''];
  const allFiles = await Promise.all(paths.map(async (scanPath) => {
    const pattern = path.join(source.checkoutPath, scanPath, '*', 'service.md').replaceAll('\\', '/');
    const singleRepoDefinitionPath = path.join(source.checkoutPath, scanPath, '.servdir.md');
    logger.debug('Scanning managed git source path', {
      sourceName: source.name,
      scanPath: scanPath || '.',
      pattern,
    });

    const matchedPaths = await glob(pattern);

    if (await pathExists(singleRepoDefinitionPath)) {
      logger.debug('Discovered single-repo catalog definition in managed git source', {
        sourceName: source.name,
        filePath: singleRepoDefinitionPath,
      });
      matchedPaths.push(singleRepoDefinitionPath);
    }

    return matchedPaths;
  }));

  const filePaths = Array.from(new Set(allFiles.flat()));
  logger.debug('Discovered managed git catalog definition files', {
    sourceName: source.name,
    fileCount: filePaths.length,
  });

  const parsedServices = await Promise.all(filePaths.map(async (filePath) => {
    try {
      const service = await parseServiceFile(filePath);

      if (service.issues.length > 0) {
        logger.warn('Parsed managed git catalog entry with validation issues', {
          sourceName: source.name,
          filePath,
          issueCount: service.issues.length,
        });
        for (const issue of service.issues) {
          logger.warn('Managed git catalog validation issue', {
            sourceName: source.name,
            filePath,
            issueLevel: issue.level,
            issueMessage: issue.message,
          });
        }
      }

      return service;
    } catch (error) {
      logger.error('Failed to parse catalog definition from managed git source', {
        sourceName: source.name,
        filePath,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }));

  return parsedServices;
}

const inFlightSyncs = new Map<string, Promise<void>>();
const syncStatus = new Map<string, GitSourceSyncStatus>();

export function getGitSourceStatuses(): GitSourceSyncStatus[] {
  return Array.from(syncStatus.values());
}

export async function syncGitSource(source: GitCatalogSource): Promise<void> {
  const existing = inFlightSyncs.get(source.checkoutPath);

  if (existing) {
    return existing;
  }

  const startedAt = new Date();
  const startMs = Date.now();
  const run = (async () => {
    logger.info('Managed git source sync started', {
      sourceName: source.name,
      branch: source.branch,
      checkoutPath: source.checkoutPath,
    });
    syncStatus.set(source.checkoutPath, {
      sourceName: source.name,
      repoUrl: source.repoUrl,
      branch: source.branch,
      checkoutPath: source.checkoutPath,
      lastSyncStartedAt: startedAt.toISOString(),
      lastSyncSucceeded: false,
    });

    try {
      await ensureCheckout(source);
      const durationMs = Date.now() - startMs;
      syncStatus.set(source.checkoutPath, {
        sourceName: source.name,
        repoUrl: source.repoUrl,
        branch: source.branch,
        checkoutPath: source.checkoutPath,
        lastSyncStartedAt: startedAt.toISOString(),
        lastSyncFinishedAt: new Date().toISOString(),
        lastSyncDurationMs: durationMs,
        lastSyncSucceeded: true,
      });
      logger.info('Managed git source sync completed', {
        sourceName: source.name,
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - startMs;
      const resolvedError = error instanceof Error ? error : new Error(String(error));
      const message = resolvedError.message;
      syncStatus.set(source.checkoutPath, {
        sourceName: source.name,
        repoUrl: source.repoUrl,
        branch: source.branch,
        checkoutPath: source.checkoutPath,
        lastSyncStartedAt: startedAt.toISOString(),
        lastSyncFinishedAt: new Date().toISOString(),
        lastSyncDurationMs: durationMs,
        lastSyncSucceeded: false,
        lastError: message,
      });
      logger.error('Managed git source sync failed', {
        sourceName: source.name,
        durationMs,
        error: resolvedError,
      });
      throw error;
    } finally {
      inFlightSyncs.delete(source.checkoutPath);
    }
  })();

  inFlightSyncs.set(source.checkoutPath, run);
  return run;
}

export async function loadGitServices(sources: GitCatalogSource[]): Promise<ServiceRecord[]> {
  const loaded: ServiceRecord[] = [];

  for (const source of sources) {
    if (!await pathExists(path.join(source.checkoutPath, '.git'))) {
      logger.warn('Skipping managed git source scan because checkout is missing', {
        sourceName: source.name,
        checkoutPath: source.checkoutPath,
      });
      continue;
    }

    const services = await scanCheckout(source);
    loaded.push(...services);
  }

  return loaded;
}
