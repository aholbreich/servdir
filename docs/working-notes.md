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
- The system still scans local and Git-backed `service.md` files at request time. Sync is no longer on the request path, but scan/parse still is.
- A future optimization could cache the parsed catalog between refreshes if request-time scan cost becomes noticeable.

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
- `src/components/ui/SectionTitle.astro` — consistent section headings
- `src/components/ui/ServiceCard.astro` — dense reusable service list card
- `src/components/catalog/ServiceCatalogGrid.astro` — service grid plus empty-state handling for the index page
- `src/components/catalog/CatalogStatusCard.astro` — compact catalog status summary card
- `src/components/catalog/ServiceHeader.astro` — detail-page header with service identity, summary state, and tags
- `src/components/catalog/ServiceDocumentationCard.astro` — detail-page documentation body card
- `src/components/catalog/ServiceMetadataCard.astro` — detail-page metadata and OpenAPI sections
- `src/components/catalog/ServiceDependenciesCard.astro` — detail-page dependency list
- `src/components/catalog/ServiceValidationCard.astro` — detail-page validation state card

Design reminder:
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
1. Cache the merged parsed catalog between sync cycles so requests do not rescan and reparses all `service.md` files on every page load.
2. Expose a small health or debug view for sync state, for example last sync time, last success, last error, and source status.
3. Improve validation UX in the UI, especially duplicate id diagnostics, unresolved dependency visibility, and clearer warning vs error treatment.
4. Decide whether `provides` should become a first-class field in the service definition schema.
5. Decide how Pulumi and other architecture diagrams should be modeled first: generic links, first-class metadata, or local assets beside `service.md`.
6. Tighten logging further, potentially with log levels or a quieter default mode for routine scans.
7. Add more targeted tests around managed Git sync behavior, especially failed startup sync, invalid checkout recovery, and multi-source behavior.
8. Decide whether runtime sync status should remain in memory only or get a small explicit model that can be exposed operationally.
9. Consider a cleaner application startup hook for operational subsystems like the scheduler instead of relying on module initialization.
10. If performance becomes an issue, consider precomputing and reusing a validated in-memory catalog snapshot after each successful refresh.

## Working assumption
The catalog is the product.
Repository scanning is a future ingestion mechanism, not the foundation of the system.
