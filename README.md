# Servdir

Servdir aims to be a simple service catalog for engineers. Markdown files are the source of truth.

Even though the product started service-first, entries can now declare a broader `kind` such as `service` or `application`. If `kind` is omitted, it defaults to `service`.

The catalog title defaults to `Service Catalog`, but can be overridden with `CATALOG_TITLE`.

## Table of Contents

- [Features](#features)
- [Current stack](#current-stack)
- [Demo](#demo)
- [Usage](#usage)
  - [Running locally](#running-locally)
  - [Test locally](#test-locally)
  - [Build locally](#build-locally)
  - [Running locally, but closer to prod setup Docker / Podman](#running-locally-but-closer-to-prod-setup-docker--podman)
- [Managed Git behavior](#managed-git-behavior)
- [Service definition and Discovery](#service-definition-format)
- [Kubernetes Guide](#kubernetes)
- [Development docs](#development-docs)

## Features

- Nice looking and comprehensive out of the box
- Service descriptions are written in Markdown
- Git can be the source of truth, and multiple Git repos can be mixed in
- Basic Auth protection
- Dual deployment support:
  - Default Node server runtime (Selfupdating)
  - Render the serdir as static catalog and host it on CDN

## Demo

[Staticaly rendered Demo](https://aholbreich.github.io/servdir/) version with demo services in the `catalog folder`

## Current stack

- Astro
- TypeScript
  - gray-matter
  - Zod
  - markdown-it
- Tailwind CSS v4
- Vitest
- pnpm

## Usage

### Running locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then open `http://localhost:4321` to see the catalog running on your machine.

For local file-based catalog development, set `LOCAL_CATALOG_PATH=./catalog` in `.env`.
The app requires at least one configured source, either `LOCAL_CATALOG_PATH` or a `GIT_SOURCE_<NAME>` variable.

### Test locally

```bash
pnpm test
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

GitHub Pages-style local test:

```bash
SERVDIR_BASE_PATH=/servdir pnpm build:static
SERVDIR_BASE_PATH=/servdir pnpm preview:static
```

Important:

- the default mode remains the Node server runtime
- static mode is opt-in via `SERVDIR_BUILD_MODE=static`
- static mode renders from build-time catalog sources and does not include runtime scheduler/auth behavior
- GitHub Pages deployment uses the repository-local catalog (`LOCAL_CATALOG_PATH=./catalog`) as its build-time source by default

### Create and push a release tag

Use the interactive helper to inspect recent tags, create a new annotated tag, and optionally push it:

```bash
pnpm release:tag
```

### Draft release notes since the latest tag

Generate a markdown-style list of commit messages since the latest tag:

```bash
pnpm release:notes
```

You can also start from a specific tag:

```bash
pnpm release:notes -- v0.3.0
```

### Running locally, but closer to prod setup Docker / Podman

Build the image with:

```bash
docker build -t servdir .
```

Then run it:

```bash
docker run --rm -it \
  -p 4321:4321 \
  -e LOCAL_CATALOG_PATH=/data/catalog \
  -v "$(pwd)/catalog:/data/catalog:ro,Z" \
  servdir
```

You can test more cases with proper environment configuration. Create your own `.env` file based on `.env.example`, then start the container using it.

The following example also mounts your local SSH files. This can be useful if you know what you are doing:

```bash
docker run --rm -it \
  -p 4321:4321 \
  --env-file .env \
  -v "$(pwd)/catalog:/data/catalog:ro,Z" \
  -v "$HOME/.ssh:/etc/servdir/ssh:ro,Z" \
  servdir
```

## Managed Git behavior

- sources are synced on startup
- sources are refreshed periodically in-process
- requests read from the local checkout cache and do not perform Git pulls
- sync is locked per source to avoid overlapping operations
- checkout path is always derived automatically as `./catalog-cache/<source-name>-<n>`

Managed Git uses sensible SSH defaults in container environments when keys are mounted at:

- `/etc/servdir/ssh/id_ed25519`
- `/etc/servdir/ssh/known_hosts`

## Service definition format

See [Service Definition Reference](./docs/service-definition.md) for the supported `service.md` front matter fields, including `kind`, structured `tech_stack`, Markdown body behavior, validation, and [Discovery Rules](./docs/service-definition.md#discovery-rules).

Discovery supports both:

- multi-entry catalogs under `services/*/service.md`
- single-repo entries declared at the repository root as `.servdir.md`

## Kubernetes

See [Kubernetes Deployment Guide](./docs/kubernetes.md) to design your Kubernetes deployments.

## Deployment modes

### Default server mode

This is the normal servdir deployment mode.

Characteristics:

- Node server runtime
- Docker-friendly
- request-time routing
- managed Git sync scheduler
- runtime Basic Auth support

### Static export mode

This is an explicit secondary deployment mode for simple static hosting targets.

Characteristics:

- prerendered HTML output
- good fit for local static preview and GitHub Pages-style hosting
- build-time catalog snapshot
- no runtime scheduler or middleware auth behavior
- GitHub Pages deployment is wired through `.github/workflows/pages.yml`

## Development docs

Developer relevant docs in the project:

- [docs/prd.md](./docs/prd.md)
- [docs/user-stories.md](./docs/user-stories.md)
- `.adr/`
- [docs/working-notes.md](./docs/working-notes.md) — includes cross-session handoff context for future agents and maintainers
- [docs/release.md](./docs/release.md)
- `AGENTS.md`
