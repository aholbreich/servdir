# 13. App-level theming via deploy-time config file

Date: 2026-05-19

## Status

Accepted

## Context

servdir is an open-source service catalog used by multiple organizations. ADR
005 adopted Tailwind v4 with CSS custom properties; ADR 011 adopted shadcn/ui
React islands. The shadcn token system already centralizes color/radius via
CSS variables on `:root` (light) and `.dark` (dark). However, every deployment
that wants to apply its own corporate identity has had to fork
`src/styles/tokens.css` and rebuild — there is no supported configuration
surface for branding.

Product input (task-y13, 2026-05-19) captured the following constraints:

- Multi-brand support is needed, not a single hardcoded "test.cloud" build
- servdir must stay self-contained and not depend on any internal/proprietary
  package at build or runtime
- Build/deploy-time selection is sufficient; no need for runtime theme
  switching in v1
- Start with shadcn token mapping; no catalog-component redesign
- Logo support is valuable; app title remains a deployment-level concern
- External config file is the preferred selection mechanism

## Decision

Introduce a single JSON theme file selected via the `UI_THEME_CONFIG`
environment variable. When set, servdir reads and validates the file at startup
(or build time for static export) and injects matching CSS variable overrides
into every page.

Key shape:

```jsonc
{
  "name": "...",
  "light": { /* shadcn token overrides */ },
  "dark":  { /* optional, shadcn dark overrides */ },
  "fonts": { "sans": "...", "heading": "...", "cssImportHref": "..." },
  "brand": { "logoUrl": "...", "faviconUrl": "..." }
}
```

Implementation:

1. `src/lib/theme.ts` owns parsing, validation, caching, and CSS string
   generation. It is **independent of `AppConfig`** to avoid logging entire
   token objects through the runtime config dump and to keep the layout
   concern decoupled from the domain config.
2. `BaseLayout.astro` calls `loadTheme()` and emits:
   - `<html data-theme="custom">` when a theme is active
   - `<style is:inline>` with `:root[data-theme="custom"] { … }` and
     optionally `:root[data-theme="custom"].dark { … }` rules. The
     `[data-theme="custom"]` selector is one specificity step above the
     baseline `:root` rules in `tokens.css`, so the override wins regardless of
     stylesheet load order.
   - An optional Google Fonts `<link>` from `fonts.cssImportHref`
   - An optional top-left logo image and overridden favicon
3. `ThemeToggle` accepts a `darkAvailable` prop. When the active theme has no
   `dark` block, the toggle hides itself and the boot script does not auto-add
   the `.dark` class.
4. App title (`CATALOG_TITLE`) stays in env — only one source of truth for
   that string.
5. Default behavior is unchanged: with `UI_THEME_CONFIG` unset, no theme is
   loaded, no inline style is emitted, no `data-theme` attribute is set, and
   the existing light/dark toggle works exactly as before.
6. Invalid or missing theme files log an error and fall back to the default
   theme — servdir always boots.

## Consequences

Pros:

- Multi-brand deployments without forking; theme config can live next to the
  catalog mount in a container.
- Default theme is byte-identical to the pre-ADR build.
- Self-contained: no dependency on any internal design-system package.
- Token validation catches typos at startup, not at runtime.

Cons / trade-offs:

- Static export bakes the theme at build time. Switching themes on a static
  deployment requires a rebuild. Documented in `docs/theming.md`.
- Theme JSON expresses only shadcn token vars + a small brand surface. Deeper
  component customisation (icon set, density, catalog-specific tokens) is
  intentionally out of scope for v1 and will be revisited if real demand
  appears.
- Google-Fonts injection requires outbound network access from clients. Air-
  gapped deployments must either omit `cssImportHref` and self-serve fonts via
  the catalog mount, or stick with the bundled defaults.

## References

- task-y13 (`.taskledger/tasks/task-y13.md`) — product input and acceptance
  criteria
- ADR 005 — Tailwind v4 CSS variable system
- ADR 011 — shadcn/ui + React islands
- `src/lib/theme.ts`, `src/lib/theme.test.ts`
- `docs/theming.md`
- `themes/orange-example.json`
