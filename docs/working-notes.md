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
- Tailwind 4 for styling
- Production should ship as a Docker image (Kubernetes and Gitops ready)
- Local test should work directly without Docker
- Local test should be possible with Containers too.
- Production config and catalog content should live outside the built image
- As MVP minimum baseline: this catalog should have more value than Services described in Confluence
- The catalog can now merge a local source with one or more managed Git sources
- Managed Git sync is now handled by a small in-process scheduler instead of syncing on every request

## Confirmed decisions already captured elsewhere

See:

- `docs/prd.md`
- `.adr/001-choose-typescript-and-astro-for-mvp.md`
- `.adr/002-use-git-backed-markdown-as-source-of-truth.md`
- `.adr/003-deploy-as-stateless-container-with-external-catalog-path.md`
- `.adr/004-separate-catalog-core-from-source-ingestion-and-sync.md`
- `.adr/006-add-app-managed-git-checkout-for-multiple-catalog-sources.md`
- `.adr/007-protect-the-catalog-with-basic-auth.md`
- `.adr/008-add-an-in-process-git-sync-scheduler.md`

## Important design reminders

- Do not overbuild the frontend too early
- Do not let future repository sync requirements distort the MVP
- Validation is part of the product, not just plumbing
- The catalog core should remain independent of future scheduling/sync concerns
- Request rendering should not perform Git network operations
- For managed Git, keep sync and checkout management boring and predictable
- The common Kubernetes case should stay simple: `emptyDir` cache, mounted SSH key, mounted `known_hosts`
- Basic Auth realm is fixed to `servdir`
- Probe endpoints should stay unauthenticated: `/health/live` for liveness and `/health/ready` for config/readiness checks

## Cross-session handoff essentials

Read this section first when picking the project up in a fresh session.
It exists so future agents do not need to reconstruct important context from chat history.

### Verification baseline

Use this as the default verification set after UI, routing, or build-related changes:
- `pnpm test`
- `pnpm build`
- `pnpm build:static`

Reason:
- servdir intentionally supports both the default server runtime and a secondary static export mode
- recent work touched both UI composition and route/build behavior, so checking only one build mode is not enough

### Current icon strategy

- Astro icons are wired through `astro-icon` in `astro.config.mjs`
- app code should go through `src/components/ui/Icon.astro`, not raw `astro-icon` usage spread across the codebase
- app-specific icons live as local SVGs under `src/icons/`
- when a UI needs semantic icons, prefer a small explicit mapping helper plus local SVGs over introducing a large external icon set

Reason:
- local SVGs are predictable and avoid fragile icon-set dependencies for a small number of domain-specific icons
- the wrapper keeps icon usage consistent and easier to change later

### Catalog status card structure

The catalog status area was intentionally split into small Astro pieces for readability:
- `src/components/catalog/CatalogStatusCard.astro` — composition shell
- `src/components/catalog/CatalogStatusTabs.astro` — tab buttons
- `src/components/catalog/CatalogStatusPanel.astro` — accessible panel wrapper
- `src/components/catalog/CatalogStatusDetailList.astro` — shared detail grid
- `src/components/catalog/CatalogStatusGitSourcesPopover.astro` — compact Git source details popover
- `src/lib/catalog-status.ts` — pure labels/format/id helpers
- `src/scripts/catalog-status-card.ts` — tab and popover behavior

Preserve these boundaries unless there is a clear readability win.
Do not collapse them back into one large `.astro` file.

### Service list and card conventions

- compact list rows now show a small kind icon before the stable service id
- kind icon mapping lives in:
  - `src/components/catalog/CatalogKindIcon.astro`
  - `src/lib/catalog-kind-icon.ts`
- currently supported explicit kinds are:
  - `service`
  - `tool`
  - `application`
  - `library`
  - `component`
  - `iac`
- unknown kinds are still allowed and intentionally fall back to a default icon

For service cards:
- the footer was intentionally simplified to icon-only actions for stable first-class links only
- current stable card actions are:
  - repository
  - runbook
  - OpenAPI
  - delivery / CI when a URL exists
- free-form `links[]` are intentionally excluded from the card footer because icon-only affordances become ambiguous there
- card action selection lives in `src/lib/service-card-links.ts`

### Small helper extraction rule

When a page/component repeats a small piece of non-trivial logic more than once, prefer extracting it into a tiny tested helper instead of keeping parallel inline copies.

Current examples:
- `src/lib/catalog/service-summary.ts` — shared fallback summary derivation
- `src/lib/page.ts` — shared route/page response helpers

