import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { serviceFrontmatterSchema } from './schema';
import { renderMarkdown } from './markdown';
import type { ServiceRecord, ValidationIssue } from './types';

type ParseServiceInput = {
  filePath: string;
  raw: string;
};

function toSlug(id: string): string {
  return id.trim().toLowerCase();
}

export function parseServiceContent(input: ParseServiceInput): ServiceRecord {
  const parsed = matter(input.raw);
  const result = serviceFrontmatterSchema.safeParse(parsed.data);

  const issues: ValidationIssue[] = [];

  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        level: 'error',
        message: `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`,
      });
    }
  }

  const data = result.success
    ? result.data
    : {
        id: String(parsed.data.id ?? 'unknown-service'),
        name: String(parsed.data.name ?? 'Unknown Service'),
        owner: String(parsed.data.owner ?? 'unknown-owner'),
        lifecycle: String(parsed.data.lifecycle ?? 'unknown'),
        repo: String(parsed.data.repo ?? 'https://invalid.local'),
        description: typeof parsed.data.description === 'string' ? parsed.data.description : undefined,
        tier: typeof parsed.data.tier === 'number' ? parsed.data.tier : undefined,
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : undefined,
        depends_on: Array.isArray(parsed.data.depends_on) ? parsed.data.depends_on.map(String) : undefined,
        runbook: typeof parsed.data.runbook === 'string' ? parsed.data.runbook : undefined,
        links: Array.isArray(parsed.data.links) ? parsed.data.links as Array<{ label: string; url: string }> : undefined,
        openapi: Array.isArray(parsed.data.openapi) ? parsed.data.openapi as Array<{ label: string; url: string }> : undefined,
        system: typeof parsed.data.system === 'string' ? parsed.data.system : undefined,
        domain: typeof parsed.data.domain === 'string' ? parsed.data.domain : undefined,
      };

  return {
    filePath: input.filePath,
    slug: toSlug(data.id),
    body: parsed.content.trim(),
    html: renderMarkdown(parsed.content),
    data,
    issues,
  };
}

export async function parseServiceFile(filePath: string): Promise<ServiceRecord> {
  const raw = await fs.readFile(filePath, 'utf8');
  return parseServiceContent({ filePath, raw });
}
