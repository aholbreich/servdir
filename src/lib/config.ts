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
  localCatalogPath?: string;
  gitSources: GitSourceConfig[];
  gitSyncIntervalMs: number;
  basicAuth: BasicAuthConfig;
};

type ConfigResolution =
  | { ok: true; config: AppConfig }
  | { ok: false; error: Error };

let cachedConfigResolution: ConfigResolution | undefined;

function readEnv(name: keyof ImportMetaEnv): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function looksEncryptedPlaceholder(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('ENC[');
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
    throw new Error(`failed to parse GIT_SOURCES: ${toError(error).message}`);
  }
}

function buildConfig(): AppConfig {
  const localCatalogPath = readEnv('LOCAL_CATALOG_PATH');
  const gitSources = parseGitSources(readEnv('GIT_SOURCES'));
  const basicAuthEnabled = parseBoolean(readEnv('BASIC_AUTH_ENABLED'));
  const basicAuthUsername = readEnv('BASIC_AUTH_USERNAME');
  const basicAuthPassword = readEnv('BASIC_AUTH_PASSWORD');

  if (!basicAuthEnabled && (basicAuthUsername || basicAuthPassword)) {
    console.warn('[config] BASIC_AUTH_USERNAME or BASIC_AUTH_PASSWORD are set but BASIC_AUTH_ENABLED is not true, credentials will be ignored.');
  }

  return {
    localCatalogPath,
    gitSources,
    gitSyncIntervalMs: parsePositiveNumber(readEnv('GIT_SYNC_INTERVAL_MS'), 60000),
    basicAuth: {
      enabled: basicAuthEnabled,
      username: basicAuthEnabled ? basicAuthUsername : undefined,
      password: basicAuthEnabled ? basicAuthPassword : undefined,
    },
  };
}

function validateConfig(config: AppConfig): AppConfig {
  if (!config.localCatalogPath && config.gitSources.length === 0) {
    throw new Error('at least one catalog source must be configured: set LOCAL_CATALOG_PATH or GIT_SOURCES');
  }

  if (config.basicAuth.enabled) {
    if (!config.basicAuth.username || !config.basicAuth.password) {
      throw new Error('Basic auth enabled, but username/password missing');
    }

    if (looksEncryptedPlaceholder(config.basicAuth.username) || looksEncryptedPlaceholder(config.basicAuth.password)) {
      throw new Error('Encrypted secret placeholder detected in runtime env');
    }
  }

  return config;
}

function logConfig(config: AppConfig): void {
  console.info('[config] ==========================================');
  console.info(`[config] configured local catalog path: ${config.localCatalogPath ?? 'disabled'}`);
  console.info(`[config] configured git sources: ${config.gitSources.length}`);
  console.info(`[config] git sync interval: ${config.gitSyncIntervalMs}ms`);
  console.info(`[config] basic auth: ${config.basicAuth.enabled ? 'enabled' : 'disabled'}`);
  console.info('[config] ==========================================');
}

function resolveConfig(): ConfigResolution {
  if (cachedConfigResolution) {
    return cachedConfigResolution;
  }

  try {
    const config = validateConfig(buildConfig());
    logConfig(config);
    cachedConfigResolution = { ok: true, config };
  } catch (error) {
    const resolvedError = toError(error);
    console.error(`[config] invalid configuration: ${resolvedError.message}`);
    cachedConfigResolution = { ok: false, error: resolvedError };
  }

  return cachedConfigResolution;
}

export function tryGetConfig(): ConfigResolution {
  return resolveConfig();
}

export function getConfig(): AppConfig {
  const resolution = resolveConfig();

  if (!resolution.ok) {
    throw resolution.error;
  }

  return resolution.config;
}
