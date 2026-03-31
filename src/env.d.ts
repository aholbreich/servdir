/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly CATALOG_PATH?: string;
  readonly HOST?: string;
  readonly PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
