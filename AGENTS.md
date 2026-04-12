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
- Use Astro for the MVP UI and web app shell
- Keep the product simple and content-centric
- Prefer server-rendered pages first
- Add React or other islands only when real interactivity demands it

## Key Constraints
- Do not introduce a database for the MVP without documenting the decision in an ADR
- Keep the catalog core separate from source ingestion and future sync/scheduler concerns
- Keep production deployment Docker-friendly
- Keep local development fast and possible without Docker
- Treat catalog files and config as external to the production image

## Source of Truth
Shared project truth lives in repository files, not in conversation history.

Use these layers (docs) deliberately:
- `docs/prd.md` for product intent and scope
- `.adr/` for architecture decisions (assume adr cli or install it https://github.com/aholbreich/adr-tool)
- `docs/working-notes.md` for active thinking, unresolved questions, and design residue

## Decision Rules
Create or update an ADR when changing:
- core stack choices
- deployment model
- source-of-truth model
- sync / scheduler model
- persistence model
- major architecture boundaries
- API decisions

Do not create ADRs for small implementation details.
Think API first. Ask if unsure.

## Implementation Guidance
Prefer boring, explicit structure over clever abstractions.

Good:
- small modules
- clear domain types
- explicit adapters
- straightforward config handling

Avoid early:
- generic plugin systems
- overbuilt event systems
- distributed jobs
- premature microservices
- frontend complexity without proven need

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
- Find the CI plan in the .github/workflows folder.
- From the package root you can just call `pnpm test`. The commit should pass all tests before you merge.
- Fix any test or type errors until the whole suite is green.
- Add or update tests for the code you change, even if nobody asked.

## If You Are Another Agent / Another Machine
Assume no conversational memory.
Recover project context from the repository itself.
If something important was only said in chat and not written down, write it down before relying on it.
