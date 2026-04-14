import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { parseServiceFile } from '../parse';
import type { ServiceRecord } from '../types';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function loadLocalServices(localCatalogRoot: string): Promise<ServiceRecord[]> {
  const servicePattern = path.join(localCatalogRoot, 'services', '*', 'service.md').replaceAll('\\', '/');
  const singleRepoDefinitionPath = path.join(localCatalogRoot, '.servdir.md');
  console.info(`[catalog:local] loading services from pattern: ${servicePattern}`);

  const filePaths = await glob(servicePattern);

  if (await pathExists(singleRepoDefinitionPath)) {
    console.info(`[catalog:local] discovered single-repo definition: ${singleRepoDefinitionPath}`);
    filePaths.push(singleRepoDefinitionPath);
  }

  console.info(`[catalog:local] discovered ${filePaths.length} service definition file(s)`);

  if (filePaths.length > 0) {
    console.info(`[catalog:local] first discovered file: ${filePaths[0]}`);
  }

  return Promise.all(filePaths.map((filePath) => parseServiceFile(filePath)));
}
