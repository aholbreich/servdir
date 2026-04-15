# User Stories

This document tracks user-facing capabilities for servdir in a lightweight form.

Status values:
- `supported` - available in the product today
- `planned` - intended next or near-term work
- `proposed` - worth doing, but not committed yet

## Supported

### Quickly browse the catalog
**Status:** `supported`

As an engineer, I want to open the catalog and immediately see the known services so I can get an overview without extra setup.

Notes:
- list page shows all discovered services
- catalog status card shows snapshot/build context

### Open a service detail page
**Status:** `supported`

As an engineer, I want to open a specific service page so I can inspect one service without leaving the catalog.

Notes:
- services are addressable by id or slug
- unresolved service routes return 404

### See service ownership and core metadata
**Status:** `supported`

As an engineer, I want to see owner, lifecycle, kind, repo, tags, system, domain, and related metadata in one place.

### Read human-friendly service documentation
**Status:** `supported`

As an engineer, I want to read a service description directly in the catalog so I do not have to jump to another tool first.

Notes:
- Markdown body is rendered on the service detail page

### Follow operational and reference links
**Status:** `supported`

As an engineer, I want to find runbooks, dashboards, docs, OpenAPI references, and delivery metadata from the service page.

Notes:
- generic links are supported
- `openapi` is first-class metadata
- `delivery` is first-class metadata

### Understand service dependencies
**Status:** `supported`

As an engineer, I want to see which services a service depends on so I can understand local architecture and likely blast radius.

Notes:
- known dependencies link to other service pages
- unresolved dependencies remain visible as unresolved entries

### See validation state in the UI
**Status:** `supported`

As an engineer, I want to see validation warnings and errors so I know whether catalog data can be trusted.

Notes:
- validation issues are surfaced per service
- catalog snapshot state can be fresh or stale

### Update catalog data through Git-managed Markdown
**Status:** `supported`

As a maintainer, I want to update service metadata by editing Markdown in Git so catalog changes follow normal review flow.

Notes:
- local file sources are supported
- managed Git sources are supported

### Build a static export for simple hosting
**Status:** `supported`

As a maintainer, I want to generate a static version of the catalog so I can publish servdir on simple static hosting platforms such as GitHub Pages.

Notes:
- the default deployment mode remains the Node-based server runtime
- static export is an explicit secondary build mode
- static builds render the catalog from build-time sources, not runtime sync

Acceptance notes:
- the server build remains the default and existing behavior should stay unchanged
- static mode should generate service and tag pages ahead of time
- static mode should be testable locally before using a static host

### Switch between card view and compact list view
**Status:** `supported`

As a service inventory user, I want to switch between a card view and a thin list view so I can either browse comfortably or scan many services quickly.

Notes:
- card view is useful for richer browsing and visual grouping
- thin list view is useful for seeing the whole picture and finding a specific service faster
- the view should be toggleable dynamically from the catalog page

Acceptance notes:
- switching views should not require navigating to another page
- both views should render the same underlying service set
- the active view should be obvious in the UI
- the compact list should prioritize fast scanning over rich decoration

### Classify entries beyond backend services
**Status:** `supported`

As a maintainer, I want catalog entries to declare a `kind` so the catalog can represent things like services, applications, or other engineering assets without renaming the whole product.

Acceptance notes:
- `kind` should be optional in front matter
- omitted `kind` should default to `service`
- `kind` should be visible in the UI and documented in the service definition reference

### Filter services by kind
**Status:** `supported`

As an engineer, I want to filter the catalog by kind so I can quickly focus on services, tools, libraries, or other entry types.

Acceptance notes:
- filter controls should be icon-only — one small button per kind present in the catalog
- the active kind should be clearly highlighted
- clicking the active kind again resets to showing all entries
- the filter should only appear when more than one kind is present
- the filter should work in both list and card view
- the visible service count should update to reflect the active filter
- kind icons and labels should be consistent with those used on service cards and list rows

## Planned

### Search services by name or id
**Status:** `supported`

As an engineer, I want to search services by name or id so I can find a service quickly in larger catalogs.

Acceptance notes:
- should work from the list page
- should match both `name` and `id`
- should combine cleanly with filters

### Filter services by owner
**Status:** `planned`

As an engineer, I want to filter services by owner so I can focus on the services maintained by a specific team.

Acceptance notes:
- should work together with search
- should have a clear reset path

### Filter services by lifecycle
**Status:** `planned`

As an engineer, I want to filter services by lifecycle so I can focus on production, deprecated, or other lifecycle groups.

Acceptance notes:
- values should map to existing service metadata
- should work together with owner and tag filters

### Navigate by tags
**Status:** `supported`

As an engineer, I want to navigate the catalog by tag so I can explore services by technology, domain, or concern.

