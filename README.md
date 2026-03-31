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

With Podman:
```bash
podman run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro \
  ghcr.io/aholbreich/servdir:main
```

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
docker run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro \
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
