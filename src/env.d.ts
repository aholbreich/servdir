/// <reference types="astro/client" />
declare module '*.svg?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly APP_BUILD_VERSION?: string;
  readonly CATALOG_TITLE?: string;
  readonly LOCAL_CATALOG_PATH?: string;
  readonly BASIC_AUTH_ENABLED?: string;
  readonly BASIC_AUTH_USERNAME?: string;
  readonly BASIC_AUTH_PASSWORD?: string;
  readonly AUTH_MODE?: string;
  readonly AUTH_OIDC_TENANT_ID?: string;
  readonly AUTH_OIDC_CLIENT_ID?: string;
  readonly AUTH_OIDC_CLIENT_SECRET?: string;
  readonly AUTH_OIDC_REDIRECT_URI?: string;
  readonly AUTH_SESSION_SECRET?: string;
  readonly AUTH_SESSION_TTL_HOURS?: string;
  readonly GIT_SYNC_INTERVAL?: string;
  readonly SERVDIR_BUILD_MODE?: string;
  readonly SERVDIR_BASE_PATH?: string;
  readonly SERVDIR_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user?: {
      sub: string;
      email: string;
      name: string;
    };
  }
}
