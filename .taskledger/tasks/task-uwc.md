---
id: task-uwc
title: Reorganize service detail page with sticky-TOC sectioned layout
status: open
priority: medium
type: feature
created_at: 2026-05-19T16:42:55Z
updated_at: 2026-05-19T16:42:55Z
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
  - service-page
  - shadcn
---

## Description

## Goal

Replace the current two-column service detail page with a single scrollable
page that uses **named sections + a sticky right-rail TOC**. The aim is to
make a service entry feel like a well-structured Confluence page that you can
read top-to-bottom OR jump around in via anchors — without hiding any
information behind tabs.

This is direction "A" from the 2026-05-19 service-page discussion. Direction
"B" (hybrid: keep this layout but add tab strips inside heavy sub-views like
multi-spec OpenAPI rendering or dependency graph) is the natural follow-up and
should be filed as a separate task once A is in place.

## Context observed (2026-05-19)

Current layout in `src/pages/services/[id].astro` is:

- `ServiceHeader` (name, id, kind, owner, lifecycle, system, domain, tier, tags)
- A 2-column grid:
  - left: `ServiceDocumentationCard` (markdown body + Mermaid)
  - right rail (aside): `ServiceMetadataCard`, `ServiceDependenciesCard`,
    `ServiceValidationCard`

Surfaced today (selected): kind, repository, runbook, system, domain, free
`links[]`, `openapi[]` entries, `delivery[]` entries, depends_on resolution,
validation issues.

Not currently surfaced in any dedicated section:

- `tech_stack.*` groups (`languages`, `frameworks`, `data`, `platform`,
  `tooling`)
- `description` is in front matter but not consistently shown above the body
- `platform` (free-form string) is only used for grouping on the catalog index

## Proposed section order

1. **Overview** — current `ServiceHeader` content + `description` rendered
   under the name. Kind, owner, lifecycle, tier, system, domain become a
   compact key/value strip rather than a sentence run-on.
2. **Documentation** — current `ServiceDocumentationCard` (markdown body,
   including Mermaid). Heading is `## Documentation` but the body inside
   keeps the author's markdown structure.
3. **APIs & interfaces** — `openapi[]` entries listed as labelled links.
   Leave room for a future `provides` field and inline spec preview (task B).
4. **Operations** — `runbook`, `delivery[]`, and any `links[]` whose role is
   operational (dashboards, alerts). For v1, keep `links[]` here verbatim;
   role classification can be a later task.
5. **Tech stack** — render `tech_stack.languages/frameworks/data/platform/tooling`
   as small grouped badge clusters. This data exists in the schema today
   (`docs/service-definition.md`) but the detail page does not show it.
6. **Dependencies** — current `ServiceDependenciesCard`.
7. **Quality** — current `ServiceValidationCard`.

Each section gets a stable `id` slug (`overview`, `documentation`, `apis`,
`operations`, `tech-stack`, `dependencies`, `quality`) so anchor links are
shareable.

## Sticky TOC

A right-rail component that:

- lists the seven section names with anchor links
- highlights the section currently in viewport (IntersectionObserver, not
  scroll math)
- is `position: sticky; top: <header-offset>` on `xl+` screens
- collapses into a "Jump to" disclosure or just hides on smaller screens
- omits any section that would render empty (e.g. no `openapi[]` → no "APIs &
  interfaces" entry AND no empty section header in the page body)

## Component shape (proposal — open to revision)

```
ServiceDetailPage (page)
  └── ServiceSectionLayout
        ├── main column
        │     ├── ServiceOverviewSection      (replaces ServiceHeader role)
        │     ├── ServiceDocumentationSection (wraps existing card)
        │     ├── ServiceApisSection
        │     ├── ServiceOperationsSection
        │     ├── ServiceTechStackSection
        │     ├── ServiceDependenciesSection  (wraps existing card)
        │     └── ServiceQualitySection       (wraps existing card)
        └── aside column
              └── ServiceTableOfContents (sticky, IntersectionObserver-driven)
```

Sections are small wrappers that own their `<section id=...>`, heading, and
"is-empty → return null" logic. Existing cards are kept where the content is
non-trivial; new sections (Overview, APIs, Operations, Tech Stack) are new
components.

Sections share a single tiny `ServiceSection` shell so heading styles, empty
handling, and anchor IDs are uniform.

## Out of scope (file as follow-ups)

- Inline OpenAPI spec rendering (Swagger UI) — direction B.
- Dependency graph visualization — direction B.
- Git change history of `service.md`.
- Reclassifying `links[]` by role (`dashboard`, `alert`, `repo`, ...).
- Adding a first-class `provides` field to the schema (separate decision,
  likely needs ADR).

## Acceptance criteria

- The detail page renders all current information AND `tech_stack.*` and
  `description` without losing anything currently visible.
- Sections without data are not rendered (no empty headers, no TOC entries
  pointing at empty sections).
- TOC entries are anchor links; clicking one scrolls the section into view
  and the URL hash updates. Reloading on a deep link lands at that section.
- The current section is visually highlighted in the TOC as the user scrolls.
- The page is usable on mobile (TOC hides or collapses; sections flow
  vertically).
- No regressions in print or static-export rendering. Static build still
  prerenders every service page.
- `pnpm test && pnpm build && pnpm build:static` all green.
- New section components have a `*.test.tsx` covering at least the empty-state
  null-return.

## References

- `src/pages/services/[id].astro`
- `src/components/catalog/Service{Header,DocumentationCard,MetadataCard,DependenciesCard,ValidationCard}.tsx`
- `docs/service-definition.md` — full schema, including `tech_stack.*`
- `docs/working-notes.md` "Service list and card conventions" — existing
  conventions for kind icons and link types that this page should stay
  consistent with
- ADR 011 — shadcn/ui + React islands (use existing primitives where they fit)

## Notes for whoever picks this up

- Start with a structural refactor that keeps existing cards inside new
  section wrappers and renders them in the new order — *no* visual changes
  yet. Verify the page still looks right.
- Then add the TOC and the section IDs.
- Then add the new sections (Overview rework, APIs, Operations, Tech Stack),
  one PR per section is fine and probably easier to review.
- Resist the temptation to redesign the right-rail cards while you're in
  there — that is a separate visual-design pass and will balloon the diff.
