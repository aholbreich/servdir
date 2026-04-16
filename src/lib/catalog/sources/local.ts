import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { parseServiceFile } from '../parse';
import type { ServiceRecord } from '../types';
import { createLogger } from '../../logger';

const logger = createLogger('catalog-local');

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
  logger.debug('Scanning local catalog source', {
    catalogRoot: localCatalogRoot,
    pattern: servicePattern,
  });

  const filePaths = await glob(servicePattern);

  if (await pathExists(singleRepoDefinitionPath)) {
    logger.debug('Discovered single-repo catalog definition', {
      filePath: singleRepoDefinitionPath,
    });
    filePaths.push(singleRepoDefinitionPath);
  }

  logger.debug('Discovered local catalog definition files', {
    fileCount: filePaths.length,
  });

  return Promise.all(filePaths.map(async (filePath) => {
    const service = await parseServiceFile(filePath);

    if (service.issues.length > 0) {
      logger.warn('Parsed local catalog entry with validation issues', {
        filePath,
        issueCount: service.issues.length,
      });
      for (const issue of service.issues) {
        logger.warn('Local catalog validation issue', {
          filePath,
          issueLevel: issue.level,
          issueMessage: issue.message,
        });
      }
    }

    return service;
  }));
}
