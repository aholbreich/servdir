# Theming

servdir's UI is configurable at deploy time via a single JSON theme file. The
default theme ships built-in and looks identical to a stock servdir install; a
deployment can override colors, radius, fonts, and brand assets without forking
the codebase.

## Enabling a theme

Point `UI_THEME_CONFIG` at a theme JSON file before starting the server (or
before running `pnpm build` / `pnpm build:static`):

```bash
UI_THEME_CONFIG=themes/orange-example.json pnpm start
```

The path may be absolute or relative to the working directory. If the file is
missing, malformed, or fails validation, servdir logs an error and falls back to
the default theme — the app still boots.

In container deployments, mount the theme file (and any logo/favicon assets) at
a known path and set `UI_THEME_CONFIG` to it. See `docs/kubernetes.md` for an
example.

> Static export note: `pnpm build:static` reads `UI_THEME_CONFIG` at build time
> and bakes the resulting CSS into every page. To change the theme for a static
> deployment, rebuild with a different `UI_THEME_CONFIG`.

## Schema

```jsonc
{
  "name": "my-brand",          // required, free-form identifier
  "light": { /* tokens */ },   // required: light-mode CSS variable values
  "dark":  { /* tokens */ },   // optional: dark-mode overrides
  "fonts": {                   // optional
    "sans":    "'Lato', sans-serif",
    "heading": "'Montserrat', sans-serif",
    "mono":    "'JetBrains Mono', monospace",
    "cssImportHref": "https://fonts.googleapis.com/css2?family=Lato&display=swap"
  },
  "brand": {                   // optional
    "logoUrl":    "/branding/logo.svg",
    "faviconUrl": "/branding/favicon.svg"
  }
}
```

### Tokens

Token keys map directly to shadcn/ui CSS variables. Any subset is allowed —
keys you omit fall back to the default theme's values.

| Key                          | CSS variable                    |
| ---------------------------- | ------------------------------- |
| `background`                 | `--background`                  |
| `foreground`                 | `--foreground`                  |
| `card` / `cardForeground`    | `--card` / `--card-foreground`  |
| `popover` / `popoverForeground` | `--popover` / `--popover-foreground` |
| `primary` / `primaryForeground` | `--primary` / `--primary-foreground` |
| `secondary` / `secondaryForeground` | `--secondary` / `--secondary-foreground` |
| `muted` / `mutedForeground`  | `--muted` / `--muted-foreground` |
| `accent` / `accentForeground` | `--accent` / `--accent-foreground` |
| `destructive`                | `--destructive`                 |
| `border` / `input` / `ring`  | `--border` / `--input` / `--ring` |
| `sidebar*` (7 keys)          | `--sidebar*`                    |
| `radius`                     | `--radius`                      |

Values are any valid CSS color expression (`oklch(...)`, `#rrggbb`, `rgb(...)`),
or for `radius` any CSS length.

### Fonts

When `cssImportHref` is set, servdir injects a `<link rel="stylesheet">` for
that URL (typically a Google Fonts URL). `sans`, `heading`, and `mono` populate
the `--font-sans`, `--font-heading`, and `--font-mono` CSS variables, which the
default stylesheet wires into Tailwind/shadcn usage.

### Brand

`logoUrl` renders a top-left logo image in the layout shell. `faviconUrl`
overrides the browser tab favicon.

- Paths starting with `/` are treated as application-relative and are
  automatically prefixed with the Astro `base` (matters for static deployments
  served from a subpath such as GitHub Pages `/servdir/`).
- Absolute URLs (`https://…`) and protocol-relative URLs (`//…`) are passed
  through verbatim.

The logo `<img>` is rendered with `alt=""` (decorative). If you need an
informative alt text, customise `BaseLayout.astro` for your deployment.

> Note: the app title comes from `CATALOG_TITLE` (env var), not the theme file.
> Titles are a deployment-level concern; the theme file covers branding.

### Dark mode

If you provide a `dark` block, the existing light/dark toggle keeps working and
flips between your two token sets. If you omit `dark`, the toggle is hidden and
the app stays in light mode regardless of the user's OS preference.

## Worked example

See `themes/orange-example.json` for a complete light-only theme using an
orange primary, deep-blue secondary, and Google Fonts for Lato/Montserrat.
Copy it and adapt the values for your brand.

## Verifying a theme

1. Start the server with `UI_THEME_CONFIG` set.
2. Open the home page in a browser.
3. Confirm the log line `theme=Loaded theme config name=<your name>` appears at boot.
4. Inspect the `<html>` element: it should carry `data-theme="custom"`, and the
   page `<head>` should contain a `<style>` block with `:root[data-theme="custom"]`
   declarations.

If the page looks unchanged, check the application logs for a `Failed to load
theme config` warning — that means the file was found but rejected by validation.
