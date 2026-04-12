/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly APP_BUILD_VERSION?: string;
  readonly CATALOG_TITLE?: string;
  readonly LOCAL_CATALOG_PATH?: string;
  readonly BASIC_AUTH_ENABLED?: string;
  readonly BASIC_AUTH_USERNAME?: string;
  readonly BASIC_AUTH_PASSWORD?: string;
  readonly GIT_SYNC_INTERVAL_MS?: string;
  readonly GIT_SOURCES?: string;
  readonly SERVDIR_BUILD_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
