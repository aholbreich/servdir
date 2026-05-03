# shadcn/ui Theme Migration Design

**Date:** 2026-05-03
**Status:** Approved
**Branch:** `feat/shadcn-ui`
**Supersedes:** ADR 005 (adopt-tailwind-css-v4-as-the-ui-styling-system)

## Goal

Introduce shadcn/ui as the component platform for servdir's UI, replacing the current
bespoke Astro component + custom CSS token system. Add dark/light theme switching that
works client-side. Migrate all existing UI components to shadcn-based React components
in a single feature branch (big-bang migration).

## Non-Goals

- Multiple color palette variants beyond dark/light (architecture supports it, not built now)
- Any changes to the catalog data model or loading logic
- New pages or features — this is a UI layer migration only

## Setup

**Init command:**
```bash
pnpm dlx shadcn@latest init --preset nova
```

The `nova` preset provides a clean neutral base. The CLI auto-detects the Astro framework,
Tailwind v4, and the existing CSS entry at `src/styles/tokens.css`.

**What init produces:**
- `components.json` — shadcn project config
- Import alias `@/` → `src/` added to `tsconfig.json`
- shadcn CSS variables injected into `src/styles/tokens.css` via `@theme inline`
- `@astrojs/react` + React peer deps installed

**`astro.config.mjs`:** Add `react()` from `@astrojs/react` to the integrations array.

## File Structure

```
src/
  components/
    ui/              ← shadcn auto-generated primitives (Button, Card, Badge, …)
    catalog/         ← catalog components migrated to .tsx
  layouts/
    BaseLayout.astro ← Astro shell; gains theme-init inline script + ThemeToggle island
  styles/
    tokens.css       ← shadcn CSS vars replace the old --color-* tokens
    base.css         ← stripped to scroll-behavior reset + font-family only
    components.css   ← deleted; styles move into .tsx files
    global.css       ← unchanged entry point (imports tokens + base)
```

## Theme System

### CSS Variables

shadcn defines light and dark token sets in `tokens.css` using Tailwind v4's
`@theme inline` block. Switching themes means toggling `class="dark"` on `<html>`.
No parallel token systems — the old `--color-bg`, `--color-accent`, etc. are removed.

### Flash Prevention

An inline `<script is:inline>` in `BaseLayout.astro` `<head>` runs synchronously
before paint, reading `localStorage.theme` and applying the `dark` class if needed:

```html
<script is:inline>
  const theme = localStorage.getItem('theme') ?? 'system';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
</script>
```

### ThemeToggle Component

`src/components/ui/ThemeToggle.tsx` — a React component with `client:load` in the
layout. Reads `localStorage.theme`, toggles the `dark` class on `<html>`, and persists
the choice. Uses shadcn `Button` with a lucide icon. Rendered in the top-right of the
app shell via `BaseLayout.astro`.

### Extensibility

Adding a third theme requires a new CSS variable block under a new selector
(e.g. `[data-theme="hc"]`) and updating the toggle logic. No structural changes.

## Component Migration Map

### Primitive Replacements

| Current | Replaces with | Notes |
|---|---|---|
| `Badge.astro` | shadcn `Badge` | variant props replace `.pill`, `.pill-ok`, `.pill-warn` |
| `Card.astro` | shadcn `Card` + `CardHeader` + `CardContent` | |
| `SectionTitle.astro` | inline `<h2>` with Tailwind semantics | too thin to warrant a component |
| `Icon.astro` | lucide-react imports directly | astro-icon removed |
| `KeyValueList.astro` | `KeyValueList.tsx` with Tailwind | no shadcn equivalent, kept as custom |
| `MetadataPill.astro` | shadcn `Badge` variant | |

### Catalog Components → `.tsx`

| Current | Migrated to | shadcn primitives used |
|---|---|---|
| `ServiceCard.astro` | `ServiceCard.tsx` | `Card`, `Badge` |
| `ServiceCardGrid.astro` | `ServiceCardGrid.tsx` | layout wrapper only |
| `ServiceHeader.astro` | `ServiceHeader.tsx` | `Badge` for lifecycle/status |
| `CatalogHero.astro` | `CatalogHero.tsx` | |
| `TagCloud.astro` + `TagLink.astro` | `TagCloud.tsx` | `Badge` with `asChild` for links |
| `IssueList.astro` | `IssueList.tsx` | `Alert` for errors/warnings |
| `ServiceCompactList.astro` | `ServiceCompactList.tsx` | |
| `CatalogStatusPanel.astro` + tabs/cards | `CatalogStatusPanel.tsx` | `Tabs`, `Card` |
| `CatalogStatusGitSourcesPopover.astro` | `CatalogStatusGitSourcesPopover.tsx` | `Popover` — needs `client:load` |
| `ServiceDependenciesCard.astro` | `ServiceDependenciesCard.tsx` | `Card` |
| `ServiceDocumentationCard.astro` | `ServiceDocumentationCard.tsx` | `Card` |
| `ServiceMetadataCard.astro` | `ServiceMetadataCard.tsx` | `Card` |
| `ServiceValidationCard.astro` | `ServiceValidationCard.tsx` | `Alert`, `Card` |
| `PlatformList.astro` | `PlatformList.tsx` | |

## Data Flow & Astro/React Integration

**Boundary rule:** Astro pages own data fetching and routing. React components are
pure rendering — they receive props and produce HTML. No React component loads catalog
data directly.

**Page pattern:**
```astro
---
import { loadService } from '@/lib/catalog';
import ServiceHeader from '@/components/catalog/ServiceHeader';
import ServiceMetadataCard from '@/components/catalog/ServiceMetadataCard';
const service = await loadService(Astro.params.id);
---
<BaseLayout title={service.name}>
  <ServiceHeader service={service} />
  <ServiceMetadataCard service={service} />
</BaseLayout>
```

**Hydration strategy:** Display-only components render as static HTML — Astro
server-renders React without shipping client JS unless `client:*` is explicit.
Only `ThemeToggle` and `CatalogStatusGitSourcesPopover` require `client:load`.
All other components: zero client-side JS.

**Types:** Existing TypeScript catalog types (`Service`, `Platform`, etc.) flow into
React component props unchanged. No new data layer.

## CSS Cleanup

- `tokens.css` — shadcn variables replace all `--color-*` custom tokens
- `components.css` — deleted entirely; component styles live in `.tsx` files
- `base.css` — stripped to scroll-behavior + font-family only
- `global.css` — unchanged (entry point, imports tokens + base)

All `@apply` references to deleted classes must be removed from `.astro` pages.

## ADR

A new ADR must be written to supersede ADR 005, recording the decision to adopt
shadcn/ui + React islands and the reasoning (component ecosystem, theme system,
long-term maintainability).

## Verification

Per project CLAUDE.md:
```bash
pnpm test && pnpm build
pnpm build:static
```

All existing tests must pass. Build must produce valid output in both server and
static modes before the branch is mergeable.
