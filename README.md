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
- [Authentication](#authentication)
- [Kubernetes Guide](#kubernetes)
- [Development docs](#development-docs)

## Features

- Nice looking and comprehensive out of the box
- Service descriptions are written in Markdown
- Git can be the source of truth, and multiple Git repos can be mixed in
- App-level auth modes: open access, Basic Auth, or Microsoft Entra OIDC
- Dual deployment support:
  - Default Node server runtime (Selfupdating)
  - Render the serdir as static catalog and host it on CDN

## Demo

[Staticaly rendered Demo](https://aholbreich.github.io/servdir/) version with demo services in the `catalog folder`

## Current stack

- Astro 6
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

Optional logging setting:

- `LOG_FORMAT=text` for readable local logs
- `LOG_FORMAT=json` for structured one-line logs, useful in Kubernetes and other log aggregation environments
- `LOG_LEVEL=debug|info|warn|error` to control verbosity, default is `info`
- `LOG_COLOR=auto|true|false` to control ANSI colors in text mode, default is `auto`

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

Structured logs:

- set `LOG_FORMAT=json` when you want machine-friendly logs for tools such as Kubernetes, Loki, or Elasticsearch
- `LOG_COLOR` only affects `LOG_FORMAT=text`; `auto` enables color only when stdout is a TTY
- the default remains readable text logs for local development

## Service definition format

See [Service Definition Reference](./docs/service-definition.md) for the supported `service.md` front matter fields, including `kind`, structured `tech_stack`, Markdown body behavior, validation, and [Discovery Rules](./docs/service-definition.md#discovery-rules).

Discovery supports both:

- multi-entry catalogs under `services/*/service.md`
- single-repo entries declared at the repository root as `.servdir.md`

## Authentication

The server runtime supports three auth modes, selected at startup via
`AUTH_MODE`. Pick exactly one per deployment. Static export mode is
always unauthenticated at the app layer.

| `AUTH_MODE` | When to use |
|---|---|
| `none` (default) | Local dev, trusted networks, or fronted by a separate proxy that handles auth. |
| `basic` | Single-tenant install without an identity provider. Shared credential, no per-user identity. See ADR 007. |
| `oidc` | Internal deployments with a Microsoft Entra ID tenant. Real per-user login. See ADR 012. |

### basic

```bash
AUTH_MODE=basic
BASIC_AUTH_USERNAME=alice
BASIC_AUTH_PASSWORD=...
```

Legacy compatibility: if `AUTH_MODE` is unset but
`BASIC_AUTH_ENABLED=true` is present, the runtime infers
`AUTH_MODE=basic` and logs a one-line warning.

### oidc (Microsoft Entra)

See the [Authentication Guide](./docs/authentication.md) for Entra setup, Kubernetes/GitOps notes, and troubleshooting.

Requires a registered Entra application with redirect URI
`https://<your-host>/auth/callback` and the `openid profile email`
scopes.

```bash
AUTH_MODE=oidc
AUTH_OIDC_TENANT_ID=...
AUTH_OIDC_CLIENT_ID=...
AUTH_OIDC_CLIENT_SECRET=... # Entra client secret Value, not Secret ID
AUTH_OIDC_REDIRECT_URI=https://servdir.example.com/auth/callback
AUTH_SESSION_SECRET=$(openssl rand -base64 32)
#AUTH_SESSION_TTL_HOURS=8   # optional, default 8, range 1..168
```

`AUTH_SESSION_SECRET` is mandatory for `AUTH_MODE=oidc`. It is a
servdir-owned signing key for the login transaction cookie and the
stateless session cookie; it is not an Entra value. Use the same value
for all replicas.

What it does:

- Any successfully authenticated user from the configured tenant
  is allowed in (`claims.tid` is pinned as the day-one
  authorization check).
- Browser GET requests without a session redirect to
  `/auth/login?return_to=<original-path>`. API requests get
  `401 {"error":"unauthenticated"}` instead.
- The session is a stateless signed JWT cookie
  (`__servdir_session`). Rotating `AUTH_SESSION_SECRET` instantly
  invalidates every live session — a re-login wave is expected,
  not a bug.
- `/health/live` and `/health/ready` always bypass auth so
  Kubernetes probes keep working regardless of the configured
  mode (pinned by `src/middleware.test.ts`).

### Diagnosing OIDC issues

The auth modules emit one structured log line per decision point.
For a first-time deploy, run with `LOG_LEVEL=debug LOG_FORMAT=json`
and filter for components starting with `auth-`.

Common failures such as missing `AUTH_SESSION_SECRET`, SOPS `ENC[...]`
placeholders, `AADSTS500112` redirect URI mismatches, and using an
Entra Secret ID instead of the Secret Value are covered in the
[Authentication troubleshooting guide](./docs/authentication.md#troubleshooting).

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
- runtime auth: `none` | `basic` | `oidc` (see [Authentication](#authentication))

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
- [docs/authentication.md](./docs/authentication.md)
- `.adr/`
- [docs/working-notes.md](./docs/working-notes.md) — includes cross-session handoff context for future agents and maintainers
- [docs/release.md](./docs/release.md)
- `AGENTS.md`
