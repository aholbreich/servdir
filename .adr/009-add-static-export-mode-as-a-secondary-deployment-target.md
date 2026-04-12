# 9. add static export mode as a secondary deployment target

Status: Accepted
Status Date: 2026-04-12
Driver: Alexander
Contributors: AI

## Context
Servdir currently runs as a Node-based server application.

That remains the primary deployment model and should stay stable.

At the same time, there is value in supporting simpler hosting targets such as GitHub Pages, and likely Cloudflare Pages later, without rewriting the product around a different runtime model.

The main tension is that servdir currently includes runtime concerns that do not belong in a static host model:
- request-time middleware
- Basic Auth at the application layer
- managed Git sync scheduling
- in-memory runtime snapshot refresh behavior

We need a way to support static hosting without destabilizing the default server deployment path.

## Decision
Add an explicit static export mode as a secondary deployment target.

For the first version:
- keep the Node server runtime as the default mode
- make static export opt-in through an explicit build mode switch
- prerender service and tag routes at build time
- reuse the same catalog parsing, validation, and page-model logic where possible
- exclude runtime-only concerns such as middleware auth and scheduler-driven Git sync from the static flavor

## Consequences
- servdir can target both dynamic server hosting and simple static hosting
- the default runtime behavior remains unchanged for existing deployments
- static builds operate from a build-time catalog snapshot instead of runtime refresh behavior
- some features are intentionally server-only, especially request middleware, runtime auth, and background sync
- route generation for service and tag pages must stay explicit and testable

## Options considered

### Option 1: dual deployment modes with explicit static export
Pros:
- least invasive path
- keeps current server runtime as the default
- supports GitHub Pages style hosting
- preserves most existing domain and UI code

Cons:
- adds some build-mode branching
- requires explicit handling for prerendered dynamic routes
- some runtime features do not exist in static mode

### Option 2: keep only the Node server runtime
Pros:
- simplest operational model
- no dual-mode branching

Cons:
- excludes simple static hosting targets
- limits portability for lightweight deployments

### Option 3: redesign the product around a serverless or Worker-first runtime
Pros:
- could align better with some edge platforms long term

Cons:
- too invasive for the current stage
- risks distorting the product around deployment mechanics instead of the catalog itself
- would likely force larger changes to ingestion, sync, and runtime behavior

## Advices
* To myself: Keep static mode additive. Do not let it erode or complicate the default server path more than necessary.
* To myself: Static export is a simpler deployment flavor, not a promise that every runtime feature must exist everywhere.
