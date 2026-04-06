# servdir

Simple service catalog for engineers.

Git is the database. Markdown files are the source of truth.

## Current stack
- Astro
- TypeScript
- gray-matter
- Zod
- markdown-it
- Vitest
- pnpm

## Run as container

```bash
docker run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro \
  ghcr.io/aholbreich/servdir:main
```

The application logs the resolved catalog path and discovered service files to stdout. This helps verify whether the container sees the mounted catalog directory.

With Podman:
```bash
podman run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro,Z \
  ghcr.io/aholbreich/servdir:main
```

On Fedora or other SELinux-enabled systems, `:Z` on the bind mount may be required. If the container starts but the catalog shows zero services, check the bind mount labeling first.

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

## Docker
Build:
```bash
docker build -t servdir .
```

Run local image:
```bash
# or docker
podman run --rm -it \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro,Z \
  servdir
```

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
- `AGENTS.md`
