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

## Goal
Create an MVP that makes service metadata easy to maintain in Git and pleasant to browse in a web UI.

## Non-Goals
For the MVP, do not build:
- a relational database
- workflow engines or approval flows
- automated repo discovery across the whole org
- deep runtime integrations with Kubernetes, cloud providers, or incident tools
- complicated RBAC

## Users
Primary users:
- platform engineers
- backend engineers
- SRE / ops
- tech leads

Secondary users:
- onboarding engineers
- architects
- engineering managers

## Jobs To Be Done
- As an engineer, I want to quickly find a service and its owner.
- As an engineer, I want to see repo, lifecycle, and tags in one place.
- As an engineer, I want to read a human-friendly service description without leaving the catalog.
- As an engineer, I want to understand dependencies between services.
- As a maintainer, I want to update service metadata by editing a Markdown file in Git.

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
- `description`
- `tier`
- `tags`
- `depends_on`
- `runbook`
- `links`
- `system`
- `domain`

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

### Search and filter
Support:
- free-text search by name and id
- filter by owner
- filter by tags
- filter by lifecycle

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

## Architecture Overview
The system has four parts:
1. Catalog reader: finds all `service.md` files
2. Parser/validator: parses frontmatter + Markdown and validates schema
3. HTTP server: exposes catalog data and serves the UI
4. Web UI: list, detail, search, filters

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

## Open Questions
- Should `provides` be part of the first-class schema in MVP or added in v1.1?
- Should validation run only on startup, or also in watch mode during local development?
- Should the app support multiple catalog roots from day one, or just one?
- Do we want generated example files / templates for new services in the first release?
