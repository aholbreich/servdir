---
id: task-8k7
title: Gate /health/ready on initial git sync (eager scheduler start)
status: open
priority: high
type: feature
created_at: 2026-05-19T20:14:19Z
updated_at: 2026-05-19T20:14:19Z
created_by: claude
assignee: null
depends_on: []
claim:
  actor: null
  claimed_at: null
  expires_at: null
  heartbeat_at: null
tags:
  - ops
  - perf
  - k8s
---

## Description

## Problem

Cold-start request latency is currently 5–60 seconds on a freshly scheduled
pod that has configured Git sources. The first incoming request is blocked
until the initial `git clone/fetch` cycle completes, because
`src/lib/catalog/load.ts:52-55` starts the scheduler lazily on first request
and then `await waitForInitialGitSync()`s before rendering. Subsequent
requests are fast (cache hit), but the first visitor experiences the wait.

Worse: `/health/ready` (`src/pages/health/ready.ts`) only checks that
`tryGetConfig()` returns ok. It returns `200 ready` while the pod is still
about to block users for 30+ seconds. k8s therefore considers the pod ready
and routes traffic immediately.

## Goal

Make `ready` mean "this pod can answer a catalog request quickly":

1. Start the git sync scheduler at module load (eagerly), not lazily on the
   first request.
2. `/health/ready` returns `503 not-ready` until the initial git sync
   completes (or returns 200 with an explicit `gitSync: 'done'` marker).
3. Catalog page requests no longer perform the lazy scheduler bootstrap —
   they assume the scheduler is already running.

With this change, the k8s readiness probe holds traffic off the pod until the
catalog is genuinely available, eliminating the first-visitor wait in
production deployments.

## Proposed implementation

1. `src/lib/catalog/load.ts`:
   - Move scheduler-start out of the request path. Either a module-level
     `startGitSyncSchedulerForConfig()` invoked once at module import, or an
     explicit `ensureSchedulerStarted()` called from a single startup hook
     (e.g. a small `src/lib/startup.ts`) imported by both pages and health
     routes.
   - Static build mode still must NOT start the scheduler — keep the
     `isStaticBuildMode()` guard.
   - `loadConfiguredCatalog()` no longer awaits the initial sync. Requests
     read from the in-memory cache. If the cache is empty (sync still in
     flight, sync failed, or no sources), it returns an empty/partial
     snapshot — the new index page banner from task-XXX (the #3 follow-up
     inline change) renders a loading or failed-sync state instead of
     blocking.
2. `src/pages/health/ready.ts`:
   - Import the startup hook so first-touch of /health/ready also kicks the
     scheduler (covers cases where the health probe arrives before any other
     request).
   - When `config.gitSources.length > 0`, check whether the initial sync has
     completed (use `getGitSyncStatuses()` — each status carries
     `lastSyncFinishedAt`). If at least one source has not finished, return
     `503 not-ready` with `{ status: 'not-ready', reason: 'initial-git-sync' }`.
   - When all sources have finished (regardless of success/failure), return
     `200 ready`. A failed initial sync is still "ready" — the pod can serve
     the page and the banner will explain the failure to the user. Readiness
     gating is about responsiveness, not about catalog correctness.
3. `src/lib/git-sync.ts`:
   - Expose a helper `hasCompletedInitialSync(): boolean` (derive from
     statuses) so health route doesn't reach into internals.

## Acceptance criteria

- Cold pod hit with `kubectl get pods -w` shows the pod stays `0/1 ready`
  until git sync completes, then flips to `1/1`.
- First request after the readiness flip returns within normal latency
  (catalog is cached; no `waitForInitialGitSync()` on the request path).
- `/health/ready` returns `503` during initial sync, then `200` after.
- `/health/live` continues to return 200 unconditionally (probe-friendly
  liveness, untouched).
- Static build mode unchanged: scheduler is never started; `pnpm build:static`
  produces a one-shot snapshot.
- Unit coverage:
  - readiness endpoint returns 503 while statuses indicate unfinished sync
  - readiness endpoint returns 200 once all sources have finished
  - failed initial sync still flips to ready (failures are surfaced in the UI,
    not at the probe layer)
- `pnpm test && pnpm build && pnpm build:static` all green.

## Out of scope

- Removing the lazy `loadConfiguredCatalog` blocking entirely without the
  readiness gate — that would surface empty snapshots to users in
  non-k8s setups (dev, plain docker). The companion inline banner change
  handles that gracefully, but the eager-start + readiness-gate is the
  primary fix for k8s.
- Sync retry policy / backoff (separate concern).
- Exposing readiness details on a richer admin endpoint (could be a follow-up
  if needed).

## References

- ADR 008 — in-process git sync scheduler
- `src/lib/catalog/load.ts`
- `src/lib/git-sync.ts`
- `src/pages/health/ready.ts`
- companion inline change: empty-snapshot banner in `src/pages/index.astro`
