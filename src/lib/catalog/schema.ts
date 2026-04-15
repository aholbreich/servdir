import { z } from 'zod';

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const openApiSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const deliverySchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
  text: z.string().min(1).optional(),
}).refine((value) => Boolean(value.url || value.text), {
  message: 'delivery entry must include at least one of url or text',
  path: ['url'],
});

const techStackCategorySchema = z.array(z.string().min(1)).optional();

const techStackSchema = z.object({
  languages: techStackCategorySchema,
  frameworks: techStackCategorySchema,
  data: techStackCategorySchema,
  platform: techStackCategorySchema,
  tooling: techStackCategorySchema,
}).refine((value) => Object.values(value).some((items) => Array.isArray(items) && items.length > 0), {
  message: 'tech_stack must include at least one non-empty category',
  path: [],
});

export const serviceFrontmatterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1).default('service'),
  owner: z.string().min(1),
  lifecycle: z.string().min(1),
  repo: z.string().url(),
  description: z.string().optional(),
  tier: z.number().int().positive().optional(),
  tags: z.array(z.string().min(1)).optional(),
  depends_on: z.array(z.string().min(1)).optional(),
  runbook: z.string().url().optional(),
  links: z.array(linkSchema).optional(),
  openapi: z.array(openApiSchema).optional(),
  delivery: z.array(deliverySchema).optional(),
  tech_stack: techStackSchema.optional(),
  system: z.string().optional(),
  domain: z.string().optional(),
  platform: z.string().optional(),
});
