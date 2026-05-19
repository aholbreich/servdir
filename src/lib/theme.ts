import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger';

export type ThemeTokens = Partial<{
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  radius: string;
}>;

export type ThemeFonts = Partial<{
  sans: string;
  mono: string;
  heading: string;
  cssImportHref: string;
}>;

export type ThemeBrand = Partial<{
  logoUrl: string;
  faviconUrl: string;
}>;

export type ThemeConfig = {
  name: string;
  light: ThemeTokens;
  dark?: ThemeTokens;
  fonts?: ThemeFonts;
  brand?: ThemeBrand;
};

const TOKEN_CSS_VAR: Record<keyof ThemeTokens, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  border: '--border',
  input: '--input',
  ring: '--ring',
  sidebar: '--sidebar',
  sidebarForeground: '--sidebar-foreground',
  sidebarPrimary: '--sidebar-primary',
  sidebarPrimaryForeground: '--sidebar-primary-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
  sidebarRing: '--sidebar-ring',
  radius: '--radius',
};

let cached: ThemeConfig | null | undefined;
const logger = createLogger('theme');

function readEnv(name: string): string | undefined {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
}

function validateTokens(value: unknown, where: string): ThemeTokens {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected an object of token values`);
  }

  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!(key in TOKEN_CSS_VAR)) {
      throw new Error(`${where}: unknown token "${key}"`);
    }
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error(`${where}: token "${key}" must be a non-empty string`);
    }
    out[key] = raw.trim();
  }
  return out as ThemeTokens;
}

function validateFonts(value: unknown): ThemeFonts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('fonts: expected an object');
  }
  const allowed = new Set(['sans', 'mono', 'heading', 'cssImportHref']);
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      throw new Error(`fonts: unknown key "${key}"`);
    }
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error(`fonts.${key} must be a non-empty string`);
    }
    out[key] = raw.trim();
  }
  if (out.cssImportHref) {
    try {
      new URL(out.cssImportHref);
    } catch {
      throw new Error(`fonts.cssImportHref is not a valid URL: "${out.cssImportHref}"`);
    }
  }
  return out as ThemeFonts;
}

function validateBrand(value: unknown): ThemeBrand {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('brand: expected an object');
  }
  const allowed = new Set(['logoUrl', 'faviconUrl']);
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      throw new Error(`brand: unknown key "${key}"`);
    }
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error(`brand.${key} must be a non-empty string`);
    }
    out[key] = raw.trim();
  }
  return out as ThemeBrand;
}

function validate(raw: unknown): ThemeConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('theme config must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error('theme.name is required and must be a non-empty string');
  }
  if (!obj.light) {
    throw new Error('theme.light is required');
  }

  const theme: ThemeConfig = {
    name: obj.name.trim(),
    light: validateTokens(obj.light, 'theme.light'),
  };

  if (obj.dark !== undefined) {
    theme.dark = validateTokens(obj.dark, 'theme.dark');
  }
  if (obj.fonts !== undefined) {
    theme.fonts = validateFonts(obj.fonts);
  }
  if (obj.brand !== undefined) {
    theme.brand = validateBrand(obj.brand);
  }
  return theme;
}

export function loadTheme(): ThemeConfig | null {
  if (cached !== undefined) return cached;

  const configPath = readEnv('UI_THEME_CONFIG')?.trim();
  if (!configPath) {
    cached = null;
    return cached;
  }

  const absolute = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
  try {
    const text = fs.readFileSync(absolute, 'utf-8');
    const parsed = JSON.parse(text);
    cached = validate(parsed);
    logger.info('Loaded theme config', { name: cached.name, path: absolute, dark: cached.dark != null });
    return cached;
  } catch (error) {
    logger.error('Failed to load theme config; falling back to default theme', {
      path: absolute,
      error: error instanceof Error ? error.message : String(error),
    });
    cached = null;
    return cached;
  }
}

function tokensToDeclarations(tokens: ThemeTokens, fonts?: ThemeFonts): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(tokens) as Array<[keyof ThemeTokens, string]>) {
    lines.push(`  ${TOKEN_CSS_VAR[key]}: ${value};`);
  }
  if (fonts) {
    if (fonts.sans) lines.push(`  --font-sans: ${fonts.sans};`);
    if (fonts.mono) lines.push(`  --font-mono: ${fonts.mono};`);
    if (fonts.heading) lines.push(`  --font-heading: ${fonts.heading};`);
  }
  return lines.join('\n');
}

export function themeToStyleBlock(theme: ThemeConfig): string {
  const parts: string[] = [];
  parts.push(`:root[data-theme="custom"] {\n${tokensToDeclarations(theme.light, theme.fonts)}\n}`);
  if (theme.dark) {
    parts.push(`:root[data-theme="custom"].dark {\n${tokensToDeclarations(theme.dark)}\n}`);
  }
  return parts.join('\n');
}

export function clearThemeCacheForTests(): void {
  cached = undefined;
}
