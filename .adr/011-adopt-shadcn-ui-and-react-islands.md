# 11. Adopt shadcn/ui and React Islands for the UI Layer

Status: Accepted
Status Date: 2026-05-03
Driver: Alexander
Supersedes: 005-adopt-tailwind-css-v4-as-the-ui-styling-system.md

## Context

ADR 005 deferred shadcn/ui at the time, noting it would add unnecessary complexity before
the product needs justified it. The MVP has since been built and the UI component set has
grown to the point where maintaining a bespoke CSS class system has more friction than it
saves.

The project needs:
- A consistent component platform with dark/light theme switching
- Accessible interactive components (tabs, popovers) without writing vanilla JS
- A cleaner upgrade path for future UI work

## Decision

Adopt shadcn/ui (nova preset) as the component platform. All UI components become React
`.tsx` files. Astro pages keep their `.astro` shells for routing and server-side data
loading. React is added via `@astrojs/react`.

The dark/light theme is implemented via CSS custom properties (`--background`,
`--foreground`, etc. from shadcn) with a class toggle on `<html>`. A small inline
`<script is:inline>` in `BaseLayout.astro` prevents flash-of-wrong-theme on load.

The vanilla JS scripts (`catalog-grid.ts`, `catalog-status-card.ts`, `mermaid-render.ts`)
are replaced by React component state and `useEffect`.

## Options Considered

### Option 1: shadcn/ui + React islands (chosen)
- Pros: unified component system, shadcn CLI, dark mode native, accessible primitives
- Cons: React hydration overhead for display components; mitigated by Astro's SSR

### Option 2: Astro components + shadcn CSS tokens only
- Pros: no React dependency
- Cons: not really using shadcn as a platform, no component ecosystem

### Option 3: Continue with bespoke CSS
- Pros: no new dependencies
- Cons: growing maintenance burden, no dark mode, no accessible component primitives

## Consequences

- `@astrojs/react` is a production dependency
- All UI components are `.tsx`; Astro components handle only routing and data loading
- The `astro-icon` package is removed; icons are custom SVGs loaded via Vite `?raw`
- `components.css` is deleted; styles live in component files using Tailwind semantics
- Display-only components: no `client:*` (SSR only). Interactive: `client:load`
