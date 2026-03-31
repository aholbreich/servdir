# Working Notes

## Why this file exists
This file preserves useful design context that is not formal enough for the PRD or an ADR.

Use it for:
- unresolved questions
- design ideas worth revisiting
- implementation watchouts
- future feature notes
- session-to-session continuity

## Current direction
- Build a simple service catalog for engineers
- Keep the MVP significantly simpler than a traditional CMDB
- Git is the database
- Markdown with YAML frontmatter is the source of truth
- TypeScript is the main language
- Astro is the chosen MVP framework
- Production should ship as a Docker image
- Local development should work directly without Docker
- Production config and catalog content should live outside the built image
- As MVP minimum baseline: this catalog should have more value than Services described in Confluence

## Confirmed decisions already captured elsewhere
See:
- `docs/prd.md`
- `.adr/001-choose-typescript-and-astro-for-mvp.md`
- `.adr/002-use-git-backed-markdown-as-source-of-truth.md`
- `.adr/003-deploy-as-stateless-container-with-external-catalog-path.md`
- `.adr/004-separate-catalog-core-from-source-ingestion-and-sync.md`

## Important design reminders
- Do not overbuild the frontend too early
- Do not let future repository sync requirements distort the MVP
- Validation is part of the product, not just plumbing
- The catalog core should remain independent of future scheduling/sync concerns

## Open questions
- Should `provides` become a first-class field in the initial schema?
- Should validation status be stored only in memory, or exposed through a small explicit model?
- Should local development support file watch and hot reload for catalog changes in the first implementation?
- When repository scanning arrives, what is the smallest acceptable persistent state model?
- Should sync metadata eventually use JSON files or SQLite?
- Should repository scanning be feature-flagged at first?

## Future feature ideas
### Repository scanning
Likely next feature after the MVP foundation:
- configure one or more repositories
- periodically fetch or sync them
- scan for service definition files
- merge or expose findings through the catalog model
- track sync status and last run state

### Validation UX
Potential useful additions:
- validation details page
- warnings vs errors distinction
- unresolved dependency view
- duplicate id diagnostics

### Authoring support
Potential later additions:
- example templates for new services
- schema docs for maintainers
- CLI helper for generating a new service entry

## Suggested near-term implementation order
1. scaffold project structure
2. add config module
3. add catalog domain model
4. add parser + validator
5. add local filesystem source adapter
6. add list page
7. add detail page
8. add Docker packaging
9. improve validation UX

## Working assumption
The catalog is the product.
Repository scanning is a future ingestion mechanism, not the foundation of the system.
