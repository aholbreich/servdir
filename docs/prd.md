# Service Catalog MVP PRD

## Summary
Build a simple, file-based service catalog that engineers actually want to use. The first bar is not "enterprise CMDB"; it is "better than a handwritten Confluence page". Git is the database. Markdown files with YAML frontmatter are the source of truth.

## Problem
Service information is often incomplete, stale, hard to discover, and spread across wiki pages. Engineers need a lightweight way to find:
- what services exist
- who owns them
- where the repo is
- what depends on what
- where to find operational links like runbooks

Existing solutions are often overkill (see Backstage), solve a somewhat different problem (Port), or depend heavily on a surrounding ecosystem (Atlassian Compass).

## Goal
Create an MVP that gives an overview of services and related engineering entries in an organisation or team. The catalog should be easy to maintain in Git and pleasant to browse in a web UI.

## Non-Goals
For the MVP, do not build:
- a relational database
- workflow engines or approval flows
- automated repo discovery across the whole org
- deep runtime integrations with Kubernetes, cloud providers, or incident tools
- complicated RBAC
- a full write-capable admin backend
- a distributed job system

## Users
Primary users:
- backend engineers
- platform engineers
- SRE / ops
- tech leads
- architects

Secondary users:
- engineering managers
- product people

## User stories
Detailed user-facing stories now live in [User Stories](./user-stories.md).

Keep this PRD focused on product scope, UX expectations, and constraints. Use the user stories document for supported, planned, and proposed capabilities.

## MVP Scope

### Source model
- Catalog lives in a Git repository or local directory.
- Service entries are Markdown files, typically `catalog/services/<service-id>/service.md`.
- Each file contains YAML frontmatter plus Markdown body.
- The application scans files, validates them, and builds an in-memory catalog.

### Required service fields
- `id`
- `name`
- `owner`
- `lifecycle`
- `repo`

### Optional service fields
- `kind` (defaults to `service` when omitted)
- `description`
- `tier`
- `tags`
- `depends_on`
- `runbook`
- `links`
- `openapi`
- `delivery`
- `system`
- `domain`
- future: architecture diagram references, including Pulumi-generated views, Mermaid, PlantUML, and Structurizr/C4 artifacts

### Example
```md
---
id: billing-api
name: Billing API
owner: team-payments
tier: 2
lifecycle: production
repo: https://github.com/acme/billing-api
runbook: https://...
tags:
  - payments
  - backend
depends_on:
  - auth-api
provides:
  - invoice-events
---

# Billing API

Erzeugt Rechnungen und stellt Billing-Funktionen für interne Systeme bereit.

## Hinweise
- Kritischer Pfad für Invoice Creation
- PagerDuty Rotation bei Team Payments
```

## UX Requirements
### List view
Show at least:
- name
- owner
- lifecycle
- tags
- repo
- last validation status

### Detail view
Show at least:
- metadata
- rendered Markdown
- dependencies
- links
- room for future architecture context such as Pulumi diagrams, Mermaid, PlantUML, Structurizr/C4 views, or architecture links

### Search and filter
The MVP should support search and filtering in the list experience.

See [User Stories](./user-stories.md) for the tracked story list and current status of search and filter capabilities.

## Validation
Validate at load time:
- required fields exist
- `id` is unique
- frontmatter is valid
- links are structurally valid URLs where applicable
- `depends_on` references known service ids, or is flagged as unresolved

Output validation state to the UI so users can trust the catalog.

## Success Criteria
The MVP is successful if:
- a team can add 20-50 services without schema pain
- engineers can find a service in under 30 seconds
- metadata changes happen via normal Git review flow
- the catalog feels easier to update than Confluence
- the same catalog model can be deployed either as the default Node server runtime or as a static export when a simpler hosting target is preferred

## Architecture Overview
The system has four parts:
1. Catalog reader: finds all `service.md` files
2. Parser/validator: parses frontmatter + Markdown and validates schema
3. HTTP server: exposes catalog data and serves the UI
4. Web UI: list, detail, search, filters

Deployment/runtime model:
- local development runs directly without Docker
- the default production path runs as a Docker container with the Node server runtime
- the product should also support an explicit static export mode for simple hosting targets such as GitHub Pages
- catalog content is provided from an external path or other build-time source configuration
- configuration is provided through environment variables

## Technical Direction
Recommended stack for MVP:
- TypeScript end-to-end
- Astro for the UI shell and pages
- Node-based server layer for scanning/parsing files
- Zod for schema validation
- Gray-matter for frontmatter parsing
- Marked or markdown-it for Markdown rendering

## Why this stack
- TypeScript keeps the domain model explicit and safe.
- Astro is simple, fast, and a good fit for content-heavy interfaces.
- The UI can remain mostly server-rendered and avoid SPA complexity early on.
- You can still add React or Svelte islands later only where interactivity is needed.

## Deployment modes
The product should support two deployment modes:

### Default server mode
- Node-based runtime
- request-time routing
- runtime config validation
- managed Git sync and in-memory snapshot behavior

### Explicit static export mode
- build-time prerendered HTML output
- intended for simple static hosting targets such as GitHub Pages first, with Cloudflare Pages also possible later
- service and tag routes are generated ahead of time from the configured catalog snapshot
- runtime-only concerns such as request middleware, Basic Auth, and scheduler-driven Git sync are intentionally not part of the static flavor

The static flavor should be additive and low-risk. The default Node runtime remains the primary deployment path.

## Future Direction: Repository Scanning
A likely next feature is periodic scanning of configured repositories for service definition files.

This should be treated as an additive subsystem, not as the core of the MVP architecture.

Likely shape:
- configured repository list
- periodic fetch / sync
- scan for service definition files
- validate and import into the in-memory catalog
- persist minimal sync state and scan timestamps locally

Design principles for that feature:
- keep the primary data model file-based
- keep runtime state minimal and well-bounded
- prefer a simple internal scheduler over a distributed job system
- make local development still work without container orchestration

## Open Questions
- Should `provides` be part of the first-class schema in MVP or added in v1.1?
- Should validation run only on startup, or also in watch mode during local development?
- Should the app support multiple catalog roots from day one, or just one?
- Do we want generated example files / templates for new services in the first release?
- What is the smallest acceptable local state model for repository sync metadata?
- Should repository scanning land in v1.1 or stay behind a feature flag initially?
- Should Pulumi, Mermaid, PlantUML, Structurizr/C4, or other architecture diagrams remain generic links at first, or get a first-class field later?
- If architecture diagrams become first-class, should the app support remote URLs only, or also local repo-kept assets beside `service.md`?
