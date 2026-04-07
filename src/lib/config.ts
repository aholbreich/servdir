export type GitSourceConfig = {
  name: string;
  repoUrl: string;
  branch: string;
  checkoutPath: string;
  scanPaths: string[];
};

export type BasicAuthConfig = {
  enabled: boolean;
  username?: string;
  password?: string;
};

export type AppConfig = {
  catalogPath: string;
  host: string;
  port: number;
  gitSources: GitSourceConfig[];
  basicAuth: BasicAuthConfig;
};

function parsePort(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function parseGitSources(raw: string | undefined): GitSourceConfig[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error('GIT_SOURCES must be a JSON array');
    }

    return parsed.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`GIT_SOURCES[${index}] must be an object`);
      }

      const candidate = entry as Record<string, unknown>;
      const scanPaths = Array.isArray(candidate.scanPaths)
        ? candidate.scanPaths.map(String)
        : ['services'];

      return {
        name: String(candidate.name ?? `source-${index + 1}`),
        repoUrl: String(candidate.repoUrl ?? ''),
        branch: String(candidate.branch ?? 'main'),
        checkoutPath: String(candidate.checkoutPath ?? ''),
        scanPaths,
      };
    }).filter((source) => source.repoUrl && source.checkoutPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to parse GIT_SOURCES: ${message}`);
  }
}

export function getConfig(): AppConfig {
  const catalogPath = process.env.CATALOG_PATH ?? import.meta.env.CATALOG_PATH ?? './catalog';
  const host = process.env.HOST ?? import.meta.env.HOST ?? '0.0.0.0';
  const port = parsePort(process.env.PORT ?? import.meta.env.PORT, 4321);
  const gitSources = parseGitSources(process.env.GIT_SOURCES ?? import.meta.env.GIT_SOURCES);

  const basicAuth = {
    enabled: parseBoolean(process.env.BASIC_AUTH_ENABLED ?? import.meta.env.BASIC_AUTH_ENABLED),
    username: process.env.BASIC_AUTH_USERNAME ?? import.meta.env.BASIC_AUTH_USERNAME,
    password: process.env.BASIC_AUTH_PASSWORD ?? import.meta.env.BASIC_AUTH_PASSWORD,
  };

  console.info(`[config] resolved catalog path: ${catalogPath}`);
  console.info(`[config] resolved host: ${host}`);
  console.info(`[config] resolved port: ${port}`);
  console.info(`[config] configured git sources: ${gitSources.length}`);
  console.info(`[config] basic auth: ${basicAuth.enabled ? 'enabled' : 'disabled'}`);

  return {
    catalogPath,
    host,
    port,
    gitSources,
    basicAuth,
  };
}
