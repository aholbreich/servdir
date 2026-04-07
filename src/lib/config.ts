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
  catalogPath?: string;
  gitSources: GitSourceConfig[];
  gitSyncIntervalMs: number;
  basicAuth: BasicAuthConfig;
};

let cachedConfig: AppConfig | undefined;

function readEnv(name: keyof ImportMetaEnv): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}

function readEnvOrDefault(name: keyof ImportMetaEnv, fallback: string): string {
  return readEnv(name) ?? fallback;
}

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
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

// Builds and returns the application configuration by reading environment variables and parsing them into an AppConfig object.
function buildConfig(): AppConfig {
  const catalogPath = readEnv('CATALOG_PATH');
  const gitSources = parseGitSources(readEnv('GIT_SOURCES'));

  if (!catalogPath && gitSources.length === 0) {
    throw new Error('at least one catalog source must be configured: set CATALOG_PATH or GIT_SOURCES (must be a JSON array)');
  }

  const enabled = parseBoolean(readEnv('BASIC_AUTH_ENABLED'));
  const username = readEnv('BASIC_AUTH_USERNAME');
  const password = readEnv('BASIC_AUTH_PASSWORD');

  if (!enabled && (username || password)) {
    console.warn('[config] BASIC_AUTH_USERNAME or BASIC_AUTH_PASSWORD are set but BASIC_AUTH_ENABLED is not true; credentials will be ignored.');
  }

  return {
    catalogPath,
    gitSources,
    gitSyncIntervalMs: parsePositiveNumber(readEnv('GIT_SYNC_INTERVAL_MS'), 60000),
    basicAuth: {
      enabled,
      username: enabled ? username : undefined,
      password: enabled ? password : undefined,
    },
  };
  
}

function logConfig(config: AppConfig): void {
  console.info(`[config] ==========================================`);
  console.info(`[config] configured local catalog path: ${config.catalogPath ?? 'disabled'}`);
  console.info(`[config] configured git sources: ${config.gitSources.length}`);
  console.info(`[config] git sync interval: ${config.gitSyncIntervalMs}ms`);
  console.info(`[config] basic auth: ${config.basicAuth.enabled ? 'enabled' : 'disabled'}`);
  console.info(`[config] ==========================================`);
}

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = buildConfig();
  logConfig(cachedConfig);
  return cachedConfig;
}
