# AGENTS.md

This repository is for a simple service catalog product.

## Purpose
Build a service catalog that engineers actually want to use.

Core idea:
- Git is the database
- Markdown files with frontmatter are the source of truth
- The first goal is to be better than handwritten Confluence pages

## Start Here
Before making architectural or product-level changes, read:
1. `docs/prd.md`
2. `.adr/*.md`
3. `docs/working-notes.md`

## Current Architecture Direction
- Use TypeScript end-to-end
- Use Astro web app shell
- Keep the product simple and content-centric
- Add React or other islands only when real interactivity demands it

## Key Constraints
- Do not introduce a database for the MVP without documenting the decision in an ADR
- Keep the catalog core separate from source ingestion and future sync/scheduler concerns
- Keep production deployment Docker-friendly
- Keep local development fast and possible without Docker
- Treat catalog files and config as external to the production image
- Keep the default Node server runtime stable, static export is additive and should not quietly break the primary deployment path

## Source of Truth
Shared project truth lives in repository files, not in conversation history.

Use these layers (docs) deliberately:
- `docs/prd.md` for product intent and scope
- `docs/user-stories.md` for feature pipeline and planing
- `.adr/` for architecture decisions (assume adr cli or install it https://github.com/aholbreich/adr-tool)
- `docs/working-notes.md` for active thinking, unresolved questions, and design residue

## Decision Rules
Create or update an ADR when changing architecture.
Do not create ADRs for small implementation details.
Think API first. Ask if unsure.

## Implementation Guidance
Prefer boring, explicit structure over clever abstractions.

Good:
- small modules
- clear domain types
- explicit adapters
- straightforward config handling
- page-model loaders for page-specific orchestration instead of pushing catalog traversal into page files
- extending the local component set before reaching for an external UI/component library


## Future Features
A likely next feature is periodic scanning of configured repositories.

When working on that:
- keep sync state isolated from the core catalog model
- prefer a simple internal scheduler first
- keep local state minimal and well-bounded
- avoid letting sync concerns dominate the base architecture

## Workflow
When making meaningful changes:
1. update docs if the understanding changed
2. keep commits small and clear
3. prefer commit messages that explain intent

## Testing instructions
- Find the CI plan in the `.github/workflows` folder.
- Add or update tests for the code you change, even if nobody asked.
- Fix any test or type errors until the whole suite is green.

Default verification baseline:
- `pnpm test && pnpm build`

When changes touch build config, routing, page generation, deployment mode handling, middleware behavior, or catalog loading paths, also verify the static flavor explicitly:
- `pnpm build:static`

If you change static-preview behavior or static-hosting instructions, also sanity-check:
- `pnpm preview:static`

Important:
- the default Node/server build is still the primary deployment path and must not regress silently
- static export is a secondary mode and should be verified when relevant, not forgotten

## If You Are Another Agent / Another Machine
Assume no conversational memory.
Recover project context from the repository itself.
If something important was only said in chat and not written down, write it down before relying on it.