This is the preferred level of abstraction here:
- small and boring helpers are good
- generic framework-y abstraction layers are not

## Recent implementation notes

### Managed Git scheduler and sync behavior

- Managed Git sync previously happened on the request path and caused repeated pulls, race conditions, and noisy logs.
- This has been replaced with an in-process scheduler that syncs on startup and then periodically.
- Requests now read from local checkout state and do not perform Git sync work.
- Sync is locked per `checkoutPath` so overlapping requests or cycles do not clone/pull the same source concurrently.
- The old `git pull --ff-only origin <branch>` approach caused brittle behavior (`Cannot fast-forward to multiple branches`).
- Current sync behavior is closer to a disposable cache model:
  - `git fetch origin <branch>`
  - `git checkout <branch>`
  - `git reset --hard origin/<branch>`
- Invalid partial checkout directories are removed before retrying clone.

### Logging direction

- Startup/config logs were too noisy when config was recomputed per request.
- Config is now cached so those logs are emitted once per process instead of on every page render.
- Useful log categories now include:
  - scheduler startup
  - startup sync cycle start/finish
  - interval sync cycle start/finish
  - per-source sync start/success/failure with duration
  - scan patterns and discovered file counts
  - git-backed parse warnings with per-file validation details
- The system now keeps a validated in-memory catalog snapshot and serves requests from that snapshot instead of rescanning and reparsing on each page render.
- After sync cycles, servdir refreshes the snapshot in the background and keeps serving the last known good catalog if a refresh fails.
- The cache/snapshot logic now lives as an explicit catalog cache subsystem instead of being hidden inside `load.ts`, to make later stats, debug views, and observability easier to extend.

### Dual deployment modes

- Servdir now supports two deployment flavors:
  - default Node server runtime
  - explicit static export mode
- Static export is additive and should not destabilize the main server path.
- Current static flow is aimed at GitHub Pages first, with base-path-aware internal links and a dedicated Pages workflow.
- Static mode intentionally skips runtime-only concerns such as middleware auth enforcement and scheduler-driven Git sync.
- Static build was re-verified after the catalog status card refactor, and `pnpm build:static` still completes successfully.
- Build/test reminder for future work:
  - baseline: `pnpm test && pnpm build`
  - when relevant to build/routing/deployment paths: `pnpm build:static`

### Catalog entry model broadening

- The catalog started service-first, but the model now supports a broader optional `kind` field.
- If `kind` is omitted, it defaults to `service`.
- Current examples of broader entry types include:
  - `application`
  - `tool`
- This is meant to broaden the catalog without renaming the whole product or breaking older service definitions.

### Tag navigation

- Visible tags now link to dedicated tag pages.
- The catalog now has:
  - `/tags` for the tag index
  - `/tags/[tag]` for tag-specific listings
- Important implementation lesson: do not nest tag links inside a row-level anchor in list views. That broke the compact list and had to be fixed by restructuring the row markup.

### SSH behavior and local container testing

- App-managed Git checkout/pull should prefer SSH repository access keys over provider API tokens.
- Common container/Kubernetes defaults are:
  - `/etc/servdir/ssh/id_ed25519`
  - `/etc/servdir/ssh/known_hosts`
- The implementation no longer forces `IdentitiesOnly=yes` in the default `GIT_SSH_COMMAND` because that was stricter than many working local SSH setups.
- Important operational lesson: mounting `~/.ssh` into a container is not equivalent to having the host SSH environment.
- In the tested local setup, host `ssh -Tv git@bitbucket.org` succeeded because authentication used `ssh-agent`, not just the raw private key file.
- Containerized Git without agent forwarding may still prompt for a passphrase even if host `git clone` works normally.
- For docs and real deployments, the recommended path remains a dedicated repository access key without passphrase.
- For local debugging, mounting personal SSH files can work, but it is an interactive convenience path, not a good production-like example.

### Documentation added or improved

- Added `docs/kubernetes.md` for Kubernetes deployment, Flux/SOPS-friendly config patterns, SSH setup, and operational notes.
- Added `docs/service-definition.md` describing the `service.md` contract:
  - required and optional front matter fields
  - Markdown body behavior
  - validation behavior
  - discovery rules for local and managed Git sources
- Added ToCs to `README.md`, `docs/kubernetes.md`, and `docs/service-definition.md`.
- README now has a direct link to the service definition reference, similar to the Kubernetes guide link.

### Current UI component structure

Reusable UI building blocks currently in use:

