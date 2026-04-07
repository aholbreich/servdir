# Servdir

Servdir aims to be a simple service catalog for engineers. Markdown files are the source of truth.

## Table of Contents
- [Features](#features)
- [Current stack](#current-stack)
- [Usage](#usage)
  - [Running Localy](#running-localy)
  - [Test localy](#test-localy)
  - [Build localy](#build-localy)
  - [Running locally, but closer to prod setup Docker / Podman](#running-locally-but-closer-to-prod-setup-docker--podman)
- [Managed Git behavior](#managed-git-behavior)
- [Service definition and Discovery](#service-definition-format)
- [Kubernetes Guide](#kubernetes)
- [Development docs](#development-docs)

## Features
* Nice looking and comprehensive out of the box
* Service descriptions are written in Markdown
* Git can be the source of truth, and multiple Git repos can be mixed in
* Basic Auth protection

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

### Running Localy
```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then open `http://localhost:4321` to see the catalog running on your machine.

The default local catalog path is `./catalog`, so if you start the service as shown above, you will see some example services.

### Test localy
```bash
pnpm test
```

### Build localy
```bash
pnpm build
pnpm preview
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
  -e CATALOG_PATH=/data/catalog \
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

Managed Git uses sensible SSH defaults in container environments when keys are mounted at:
- `/etc/servdir/ssh/id_ed25519`
- `/etc/servdir/ssh/known_hosts`

## Service definition format
See [Service Definition Reference](./docs/service-definition.md) for the supported `service.md` front matter fields, Markdown body behavior, validation, and [Disovery Rules](service-definition.md#discovery-rules).

## Kubernetes
See [Kubernetes Deployment Guide](./docs/kubernetes.md) to design your Kubernetes deployments.

## Development docs
Developer relevant docs in the project:
- `docs/prd.md`
- `.adr/`
- `docs/working-notes.md`
- `docs/release.md`
- `AGENTS.md`
