import { loadConfiguredCatalog } from './load';
import type { ServiceRecord } from './types';

export type TagSummary = {
  label: string;
  slug: string;
  serviceCount: number;
};

export type TagsIndexModel = {
  tags: TagSummary[];
};

export type TagPageModel = {
  tag: TagSummary;
  services: ServiceRecord[];
};

export function toTagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function collectTagEntries(services: ServiceRecord[]): Map<string, { label: string; services: ServiceRecord[] }> {
  const tags = new Map<string, { label: string; services: ServiceRecord[] }>();

  for (const service of services) {
    for (const tag of service.data.tags ?? []) {
      const slug = toTagSlug(tag);

      if (!slug) {
        continue;
      }

      const existing = tags.get(slug);

      if (existing) {
        existing.services.push(service);
        continue;
      }

      tags.set(slug, {
        label: tag,
        services: [service],
      });
    }
  }

  return tags;
}

export async function loadConfiguredTagsIndex(): Promise<TagsIndexModel> {
  const catalog = await loadConfiguredCatalog();
  const tags = Array.from(collectTagEntries(catalog.services), ([slug, entry]) => ({
    label: entry.label,
    slug,
    serviceCount: entry.services.length,
  })).sort((left, right) => left.label.localeCompare(right.label));

  return { tags };
}

export async function loadConfiguredTagPage(tagSlug: string | undefined): Promise<TagPageModel | undefined> {
  if (!tagSlug) {
    return undefined;
  }

  const catalog = await loadConfiguredCatalog();
  const tagEntries = collectTagEntries(catalog.services);
  const tagEntry = tagEntries.get(tagSlug);

  if (!tagEntry) {
    return undefined;
  }

  const services = [...tagEntry.services].sort((left, right) => left.data.name.localeCompare(right.data.name));

  return {
    tag: {
      label: tagEntry.label,
      slug: tagSlug,
      serviceCount: services.length,
    },
    services,
  };
}