- `src/components/ui/Badge.astro` — compact status/tag pills
- `src/components/ui/Card.astro` — shared card shell
- `src/components/ui/IssueList.astro` — validation issue rendering
- `src/components/ui/KeyValueList.astro` — metadata key/value and link list rendering
- `src/components/ui/MetadataPill.astro` — compact icon-plus-label chip for service attributes
- `src/components/ui/SectionTitle.astro` — consistent section headings
- `src/components/ui/ServiceCard.astro` — dense reusable service list card
- `src/components/catalog/ServiceCatalogGrid.astro` — service grid plus empty-state handling for the index page
- `src/components/catalog/CatalogHero.astro` — index-page hero section for catalog identity and intro text
- `src/components/catalog/CatalogStatusCard.astro` — compact catalog status summary card, now mostly a composition shell
- `src/components/catalog/CatalogStatusTabs.astro` — icon-only tab controls for the status card
- `src/components/catalog/CatalogStatusPanel.astro` — tab panel wrapper with shared accessibility wiring
- `src/components/catalog/CatalogStatusDetailList.astro` — reusable detail grid for configuration/runtime/issues sections
- `src/components/catalog/CatalogStatusGitSourcesPopover.astro` — small overlay for managed Git source details
- `src/components/catalog/ServiceHeader.astro` — detail-page header with service identity, summary state, and tags
- `src/lib/catalog/service-summary.ts` — shared service excerpt fallback logic for card/list-style summaries
- `src/lib/page.ts` — app-aware route helpers such as 404 redirect responses
- `src/components/catalog/ServiceDocumentationCard.astro` — detail-page documentation body card
- `src/components/catalog/ServiceMetadataCard.astro` — detail-page metadata and OpenAPI sections
- `src/components/catalog/ServiceDependenciesCard.astro` — detail-page dependency list
- `src/components/catalog/ServiceValidationCard.astro` — detail-page validation state card

Design reminder:

- keep repeated route responses and small presentation derivations in lib helpers once they appear in more than one page/component

- prefer extending these components or adding adjacent catalog-scoped components before pushing more layout logic back into page files
- keep generic UI primitives in `src/components/ui/`
- keep domain-aware catalog components in `src/components/catalog/`
- keep page files mostly orchestration plus layout composition, not presentation-heavy mapping

### Future direction: architecture diagrams and Pulumi context

- There is user interest in surfacing Pulumi-generated architecture drawings from the service catalog.
- Current recommendation is to show architecture context on the same service detail page, not on a separate page.
- Short-term pragmatic option: represent Pulumi drawings as links.
- Likely future product direction: support a more explicit architecture/diagram field once the shape is clearer.
- If this becomes first-class, likely questions are:
  - remote URLs only vs local files stored beside `service.md`
  - generic architecture references vs Pulumi-specific modeling
  - how diagram previews should be rendered on the service page

## Open questions

- Should `provides` become a first-class field in the initial schema?
- Should validation status be stored only in memory, or exposed through a small explicit model?
- Should local development support file watch and hot reload for catalog changes in the first implementation?
- What is the smallest useful runtime sync status model to expose, if a health/debug endpoint is added?
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

### Architecture diagrams

Potential useful additions:

- support Pulumi-generated architecture diagrams on service detail pages
- start with generic link-based support if needed
- later consider first-class architecture metadata
- evaluate whether diagram assets should be remote only or allowed inside the catalog repo next to `service.md`

### Authoring support

Potential later additions:

- example templates for new services
- schema docs for maintainers
- CLI helper for generating a new service entry

## Suggested near-term improvements

1. Expose a small health or debug view for sync state, for example last sync time, last success, last error, and source status.
2. Improve validation UX in the UI, especially duplicate id diagnostics, unresolved dependency visibility, and clearer warning vs error treatment.
3. Decide whether `provides` should become a first-class field in the service definition schema.
4. Decide how Pulumi and other architecture diagrams should be modeled first: generic links, first-class metadata, or local assets beside `service.md`.
5. Tighten logging further, potentially with log levels or a quieter default mode for routine scans.
6. Add more targeted tests around managed Git sync behavior, especially failed startup sync, invalid checkout recovery, and multi-source behavior.
7. Decide whether runtime sync status should remain in memory only or get a small explicit model that can be exposed operationally.
8. Consider a cleaner application startup hook for operational subsystems like the scheduler instead of relying on module initialization.
9. Extend the explicit catalog cache subsystem with stats/debug surfaces if operational visibility becomes important.

## Working assumption

The catalog is the product.
Repository scanning is a future ingestion mechanism, not the foundation of the system.
