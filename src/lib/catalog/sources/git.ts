import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseServiceFile } from '../parse';
import type { ServiceRecord } from '../types';
import type { GitSourceConfig } from '../../config';

const execFileAsync = promisify(execFile);
const DEFAULT_SSH_KEY_PATH = '/etc/servdir/ssh/id_ed25519';
const DEFAULT_KNOWN_HOSTS_PATH = '/etc/servdir/ssh/known_hosts';

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
    console.warn(`[catalog:git] removing invalid checkout at ${checkoutPath}`);
    await fs.rm(checkoutPath, { recursive: true, force: true });
  }
}

async function ensureCheckout(source: GitCatalogSource): Promise<void> {
  const gitDir = path.join(source.checkoutPath, '.git');
  const hasCheckout = await pathExists(gitDir);

  await fs.mkdir(path.dirname(source.checkoutPath), { recursive: true });
  await removeCheckoutIfInvalid(source.checkoutPath);

  if (!hasCheckout) {
    console.info(`[catalog:git] source ${source.name} cloning ${source.repoUrl} into ${source.checkoutPath}`);
    await runGit(['clone', '--branch', source.branch, '--single-branch', source.repoUrl, source.checkoutPath]);
    return;
  }

  console.info(`[catalog:git] source ${source.name} fetching ${source.branch}`);
  await runGit(['fetch', 'origin', source.branch], source.checkoutPath);
  await runGit(['checkout', source.branch], source.checkoutPath);
  await runGit(['reset', '--hard', `origin/${source.branch}`], source.checkoutPath);
}

async function scanCheckout(source: GitCatalogSource): Promise<ServiceRecord[]> {
  const allFiles = await Promise.all(source.scanPaths.map(async (scanPath) => {
    const pattern = path.join(source.checkoutPath, scanPath, '*', 'service.md').replaceAll('\\', '/');
    console.info(`[catalog:git] scanning ${source.name} with pattern: ${pattern}`);
    return glob(pattern);
  }));

  const filePaths = allFiles.flat();
  console.info(`[catalog:git] discovered ${filePaths.length} service definition file(s) in ${source.name}`);

  const parsedServices = await Promise.all(filePaths.map(async (filePath) => {
    try {
      const service = await parseServiceFile(filePath);

      if (service.issues.length > 0) {
        console.warn(`[catalog:git] parsed ${filePath} from ${source.name} with ${service.issues.length} validation issue(s)`);
        for (const issue of service.issues) {
          console.warn(`[catalog:git] ${filePath}: [${issue.level}] ${issue.message}`);
        }
      }

      return service;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[catalog:git] failed to parse ${filePath} from ${source.name}: ${message}`);
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
    console.info(`[catalog:git] source ${source.name} sync started`);
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
      console.info(`[catalog:git] source ${source.name} sync completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startMs;
      const message = error instanceof Error ? error.message : String(error);
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
      console.error(`[catalog:git] source ${source.name} sync failed after ${durationMs}ms: ${message}`);
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
      console.warn(`[catalog:git] source ${source.name} has no checkout yet, skipping scan`);
      continue;
    }

    const services = await scanCheckout(source);
    loaded.push(...services);
  }

  return loaded;
}
