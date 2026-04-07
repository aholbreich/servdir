# Service Definition Reference

## Table of Contents
- [File shape](#file-shape)
- [Required front matter fields](#required-front-matter-fields)
- [Optional front matter fields](#optional-front-matter-fields)
- [Markdown body](#markdown-body)
- [Discovery rules](#discovery-rules)
  - [Local catalog discovery](#local-catalog-discovery)
  - [Managed Git source discovery](#managed-git-source-discovery)
- [Catalog merge behavior](#catalog-merge-behavior)
- [Validation and error handling](#validation-and-error-handling)
- [Practical authoring rules](#practical-authoring-rules)
- [Minimal valid example](#minimal-valid-example)

This document describes the `service.md` file format used by `servdir`.

Each service entry is a Markdown file with:
- YAML front matter
- a Markdown body

`servdir` discovers these files, parses the front matter, renders the Markdown body, and validates the result.

## File shape

Example:

```md
---
id: billing-api
name: Billing API
owner: team-payments
lifecycle: production
repo: https://github.com/acme/billing-api
description: Core billing service for invoice creation
tier: 2
tags:
  - payments
  - backend
depends_on:
  - auth-api
runbook: https://example.com/runbooks/billing-api
links:
  - label: Dashboard
    url: https://grafana.example.com/d/billing-api
  - label: Alerts
    url: https://alerts.example.com/billing-api
system: payments
domain: finance
---

# Billing API

Creates invoices and exposes billing functionality for internal systems.
```

## Required front matter fields

These fields are required and validated.

### `id`
Unique service identifier.

Expected:
- non-empty string
- should be stable over time
- should be unique across the full merged catalog

Example:
```yaml
id: billing-api
```

Notes:
- duplicate ids are reported as validation errors
- the service route slug is currently derived from `id` by lowercasing it

### `name`
Human-readable display name.

Expected:
- non-empty string

Example:
```yaml
name: Billing API
```

### `owner`
Owning team or responsible group.

Expected:
- non-empty string

Example:
```yaml
owner: team-payments
```

### `lifecycle`
Current lifecycle state of the service.

Expected:
- non-empty string

Example values:
```yaml
lifecycle: production
lifecycle: experimental
lifecycle: deprecated
```

Note:
- current implementation validates only that it is a non-empty string
- it does not yet enforce a fixed enum

### `repo`
Repository URL for the service.

Expected:
- valid absolute URL

Example:
```yaml
repo: https://github.com/acme/billing-api
```

## Optional front matter fields

### `description`
Short summary of the service.

Expected:
- string

Example:
```yaml
description: Core billing service for invoice creation
```

Used for:
- list page summary when present

If missing:
- the UI falls back to the first non-heading line from the Markdown body

### `tier`
Optional service tier.

Expected:
- positive integer

Example:
```yaml
tier: 2
```

### `tags`
List of searchable labels.

Expected:
- array of non-empty strings

Example:
```yaml
tags:
  - payments
  - backend
```

### `depends_on`
List of other service ids this service depends on.

Expected:
- array of non-empty strings

Example:
```yaml
depends_on:
  - auth-api
  - event-bus
```

Validation behavior:
- unresolved dependency ids are reported as warnings
- they do not block the service from loading

### `runbook`
Link to operational documentation.

Expected:
- valid absolute URL

Example:
```yaml
runbook: https://example.com/runbooks/billing-api
```

### `links`
Extra links shown as metadata.

Expected:
- array of objects
- each object must include:
  - `label`: non-empty string
  - `url`: valid absolute URL

Example:
```yaml
links:
  - label: Dashboard
    url: https://grafana.example.com/d/billing-api
  - label: Alerts
    url: https://alerts.example.com/billing-api
```

### `system`
Optional larger system grouping.

Expected:
- string

Example:
```yaml
system: payments
```

### `domain`
Optional business or technical domain.

Expected:
- string

Example:
```yaml
domain: finance
```

## Markdown body

Everything after the front matter is treated as the service documentation body.

The body is:
- stored as raw Markdown
- rendered to HTML for the detail page

Common uses:
- service overview
- operational notes
- architecture notes
- onboarding information
- links that do not belong in structured front matter

## Discovery rules

`servdir` currently discovers service files by file path pattern, not by scanning arbitrary Markdown.

### Local catalog discovery

For the local catalog root from `CATALOG_PATH`, `servdir` scans:

```text
<catalog-root>/services/*/service.md
```

Example:

```text
/data/catalog/services/billing-api/service.md
/data/catalog/services/auth-api/service.md
```

That means:
- files must be named `service.md`
- each service must live one directory below `services/`
- deeper nesting is not currently discovered automatically

### Managed Git source discovery

For each Git source entry in `GIT_SOURCES`, `servdir` first syncs the repository into `checkoutPath`.

Then for each configured `scanPath`, it scans:

```text
<checkoutPath>/<scanPath>/*/service.md
```

Example config:

```json
{
  "name": "catalog-main",
  "repoUrl": "git@bitbucket.org:your-org/service-catalog.git",
  "branch": "main",
  "checkoutPath": "/data/catalog-cache/catalog-main",
  "scanPaths": ["services", "platform/services"]
}
```

This discovers paths like:

```text
/data/catalog-cache/catalog-main/services/billing-api/service.md
/data/catalog-cache/catalog-main/platform/services/auth-api/service.md
```

## Catalog merge behavior

`servdir` merges services from:
- local catalog files
- all configured managed Git sources

Then it validates the merged set together.

Current validation includes:
- front matter schema validation
- duplicate `id` detection across all loaded sources
- unresolved `depends_on` references

## Validation and error handling

If front matter does not match the schema:
- the service is still loaded into the catalog
- validation issues are attached to the service
- fallback placeholder values are used for missing required fields where needed

This means broken entries remain visible instead of silently disappearing.

Examples of validation problems:
- missing `owner`
- invalid `repo` URL
- `tier` is not a positive integer
- `links[].url` is not a valid URL
- duplicate `id`
- unresolved `depends_on`

## Practical authoring rules

Recommended conventions:
- keep `id` short, stable, and URL-safe
- use team names for `owner`
- keep `description` short, let the body carry the detail
- prefer absolute URLs for all links
- use `depends_on` only for meaningful dependencies
- keep one service per directory

## Minimal valid example

```md
---
id: auth-api
name: Auth API
owner: team-platform
lifecycle: production
repo: https://github.com/acme/auth-api
---

# Auth API

Handles authentication and token issuance.
```
