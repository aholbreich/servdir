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

As an engineer, I want to see owner, lifecycle, repo, tags, system, domain, and related metadata in one place.

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

## Planned

### Search services by name or id
**Status:** `planned`

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

### Filter services by tags
**Status:** `planned`

As an engineer, I want to filter services by tags so I can narrow the catalog to a technology, domain, or concern.

Acceptance notes:
- should support more than one meaningful tag value over time
- empty-result handling should stay clear and friendly

## Proposed

### Share filtered catalog views by URL
**Status:** `proposed`

As an engineer, I want search and filter state reflected in the URL so I can share a focused catalog view with someone else.

### Clear all active filters at once
**Status:** `proposed`

As an engineer, I want a single clear-all action so I can quickly return to the full catalog.

### Show filter controls that work well on small screens
**Status:** `proposed`

As an engineer, I want filter controls that still feel usable on smaller screens so the catalog remains pleasant to use everywhere.
