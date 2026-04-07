# servdir

Simple service catalog for engineers. Git is the database. Markdown files are the source of truth.

# Features
* Nice looking and comprehensive out of the box
* Service Description is Markdown.
* Multiple git repos can be mixed in

## Current stack
- Astro
- TypeScript
  - gray-matter
  - Zod
  - markdown-it
- Tailwind CSS v4
- Vitest
- pnpm

## Run locally
```bash
pnpm install
cp .env.example .env
pnpm dev
```

Default local catalog path:
- `./catalog`

Open:
- `http://localhost:4321`

If port `4321` is already in use, either stop the other process or run Astro on another port, for example:
```bash
pnpm astro dev --host 0.0.0.0 --port 4322
```

## Test
```bash
pnpm test
```

## Build
```bash
pnpm build
pnpm preview
```

## Run localy with Docker / Podman
Build:
```bash
docker build -t servdir .
```

## Runtime configuration
Example of basic env vars:

```env
CATALOG_PATH=./catalog
HOST=0.0.0.0
PORT=4321
```

Optional managed Git sources:

```env
GIT_SOURCES=[{"name":"catalog-main","repoUrl":"git@bitbucket.org:your-org/service-catalog.git","branch":"main","checkoutPath":"/data/catalog-cache/catalog-main","scanPaths":["services"]}]
```

## Container runtime
Example:

```bash
docker run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro,Z \
  ghcr.io/aholbreich/servdir:main
```

## Kubernetes / operations
See:
- `docs/kubernetes.md`


## CI / image publishing
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Registry target: `ghcr.io/<owner>/servdir`
- Release strategy: `docs/release.md`

## Project structure
```text
catalog/
  services/
    billing-api/
      service.md
    auth-api/
      service.md
src/
  lib/
    config.ts
    catalog/
  layouts/
  pages/
docs/
.adr/
```

## Docs
- `docs/prd.md`
- `.adr/`
- `docs/working-notes.md`
- `docs/release.md`
- `docs/kubernetes.md`
- `AGENTS.md`
