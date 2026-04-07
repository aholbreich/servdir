# Servdir

Servedir aims to be simple to use and operate service catalog for engineers. Where markdown files are basically the source of truth.

## Some features
* Nice looking and comprehensive out of the box
* Service description is Markdown 
* Git can be the source of truth and multiple git repos can be mixed in
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

Now open `http://localhost:4321` to so catalog working on your machine.

Default local catalog path is: `./catalog` . So if you start the servicel like shown above. You'll see some exampel services.


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
Build the image with 
```bash
docker build -t servdir .
```

then run it 

```bash
docker run --rm \
  -p 4321:4321 \
  -e CATALOG_PATH=/data/catalog \
  -v $(pwd)/catalog:/data/catalog:ro,Z \
  servdir
```
but you can test more cases with proper environment configuration.  So create your copy of `.env` derived from `.env.example` and start the container using it:

```bash
docker run --rm -it\
  -p 4321:4321 \
  --env-file .env \
  -v "$(pwd)/catalog:/data/catalog:ro,Z" \
  -v "$HOME~/.ssh:/etc/servdir/ssh:ro,Z" \
  servdir
```

## Managed Git behavior:
- sources are synced on startup
- sources are refreshed periodically in-process
- requests read from the local checkout cache and do not perform Git pulls
- sync is locked per source to avoid overlapping operations

Managed Git uses sensible SSH defaults in container environments when keys are mounted at:
- `/etc/servdir/ssh/id_ed25519`
- `/etc/servdir/ssh/known_hosts`

By default, `servdir` points Git SSH at the mounted key path and known_hosts file if present, but does not force `IdentitiesOnly=yes`.


## Kubernetes
See [Kubernetes Deployment Guide](./docs/kubernetes.md) to desing your k8s deployments



## Docs
- `docs/prd.md`
- `docs/service-definition.md`
- `.adr/`
- `docs/working-notes.md`
- `docs/release.md`
- `docs/kubernetes.md`
- `AGENTS.md`
