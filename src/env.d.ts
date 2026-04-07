/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly CATALOG_PATH?: string;
  readonly BASIC_AUTH_ENABLED?: string;
  readonly BASIC_AUTH_USERNAME?: string;
  readonly BASIC_AUTH_PASSWORD?: string;
  readonly GIT_SYNC_INTERVAL_MS?: string;
  readonly GIT_SOURCES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
