---
id: task-nzo
title: 'Catalog CSS audit follow-through: theme-safe colors, type scale, Chip primitive'
status: done
priority: high
type: refactor
created_at: 2026-05-19T21:02:28Z
updated_at: 2026-05-19T21:13:40Z
created_by: claude
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
  - css
  - shadcn
---

## Description

## Origin

Output of the 2026-05-19 styling/typography audit on the catalog UI. Captures
seven concrete cleanup items in priority order. Items 1–5 are the core
deliverable for this task (mechanical, contained, low-risk). Items 6 and 7 are
deferred follow-ups that need a small design call — separate tl tasks will be
filed if/when they're picked up.

## Items

### 1. Theme-safe semantic colors (HIGH — closes a real theming bug)

Three hardcoded Tailwind palette classes silently break custom themes:

- `src/components/ui/IssueList.tsx:15` — `text-amber-700 dark:text-amber-400`
  (warning-level issue text)
- `src/components/catalog/TagLink.tsx:18` — `text-sky-700 dark:text-sky-400`
  (every tag pill in the app)
- `src/components/catalog/ServiceValidationCard.tsx:21` — `text-green-700
  dark:text-green-400` ("No validation issues")

Fix:

- Extend `ThemeTokens` in `src/lib/theme.ts` with `warning` / `warningForeground`
  and `success` / `successForeground`.
- Add `--warning`, `--warning-foreground`, `--success`, `--success-foreground`
  to the default `:root` and `.dark` blocks in `src/styles/tokens.css` with
  sensible defaults (amber-ish and green-ish, but expressed in oklch so they
  themable).
- Register the new tokens in the `@theme inline` block so Tailwind generates
  `bg-warning`, `text-warning`, etc.
- Replace the three hardcoded classes with the new semantic tokens.
- Update the worked-example themes (`themes/orange-example.json`,
  `themes/sky-stone-example.json`) to include brand-appropriate values for
  the new tokens.
- Update `docs/theming.md` to document the new keys.

### 2. Body-font default (HIGH — single-line change, big visual impact)

`src/styles/tokens.css:138` currently applies `font-mono` to `html`, putting
the entire app in JetBrains Mono Variable by default. That made sense as a
"dev tool aesthetic" but it (a) fights any custom theme that ships a serif or
sans (e.g. Roboto Slab in sky-stone), and (b) is an unusual default for prose
reading.

Fix: change `html { @apply font-mono; }` to `html { @apply font-sans; }`.
`--font-mono` stays defined and `font-mono` utility still works for code/data.

### 3. Type scale (MEDIUM — kills the 12-arbitrary-sizes problem)

The catalog uses ≥ 12 distinct `text-[Xrem]` literals (0.66, 0.68, 0.72, 0.74,
0.82, 0.83, 0.84, 0.92, 0.95, 0.98, 1.2, 1.28). All close to Tailwind's scale,
each slightly off. Plus four arbitrary `tracking-[Xem]` values.

Introduce a 5-role scale as Tailwind component classes in
`src/styles/base.css`:

- `.text-headline` — page H1 (≈ text-4xl / text-5xl responsive)
- `.text-title` — card heading (≈ text-xl)
- `.text-body` — primary body text (text-base)
- `.text-meta` — chip text, ids, dense metadata (≈ text-sm)
- `.text-eyebrow` — uppercase section labels, count chips (≈ text-xs, with
  uppercase + tracking baked in)

Replace every `text-[Xrem]` site with the appropriate scale role. Drop the
arbitrary trackings where the scale role already encodes the intent
(eyebrow has tracking baked in).

### 4. `<Chip>` primitive (MEDIUM — collapses 4 lookalike patterns)

Four near-duplicate "small pill" patterns:

- `ServiceHeader.tsx:35` — metadata chip (kind/owner/lifecycle/…)
- `ServiceCatalogGrid.tsx:177-178, 197-198` — section count chip
- `ServiceCatalogGrid.tsx:113-117` — icon-button (kind filter)
- `ServiceCardLinkIcon.tsx` — icon link (repo/runbook/etc)

Extract `src/components/ui/Chip.tsx` with variants:

- `variant="label"` — text + optional icon, padded pill (replaces metadata chip)
- `variant="count"` — compact rounded label for counts (replaces count chips)
- `variant="icon-button"` — circular button for icon-only toggles (replaces
  filter buttons)
- `variant="icon-link"` — circular anchor for icon-only links (replaces
  link icons)

