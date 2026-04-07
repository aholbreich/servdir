import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseServiceFile } from '../parse';
import type { ServiceRecord } from '../types';

const execFileAsync = promisify(execFile);

export type GitCatalogSource = {
  name: string;
  repoUrl: string;
  branch: string;
  checkoutPath: string;
  scanPaths: string[];
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runGit(args: string[], cwd?: string): Promise<void> {
  await execFileAsync('git', args, cwd ? { cwd } : undefined);
}

async function ensureCheckout(source: GitCatalogSource): Promise<void> {
  const gitDir = path.join(source.checkoutPath, '.git');
  const hasCheckout = await pathExists(gitDir);

  await fs.mkdir(path.dirname(source.checkoutPath), { recursive: true });

  if (!hasCheckout) {
    console.info(`[catalog:git] cloning ${source.repoUrl} into ${source.checkoutPath}`);
    await runGit(['clone', '--branch', source.branch, '--single-branch', source.repoUrl, source.checkoutPath]);
    return;
  }

  console.info(`[catalog:git] pulling ${source.name} in ${source.checkoutPath}`);
  await runGit(['fetch', 'origin', source.branch], source.checkoutPath);
  await runGit(['checkout', source.branch], source.checkoutPath);
  await runGit(['pull', '--ff-only', 'origin', source.branch], source.checkoutPath);
}

async function scanCheckout(source: GitCatalogSource): Promise<ServiceRecord[]> {
  const allFiles = await Promise.all(source.scanPaths.map(async (scanPath) => {
    const pattern = path.join(source.checkoutPath, scanPath, '*', 'service.md').replaceAll('\\', '/');
    console.info(`[catalog:git] scanning ${source.name} with pattern: ${pattern}`);
    return glob(pattern);
  }));

  const filePaths = allFiles.flat();
  console.info(`[catalog:git] discovered ${filePaths.length} service definition file(s) in ${source.name}`);

  return Promise.all(filePaths.map((filePath) => parseServiceFile(filePath)));
}

export async function loadGitServices(sources: GitCatalogSource[]): Promise<ServiceRecord[]> {
  const loaded: ServiceRecord[] = [];

  for (const source of sources) {
    await ensureCheckout(source);
    const services = await scanCheckout(source);
    loaded.push(...services);
  }

  return loaded;
}
