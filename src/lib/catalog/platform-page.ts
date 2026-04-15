import { loadConfiguredCatalog } from './load';
import type { ServiceRecord } from './types';

export type PlatformSummary = {
  label: string;
  slug: string;
  serviceCount: number;
};

export type PlatformsIndexModel = {
  platforms: PlatformSummary[];
};

export type PlatformPageModel = {
  platform: PlatformSummary;
  services: ServiceRecord[];
};

export function toPlatformSlug(platform: string): string {
  return platform
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toPlatformLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

function collectPlatformEntries(
  services: ServiceRecord[],
): Map<string, { label: string; services: ServiceRecord[] }> {
  const platforms = new Map<string, { label: string; services: ServiceRecord[] }>();

  for (const service of services) {
    const raw = service.data.platform?.trim();
    if (!raw) continue;

    const slug = toPlatformSlug(raw);
    if (!slug) continue;

    const existing = platforms.get(slug);
    if (existing) {
      existing.services.push(service);
    } else {
      platforms.set(slug, { label: toPlatformLabel(slug), services: [service] });
    }
  }

  return platforms;
}

export async function loadConfiguredPlatformsIndex(): Promise<PlatformsIndexModel> {
  const catalog = await loadConfiguredCatalog();
  const platforms = Array.from(collectPlatformEntries(catalog.services), ([slug, entry]) => ({
    label: entry.label,
    slug,
    serviceCount: entry.services.length,
  })).sort((a, b) => a.label.localeCompare(b.label));

  return { platforms };
}

export async function loadConfiguredPlatformPage(
  platformSlug: string | undefined,
): Promise<PlatformPageModel | undefined> {
  if (!platformSlug) return undefined;

  const catalog = await loadConfiguredCatalog();
  const entry = collectPlatformEntries(catalog.services).get(platformSlug);
  if (!entry) return undefined;

  const services = [...entry.services].sort((a, b) => a.data.name.localeCompare(b.data.name));

  return {
    platform: { label: entry.label, slug: platformSlug, serviceCount: services.length },
    services,
  };
}

export async function listConfiguredPlatformPaths(): Promise<Array<{ params: { platform: string } }>> {
  const { platforms } = await loadConfiguredPlatformsIndex();
  return platforms.map((p) => ({ params: { platform: p.slug } }));
}
