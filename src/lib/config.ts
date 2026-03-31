export type AppConfig = {
  catalogPath: string;
  host: string;
  port: number;
};

function parsePort(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig(): AppConfig {
  return {
    catalogPath: import.meta.env.CATALOG_PATH ?? './catalog',
    host: import.meta.env.HOST ?? '0.0.0.0',
    port: parsePort(import.meta.env.PORT, 4321),
  };
}
