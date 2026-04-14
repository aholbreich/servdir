import path from 'node:path';

export type GitSourceConfig = {
  name: string;
  repoUrl: string;
  branch: string;
  checkoutPath: string;
  scanPaths?: string[];
};

export type BasicAuthConfig = {
  enabled: boolean;
  username?: string;
  password?: string;
};

export type AppConfig = {
  appBuildVersion: string;
  catalogTitle: string;
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


function parseDurationMs(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/);
  if (!match) return fallback;
  const value = parseFloat(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  const ms = value * multipliers[unit];
  return ms > 0 ? ms : fallback;
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function toSafePathSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'source';
}

function defaultCheckoutPath(name: string, index: number): string {
  return path.join('.', 'catalog-cache', `${toSafePathSegment(name)}-${index + 1}`);
}

function parseGitSources(): GitSourceConfig[] {
  if (process.env.GIT_SOURCES) {
    console.warn('[config] GIT_SOURCES is no longer supported — migrate to GIT_SOURCE_<NAME>=repoUrl|branch[|scanPath1,scanPath2]');
  }

  // Merge process.env and import.meta.env — Astro/Vite may inject .env vars into
  // import.meta.env without putting them into process.env in dev mode.
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('GIT_SOURCE_') && value) merged[key] = value;
  }
  for (const [key, value] of Object.entries(import.meta.env as Record<string, unknown>)) {
    if (key.startsWith('GIT_SOURCE_') && typeof value === 'string' && value && !(key in merged)) {
      merged[key] = value;
    }
  }

  const entries = Object.entries(merged).sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([key, value], index) => {
    const nameSuffix = key.slice('GIT_SOURCE_'.length);
    const name = nameSuffix.toLowerCase().replace(/_/g, '-');
    const parts = (value as string).split('|');

    if (parts.length < 2) {
      throw new Error(`${key}: expected format repoUrl|branch[|scanPaths] but got "${value}"`);
    }

    const [repoUrl, branch, scanPathsRaw] = parts;
    const scanPaths = scanPathsRaw
      ? scanPathsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    return {
      name,
      repoUrl: repoUrl.trim(),
      branch: branch.trim() || 'main',
      checkoutPath: defaultCheckoutPath(name, index),
      scanPaths,
    };
  }).filter((source) => source.repoUrl);
}

function buildConfig(): AppConfig {
  const localCatalogPath = readEnv('LOCAL_CATALOG_PATH');
  const gitSources = parseGitSources();
  const basicAuthEnabled = parseBoolean(readEnv('BASIC_AUTH_ENABLED'));
  const basicAuthUsername = readEnv('BASIC_AUTH_USERNAME');
  const basicAuthPassword = readEnv('BASIC_AUTH_PASSWORD');
  const appBuildVersion = readEnv('APP_BUILD_VERSION') ?? 'v0.0.1 · sha-local';

  if (!basicAuthEnabled && (basicAuthUsername || basicAuthPassword)) {
    console.warn('[config] BASIC_AUTH_USERNAME or BASIC_AUTH_PASSWORD are set but BASIC_AUTH_ENABLED is not true, credentials will be ignored.');
  }

  return {
    appBuildVersion,
    catalogTitle: readEnv('CATALOG_TITLE') ?? 'Service Catalog',
    localCatalogPath,
    gitSources,
    gitSyncIntervalMs: parseDurationMs(readEnv('GIT_SYNC_INTERVAL'), 60000),
    basicAuth: {
      enabled: basicAuthEnabled,
      username: basicAuthEnabled ? basicAuthUsername : undefined,
      password: basicAuthEnabled ? basicAuthPassword : undefined,
    },
  };
}

function validateConfig(config: AppConfig): AppConfig {
  if (!config.localCatalogPath && config.gitSources.length === 0) {
    throw new Error('at least one catalog source must be configured: set LOCAL_CATALOG_PATH or GIT_SOURCE_<NAME>');
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
  console.info(`[config] app build version: ${config.appBuildVersion}`);
  console.info(`[config] catalog title: ${config.catalogTitle}`);
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
