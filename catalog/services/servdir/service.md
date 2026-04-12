---
id: servdir
name: Servdir
kind: application
owner: team-platform
lifecycle: "beta testing"
repo: https://github.com/aholbreich/servdir
description: Git-backed engineering catalog for services and related platform entries
tier: 3
tags:
  - catalog
  - developer-experience
  - platform
  - test
  - example
runbook: https://github.com/aholbreich/servdir#readme
links:
  - label: Hosted demo
    url: https://aholbreich.github.io/servdir/
  - label: GitHub repository
    url: https://github.com/aholbreich/servdir
delivery:
  - label: GitHub Actions
    url: https://github.com/aholbreich/servdir/actions
  - label: GitHub Pages
    url: https://aholbreich.github.io/servdir/
system: platform
domain: developer-experience
---

# Servdir

Servdir is a Git-backed catalog for services and related engineering entries. It keeps the source of truth in Markdown files with YAML frontmatter and renders them as a readable engineering catalog.

## Purpose
- Keep service and application metadata in Markdown
- Render a readable catalog UI without introducing a database-first product shape
- Support both the default Node runtime and a static export mode for lightweight hosting

## Get started
### Check it out
- Repository: https://github.com/aholbreich/servdir
- Hosted demo: https://aholbreich.github.io/servdir/

### Run locally
```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then open `http://localhost:4321`.

For local catalog development, use the repository-local example catalog by setting:

```bash
LOCAL_CATALOG_PATH=./catalog
```

### Build locally
Default server build:
```bash
pnpm build
pnpm preview
```

Static export build:
```bash
pnpm build:static
pnpm preview:static
```

## Notes
- The public demo is currently hosted via GitHub Pages
- The repository also contains local example catalog data for product development and demos
- The current example catalog demonstrates services as well as a broader `application` entry kind