Use `cva` for variants, matching the existing shadcn primitive style. Add
unit tests for the four variants.

### 5. Card padding standard (LOW — mechanical)

`CardContent` padding values across the catalog are inconsistent: `p-7`,
`p-6.5` (non-standard!), `p-6`, `px-4 pt-4 pb-3 sm:px-5 sm:pt-5`, plus the
empty-state `px-6 py-14 text-center` (legitimate variant — keep).

Pick `p-6` as the default for content cards, keep the empty-state `px-6
py-14 text-center` as the special case, retire `p-6.5` and the bespoke
`ServiceCard` padding.

## Deferred follow-ups (file separate tl tasks if/when picked up)

### 6. Tinted-surface tokens

15+ `bg-token/NN%` opacity variants today (`bg-background/72,80,85`,
`bg-muted/40,50,60`, `bg-primary/8,10,12`). Replacing these with 2–3 named
surface tokens (`--surface-1`, `--surface-2`, `--surface-accent-soft`) would
make dark-mode behavior predictable and the design vocabulary shorter, but it
needs a real visual-design pass — punting.

### 7. Global `a {}` rule cleanup

`src/styles/base.css:13-20` makes every `<a>` `var(--primary)` with underline
on hover. This is a hidden footgun: components can't easily opt out without
explicit overrides, and prose link styling depends on the global. Either
(a) drop the global and add a `.link` utility + `.prose-catalog a { … }`
rule, or (b) keep the global but document the convention loudly. Either way
needs a small design call.

## Acceptance criteria for items 1–5

- New `warning` / `success` semantic tokens exist in `ThemeTokens`,
  `tokens.css`, the `@theme inline` block, and both ship-with-repo theme
  examples.
- Zero `text-(red|green|amber|sky|blue|orange|yellow|purple|pink|indigo)-[0-9]`
  classes remain in `src/components/`, `src/pages/`, or `src/layouts/`.
- `html` defaults to `font-sans`; `font-mono` still works as a utility.
- Zero arbitrary `text-[Xrem]` literals remain in `src/components/`,
  `src/pages/`, or `src/layouts/`. Every text usage goes through either the
  Tailwind scale (`text-xs..text-5xl`) or the new role classes.
- `src/components/ui/Chip.tsx` exists with 4 variants and unit tests.
- The 4 chip-like sites use `<Chip>`.
- All `CardContent` padding is `p-6` (default) or the empty-state special
  case.
- `docs/theming.md` documents `warning` / `success` and links to the new
  type-scale roles (brief — full design system docs are out of scope).
- `pnpm test && pnpm build && pnpm build:static` all green.

## Out of scope

- Visual redesign of the catalog (this is a cleanup task, not a redesign).
- Surface-token system (deferred).
- Global anchor-tag styling decision (deferred).
- Touching shadcn primitives in `src/components/ui/` other than Chip.

## References

- `src/lib/theme.ts`, `src/styles/tokens.css`, `src/styles/base.css`
- `src/components/catalog/*`, `src/components/ui/IssueList.tsx`,
  `src/components/ui/ServiceCard.tsx`
- `themes/orange-example.json`, `themes/sky-stone-example.json`
- `docs/theming.md`, ADR 011 (shadcn adoption), ADR 013 (theming)

## Notes

### 2026-05-19T21:13:40Z - claude

Executed items 1-5. Items 6 (surface tokens) and 7 (global a {} rule) remain deferred follow-ups as filed in the task description. Changes: added warning/success tokens to ThemeTokens + tokens.css + @theme inline + both example themes; switched body font default from font-mono to font-sans; added 5-role type scale (text-headline/title/body/meta/eyebrow) in base.css; replaced 30+ arbitrary text-[Xrem] sites; created src/components/ui/Chip.tsx with 4 variants + 5 unit tests + vitest jsx automatic runtime; wired Chip into ServiceHeader metadata chips, ServiceCatalogGrid kind-filter buttons + section count chips, ServiceCardLinkIcon; standardized CardContent padding to p-6 default and empty-state variant. docs/theming.md updated with warning/success rows. Verified: 0 hardcoded palette colors and 0 arbitrary text-[Xrem] outside src/components/ui/button.tsx (shadcn primitive, out of scope). pnpm test 172/172, pnpm build green, pnpm build:static green. Live dev-server smoke with orange theme confirms warning/success tokens emit, Chip components render, and type-scale classes apply.
