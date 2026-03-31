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
  const catalogPath = process.env.CATALOG_PATH ?? import.meta.env.CATALOG_PATH ?? './catalog';
  const host = process.env.HOST ?? import.meta.env.HOST ?? '0.0.0.0';
  const port = parsePort(process.env.PORT ?? import.meta.env.PORT, 4321);

  console.info(`[config] resolved catalog path: ${catalogPath}`);
  console.info(`[config] resolved host: ${host}`);
  console.info(`[config] resolved port: ${port}`);

  return {
    catalogPath,
    host,
    port,
  };
}
