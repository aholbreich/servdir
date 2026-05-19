import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearThemeCacheForTests, loadTheme, themeToStyleBlock, type ThemeConfig } from './theme';

let tmpDir: string;

function writeTheme(name: string, body: unknown): string {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body), 'utf-8');
  return file;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-test-'));
  clearThemeCacheForTests();
  delete process.env.UI_THEME_CONFIG;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.UI_THEME_CONFIG;
  clearThemeCacheForTests();
});

describe('loadTheme', () => {
  it('returns null when UI_THEME_CONFIG is unset', () => {
    expect(loadTheme()).toBeNull();
  });

  it('loads and validates a minimal light-only theme', () => {
    process.env.UI_THEME_CONFIG = writeTheme('basic.json', {
      name: 'brand',
      light: { primary: 'oklch(0.6 0.2 30)' },
    });

    const theme = loadTheme();
    expect(theme).not.toBeNull();
    expect(theme!.name).toBe('brand');
    expect(theme!.light.primary).toBe('oklch(0.6 0.2 30)');
    expect(theme!.dark).toBeUndefined();
  });

  it('loads a theme with dark, fonts, and brand sections', () => {
    process.env.UI_THEME_CONFIG = writeTheme('full.json', {
      name: 'brand',
      light: { background: '#fff', foreground: '#111' },
      dark: { background: '#111', foreground: '#fff' },
      fonts: {
        sans: "'Lato', sans-serif",
        cssImportHref: 'https://fonts.googleapis.com/css2?family=Lato',
      },
      brand: { logoUrl: '/logo.svg' },
    });

    const theme = loadTheme();
    expect(theme!.dark?.background).toBe('#111');
    expect(theme!.fonts?.sans).toBe("'Lato', sans-serif");
    expect(theme!.brand?.logoUrl).toBe('/logo.svg');
  });

  it('returns null when the file does not exist', () => {
    process.env.UI_THEME_CONFIG = path.join(tmpDir, 'missing.json');
    expect(loadTheme()).toBeNull();
  });

  it('returns null on invalid JSON', () => {
    process.env.UI_THEME_CONFIG = writeTheme('broken.json', '{not json');
    expect(loadTheme()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    process.env.UI_THEME_CONFIG = writeTheme('no-name.json', { light: { primary: '#000' } });
    expect(loadTheme()).toBeNull();
  });

  it('returns null on unknown token keys', () => {
    process.env.UI_THEME_CONFIG = writeTheme('bad-token.json', {
      name: 'brand',
      light: { nonsense: '#000' },
    });
    expect(loadTheme()).toBeNull();
  });

  it('returns null when fonts.cssImportHref is not a valid URL', () => {
    process.env.UI_THEME_CONFIG = writeTheme('bad-font-url.json', {
      name: 'brand',
      light: { primary: '#000' },
      fonts: { cssImportHref: 'not-a-url' },
    });
    expect(loadTheme()).toBeNull();
  });

  it('caches subsequent reads', () => {
    const file = writeTheme('cached.json', { name: 'brand', light: { primary: '#abc' } });
    process.env.UI_THEME_CONFIG = file;
    const first = loadTheme();
    fs.writeFileSync(file, JSON.stringify({ name: 'brand', light: { primary: '#def' } }));
    const second = loadTheme();
    expect(second).toBe(first);
    expect(second!.light.primary).toBe('#abc');
  });
});

describe('themeToStyleBlock', () => {
  it('emits :root[data-theme="custom"] selector with token declarations', () => {
    const theme: ThemeConfig = {
      name: 'brand',
      light: { primary: 'oklch(0.6 0.2 30)', radius: '0.5rem' },
    };
    const css = themeToStyleBlock(theme);
    expect(css).toContain(':root[data-theme="custom"] {');
    expect(css).toContain('--primary: oklch(0.6 0.2 30);');
    expect(css).toContain('--radius: 0.5rem;');
    expect(css).not.toContain('.dark {');
  });

  it('emits dark-mode selector when dark tokens are present', () => {
    const theme: ThemeConfig = {
      name: 'brand',
      light: { background: '#fff' },
      dark: { background: '#000' },
    };
    const css = themeToStyleBlock(theme);
    expect(css).toContain(':root[data-theme="custom"].dark {');
    expect(css).toContain('--background: #000;');
  });

  it('emits --font-* declarations when fonts are provided', () => {
    const theme: ThemeConfig = {
      name: 'brand',
      light: { primary: '#abc' },
      fonts: { sans: "'Lato', sans-serif", heading: "'Montserrat', sans-serif" },
    };
    const css = themeToStyleBlock(theme);
    expect(css).toContain("--font-sans: 'Lato', sans-serif;");
    expect(css).toContain("--font-heading: 'Montserrat', sans-serif;");
  });
});
