---
id: task-3dp
title: Relocate basic auth to src/lib/auth/basic.ts
status: in_progress
priority: medium
type: refactor
created_at: 2026-05-18T21:18:11Z
updated_at: 2026-05-18T21:37:15Z
created_by: claude
assignee: null
depends_on: []
claim:
  actor: claude
  claimed_at: 2026-05-18T21:35:05Z
  expires_at: 2026-05-18T22:35:05Z
  heartbeat_at: 2026-05-18T21:35:05Z
tags:
  - sso
  - auth
---

## Description

Move src/lib/auth.ts to src/lib/auth/basic.ts and src/lib/auth.test.ts to src/lib/auth/basic.test.ts. Update imports in src/middleware.ts. No behavior change. Verify with pnpm test.

## Notes

### 2026-05-18T21:36:13Z - claude

Build initially failed with 'Cannot find module @astrojs/react' — unrelated to the move. node_modules/@astrojs/ was empty though pnpm-lock.yaml and package.json listed the dep. Pre-existing environment drift, ran pnpm install to recover.
### 2026-05-18T21:37:15Z - claude

Discovery: 'pnpm build' fails on main today with: Rollup failed to resolve import 'tslib' from react-remove-scroll. Verified pre-existing (git stash + build still fails). Test suite is green. The task-3dp move itself is correct — auth tests pass after the move. Build verification blocked by this unrelated tslib issue.
