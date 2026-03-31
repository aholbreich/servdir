# 3. deploy as stateless container with external catalog path

Status: Accepted
Status Date: 2026-03-31 20:00
Driver: Alexander
Contributors: ...

## Context 
The product should be easy to run locally during development and easy to ship in production as a Docker image. Catalog content and operational configuration should live outside the built application artifact.

The MVP architecture uses file-based service definitions and an in-memory catalog, which naturally supports a stateless runtime.

## Decision
Package the application as a stateless container image for production.

Keep catalog content outside the image and provide it through a mounted directory or equivalent external volume. Provide runtime configuration through environment variables.

Also support direct local execution without Docker for fast development loops.

Initial runtime settings should include at least:
- `CATALOG_PATH`
- `PORT`
- `HOST`

### Consequences
- Production deployment stays simple: build image, mount catalog, set env vars, run.
- Local development remains fast and does not depend on Docker.
- The app can run in read-only production environments more easily.
- No baked-in catalog content is required in the image.
- Future features that require background sync or writeable local state must be designed explicitly instead of appearing accidentally.

## Options considered

### Option 1: Stateless image with external catalog path
Pros:
- Clean separation between app and content
- Easy local and production workflows
- Good fit for containers and Git-managed content
- Lower operational complexity in the MVP

Cons:
- Requires clear config handling
- Background sync features may later need extra runtime concerns

### Option 2: Bundle catalog content into the image
Pros:
- Very simple immutable artifact

Cons:
- Poor fit for frequently changing catalog content
- Forces rebuilds for content updates
- Worse authoring workflow

### Option 3: Add database-backed runtime persistence immediately
Pros:
- More room for future write workflows and sync state

Cons:
- Too much complexity for the current stage
- Slows delivery of the core product

## Advices
Keep the core app stateless even if future repository scanning introduces a small amount of runtime state. Treat sync state as an optional subsystem, not as the foundation of the product.
