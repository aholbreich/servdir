---
id: task-6hv
title: Pin health endpoint auth-bypass with middleware test
status: done
priority: medium
type: test
created_at: 2026-05-19T10:42:26Z
updated_at: 2026-05-19T10:43:23Z
created_by: claude
assignee: null
depends_on: []
claim:
  actor: null
  claimed_at: null
  expires_at: null
  heartbeat_at: null
tags:
  - auth
  - test
  - infra
---

## Description

Add src/middleware.test.ts that exercises onRequest with a mocked astro:middleware module. Cover /health/live and /health/ready under AUTH_MODE=basic and AUTH_MODE=oidc, asserting next() is called (no 401 / 501). Plus a baseline positive test that a non-health path under AUTH_MODE=basic with no Authorization header returns 401, so the bypass test isn't trivially passing. Guards the invariant that k8s liveness/readiness probes work in every auth mode — currently held only by the ordering of two ifs in middleware.ts:28-36.

## Notes

### 2026-05-19T10:43:23Z - claude

Added src/middleware.test.ts with 6 cases: health endpoints bypass auth in both basic and oidc modes (4), plus baseline 401/501 on non-health paths (2). Uses vi.mock('astro:middleware') to make defineMiddleware a pass-through so onRequest can be invoked directly with a minimal {request} context. Full suite: 86/86 pass (was 80, +6 new). pnpm build green.