Acceptance notes:
- visible tags should be clickable
- every tag should have a dedicated page listing matching services
- there should be a tag index page listing all known tags
- tag pages should show the number of matching services
- tag navigation should reuse the existing service list presentation where possible
- unknown tag routes should return 404


## Proposed

### Group services by platform in the catalog view
**Status:** `proposed`

As an engineer, I want to group catalog entries by their deployment platform so I can understand at a glance which services live on AWS, on-prem, the legacy cluster, or other infrastructure contexts.

Notes:
- a new optional `platform` field is introduced in the service frontmatter (free string, e.g. `aws-prod`, `on-prem`, `legacy-k8s`, `hetzner`)
- omitting `platform` is valid — entries without it remain visible and are grouped under an implicit "Other" section when grouping is active
- grouping is a view mode, not a filter — all entries stay visible, they are just reorganised under platform section headers
- the toggle should only appear when more than one distinct `platform` value is present in the catalog
- grouped view works in both list and card view
- the active grouping state should be visually clear
- within each platform group, the existing sort order is preserved

Acceptance notes:
- `platform` is optional in frontmatter; omitting it must not break validation or rendering
- the grouping toggle should sit alongside the existing kind filter and view mode controls
- platform section headers should be clear and visually distinct from service rows
- entries with no `platform` value should appear last under a neutral label such as "Other"
- the feature should work in static export mode as well as the default server build

### View the raw Markdown definition for a catalog entry
**Status:** `proposed`

As an engineer or catalog maintainer, I want to see the raw Markdown source for a catalog entry so I can understand the real definition, review the front matter, and improve it at the source.

Acceptance notes:
- the detail page should offer an explicit way to view the raw source
- the raw view should include both front matter and Markdown body
- the raw view should reflect the stored source definition, not reconstructed data
- the feature should work for local and managed Git-backed entries

### Copy the raw service definition for editing or reuse
**Status:** `proposed`

As an engineer or catalog maintainer, I want to copy the raw `service.md` or `.servdir.md` definition so I can paste it into an editor, improve the source, or use it as a starting template for another entry.

Acceptance notes:
- there should be a simple copy action from the raw definition view
- copied content should preserve original Markdown and YAML front matter formatting as closely as possible
- the UI should make clear whether the source came from `service.md` or `.servdir.md`

### Link from a catalog entry to its source definition in Git
**Status:** `proposed`

As a catalog maintainer, I want a direct link from the rendered entry to the source file in Git so I can jump straight into normal review and editing flow.

Acceptance notes:
- the link should point to the actual source file when a repository URL and relative source path are known
- the feature should degrade quietly when a source link cannot be derived safely
- the UI should not pretend editing happens inside servdir when the real workflow is Git-based

### Render architecture diagrams on the service detail page
**Status:** `proposed`

As an engineer, I want architecture diagrams such as PlantUML or C4-PlantUML rendered directly on the service detail page so I can understand a system visually without leaving the catalog.

Acceptance notes:
- the detail page should support attaching one or more diagrams to an entry
- PlantUML-based diagrams should be a first-class candidate because they are text-based and Git-friendly
- the feature should work for diagrams stored alongside the catalog entry or referenced explicitly from the repository
- the UI should make it clear when a diagram could not be rendered
- the rendered page should still provide access to the raw diagram source

Implementation notes:
- the example discussed is PlantUML, not Pulumi
- C4-PlantUML support is especially relevant because it fits service and infrastructure documentation well
- remote `!include` dependencies may need explicit handling or restrictions so rendering stays predictable and safe

### Render Mermaid diagrams on the service detail page
**Status:** `proposed`

As an engineer, I want Mermaid diagrams rendered directly on the service detail page so I can document flows, sequences, and lightweight architecture views in a simple text-based format.

Acceptance notes:
- Mermaid should be supported as an explicit diagram format, not only as fenced Markdown code blocks
- the rendered page should still provide access to the raw Mermaid source
- rendering should work without forcing maintainers to pre-render images manually
- invalid Mermaid should fail clearly without breaking the rest of the service page

### Support Structurizr DSL as an architecture source format
**Status:** `proposed`

As an engineer or architect, I want Structurizr DSL support so I can describe systems with a more structured C4-oriented model and expose those diagrams from the catalog.

Acceptance notes:
- Structurizr DSL should be treated as a first-class architecture format candidate
- servdir should support at least linking or rendering exported views from a Structurizr model
- the catalog should preserve access to the raw DSL source when available
- the implementation should stay explicit about which Structurizr views are shown on a service detail page

### Share filtered catalog views by URL
**Status:** `proposed`

As an engineer, I want search and filter state reflected in the URL so I can share a focused catalog view with someone else.

### Clear all active filters at once
**Status:** `proposed`

As an engineer, I want a single clear-all action so I can quickly return to the full catalog.

### Show filter controls that work well on small screens
**Status:** `proposed`

As an engineer, I want filter controls that still feel usable on smaller screens so the catalog remains pleasant to use everywhere.
