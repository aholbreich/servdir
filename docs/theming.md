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
    "body":    "'Lato', sans-serif",            // body / page text
    "sans":    "'Lato', sans-serif",            // generic sans-serif token
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
| `warning` / `warningForeground` | `--warning` / `--warning-foreground` |
| `success` / `successForeground` | `--success` / `--success-foreground` |
| `border` / `input` / `ring`  | `--border` / `--input` / `--ring` |
| `sidebar*` (7 keys)          | `--sidebar*`                    |
| `radius`                     | `--radius`                      |

Values are any valid CSS color expression (`oklch(...)`, `#rrggbb`, `rgb(...)`),
or for `radius` any CSS length.

### Fonts

When `cssImportHref` is set, servdir injects a `<link rel="stylesheet">` for
that URL (typically a Google Fonts URL). `body`, `sans`, `heading`, and `mono`
populate the `--font-body`, `--font-sans`, `--font-heading`, and `--font-mono`
CSS variables.

`body` is what the page actually renders body text in (`html { font-family:
var(--font-body) }`). The default theme binds `--font-body` to
`var(--font-mono)` — JetBrains Mono Variable — for a dev-tool aesthetic out
of the box. Themes that want a sans or serif body should set `body`
explicitly (and usually `sans` too, since shadcn primitives reference
`--font-sans` for component labels).

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

## Worked examples

Two ready-to-use themes ship in the repo as starting points:

- `themes/orange-example.json` — orange primary, deep-blue secondary, Lato +
  Montserrat via Google Fonts. Defines both light and dark token blocks, so
  the user-facing light/dark toggle stays available.
- `themes/sky-stone-example.json` — sky-blue primary on stone-gray base,
  Roboto Slab serif. Light + dark. Imported from a shadcn preset (see next
  section).

Copy either and adapt the values for your brand.

## Adopting a shadcn preset

Servdir's theme JSON keys (`background`, `primary`, `cardForeground`, …) are a
camelCase mirror of shadcn's CSS variable names (`--background`, `--primary`,
`--card-foreground`, …). That means any shadcn preset — including ones
generated by [ui.shadcn.com](https://ui.shadcn.com) or
[tweakcn.com](https://tweakcn.com) — can be turned into a servdir theme with
a mechanical key-rename.

A preset code alone (e.g. `b6GfSLX4L`) encodes *intent* (`style=luma,
baseColor=stone, theme=sky, radius=small, font=roboto-slab`), not the
resolved `oklch(...)` values. Always let the shadcn CLI do the resolution
rather than guessing tokens by hand.

### Recipe

```bash
# 1. Sanity-check what the preset means.
pnpm dlx shadcn@latest preset decode <PRESET_CODE>

# 2. Have the CLI write the actual resolved CSS variables into a scratch project.
pnpm dlx shadcn@latest init --preset <PRESET_CODE> \
  --base radix --template astro --name probe --yes
# (run inside an empty scratch dir, e.g. /tmp/preset-probe)
```

Step 2 generates `src/styles/global.css` in the scratch project. It contains
two blocks you care about:

```css
:root { --background: oklch(...); --primary: oklch(...); /* ... */ }
.dark  { --background: oklch(...); --primary: oklch(...); /* ... */ }
```

### Translate to theme JSON

Copy each variable into your new theme file under `light` (from `:root`) or
`dark` (from `.dark`):

- Drop the leading `--`
- camelCase the rest (`--card-foreground` → `cardForeground`,
  `--sidebar-primary-foreground` → `sidebarPrimaryForeground`)
- Skip variables servdir's schema does not expose: `--chart-1`..`--chart-5`,
  and the `--color-*` aliases inside `@theme inline` (those are Tailwind
  bindings, not values)
- Move `--radius` into `light.radius`
- The font choice from the preset goes under `fonts`:
  - set `fonts.sans` (and `fonts.heading` if you want the serif/display
    treatment) to the family name as a CSS value
  - set `fonts.cssImportHref` to the matching Google Fonts URL

### Add a traceability marker

The loader silently ignores unknown top-level keys, so you can record the
preset code as a comment-in-JSON via an underscore-prefixed field. Future you
will thank present you:

```jsonc
{
  "name": "sky-stone-example",
  "_source": "shadcn preset b6GfSLX4L (luma + stone + sky)",
  "light": { /* ... */ }
}
```

`_source` is not part of the schema and is dropped at load time — it lives in
the JSON file purely for humans.

### Clean up

Delete the scratch project once you've copied the tokens out. It was only
needed to make the CLI resolve the preset.

## Verifying a theme

1. Start the server with `UI_THEME_CONFIG` set.
2. Open the home page in a browser.
3. Confirm the log line `theme=Loaded theme config name=<your name>` appears at boot.
4. Inspect the `<html>` element: it should carry `data-theme="custom"`, and the
   page `<head>` should contain a `<style>` block with `:root[data-theme="custom"]`
   declarations.

If the page looks unchanged, check the application logs for a `Failed to load
theme config` warning — that means the file was found but rejected by validation.
