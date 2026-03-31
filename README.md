# servdir

Simple service catalog for engineers.

Git is the database. Markdown files are the source of truth.

## Current stack
- Astro
- TypeScript
- gray-matter
- Zod
- markdown-it

## Run locally
```bash
pnpm install
cp .env.example .env
pnpm run dev
```

Default local catalog path:
- `./catalog`

Open:
- `http://localhost:4321`

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

Run:
```bash
docker run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro \
  servdir
```

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
- `AGENTS.md`
