---
id: task-y13
title: Explore UX configurability and theming
status: done
priority: medium
type: feature
created_at: 2026-05-19T15:26:42Z
updated_at: 2026-05-19T15:56:16Z
created_by: pi
assignee: null
depends_on: []
claim:
  actor: null
  claimed_at: null
  expires_at: null
  heartbeat_at: null
tags:
  - ux
  - theming
  - shadcn
---

## Description

Goal: make the service catalog UI/components configurable enough that a deployed instance can use the design language without forking every component.

Context observed:
- App uses Astro + Tailwind CSS v4 + shadcn/ui React islands. ADR 011 adopted shadcn/ui; ADR 005 adopted Tailwind v4.
- Current app tokens live in src/styles/tokens.css and map shadcn variables such as --background, --foreground, --primary, --card, --border, --radius, fonts, etc. BaseLayout currently applies light/dark via a .dark class and includes ThemeToggle.
-tokens/allTokens.ts. Useful token facts: CSS vars are named --mds-..., brand primary is orange, brand secondary is deep blue, fonts are Lato text and Montserrat display, spacing is a rem scale, shadows and semantic colors are defined.
- Attempted to fetch the Confluence design pages via confluence-browser-fetch on 2026-05-19; auth succeeded, but the provided page IDs returned REST 404 and CQL searches in space MDS found no matches. Re-try or ask for current page URLs/permissions before relying on Confluence.

Decision/options to grill product/owner on before implementation:
Build-time vs runtime: should theme be selected at build/deploy time (simpler, fewer bytes, less UI complexity) or switchable at runtime (more flexible, useful for previews/demos)?


Recommended incremental plan:

A. Add a small app theme contract: semantic CSS vars, font vars, radius, optional assets, and a typed list of supported themes.
B. Implement build/deploy-selected theme first (default current theme + orange theme) by loading a theme CSS file before/after src/styles/tokens.css.
C. Add optional runtime switch only if needed for demos/admin UX; do not start with it unless product needs multi-theme switching.
D. Create a orange theme CSS mapping shadcn variables to orange tokens: orange/deep-blue brand colors, Lato/Montserrat fonts, neutral grays, semantic success/warning/danger/info, shadows, and radius.
E. Document deployment: how to set the theme in Docker/Kubernetes and how to supply fonts/assets.

Acceptance criteria:

- Maintainer has answered the grill questions or selected a default path.
- A documented theme mechanism exists and keeps current default UI unchanged.
- A orange theme can be selected for a deployment without editing every component.
- Theme covers shadcn primitives used in src/components/ui and catalog components using CSS variables.
- pnpm test && pnpm build pass; if deployment/build config changes, pnpm build:static also passes.

References to inspect:

- src/styles/tokens.css, src/styles/base.css, src/layouts/BaseLayout.astro
- src/components/ui/* and src/components/catalog/*
- docs/DESIGN.md, .adr/005-adopt-tailwind-css-v4-as-the-ui-styling-system.md, .adr/011-adopt-shadcn-ui-and-react-islands.md


## Notes

### 2026-05-19T15:31:22Z - pi

Product/owner answers captured 2026-05-19:
1. Scope: servdir needs reusable multi-brand theming. 
2. Theme selection: build/deploy-time selection is acceptable and preferred if easier; runtime switching is not required initially.
3. Token source/configurability: keep servdir self-contained. A full copied/embedded theme definition is acceptable if it makes configuration easy. It does not need 100% design-system parity; start with basic colors, rounding, and fonts if not too complex.
4. Component depth: start with shadcn token mapping only. No deep catalog component redesign required for the first iteration.
5. Dark mode: orange can be light-only initially. Existing default theme dark support should not regress unless explicitly decided.
6. Deployment API: external config file is the preferred compromise for selecting/providing a theme.
7. Brand assets: logo support would be valuable. Include it in the theme/config contract if reasonably small.
8. Dependency policy: servdir must remain self-contained;

Refined implementation direction:
- Design a generic theme contract/config file
- Support deploy-time selection/loading of a theme config/CSS.
- Keep the default theme unchanged.
- Add a sample orange-like light theme as local/self-contained example using copied values for colors/fonts/radius where appropriate.
- Include optional logo/favicon/app-brand fields if they fit cleanly.
- Map config values to shadcn CSS variables first; leave deeper component variants for later tasks.

### 2026-05-19T15:56:16Z - claude

Implemented deploy-time theming via UI_THEME_CONFIG. New files: src/lib/theme.ts (loader + validator + CSS emitter), src/lib/theme.test.ts (11 unit tests), themes/orange-example.json (sample), docs/theming.md (schema + verification steps), .adr/013-app-level-theming-via-config-file.md (decision record). Modified: BaseLayout.astro (data-theme attribute, inline style block, optional Google Fonts link, optional logo/favicon, ThemeToggle gating), ThemeToggle.tsx (darkAvailable prop), .env.example, README.md, working-notes.md. Specificity: :root[data-theme="custom"] beats default :root regardless of stylesheet source order. App title stays on CATALOG_TITLE env (single source of truth, not in theme JSON). Theme load failures log + fall back to default. Static export bakes theme at build time (documented). Verified: pnpm test (167/167), pnpm build, pnpm build:static, dev-server curl with and without UI_THEME_CONFIG. NOT verified: visual paint correctness in a real browser — environment cannot run one.
