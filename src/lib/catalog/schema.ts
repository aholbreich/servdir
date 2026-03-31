import { z } from 'zod';

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export const serviceFrontmatterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
  lifecycle: z.string().min(1),
  repo: z.string().url(),
  description: z.string().optional(),
  tier: z.number().int().positive().optional(),
  tags: z.array(z.string().min(1)).optional(),
  depends_on: z.array(z.string().min(1)).optional(),
  runbook: z.string().url().optional(),
  links: z.array(linkSchema).optional(),
  system: z.string().optional(),
  domain: z.string().optional(),
});

export type ParsedServiceFrontmatter = z.infer<typeof serviceFrontmatterSchema>;
