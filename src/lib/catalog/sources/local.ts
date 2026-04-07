import path from 'node:path';
import { glob } from 'glob';
import { parseServiceFile } from '../parse';
import type { ServiceRecord } from '../types';

export async function loadLocalServices(localCatalogRoot: string): Promise<ServiceRecord[]> {
  const pattern = path.join(localCatalogRoot, 'services', '*', 'service.md').replaceAll('\\', '/');
  console.info(`[catalog:local] loading services from pattern: ${pattern}`);

  const filePaths = await glob(pattern);
  console.info(`[catalog:local] discovered ${filePaths.length} service definition file(s)`);

  if (filePaths.length > 0) {
    console.info(`[catalog:local] first discovered file: ${filePaths[0]}`);
  }

  return Promise.all(filePaths.map((filePath) => parseServiceFile(filePath)));
}
