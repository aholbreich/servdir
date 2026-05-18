---
id: task-tsu
title: Staging deploy + manual live login verification
status: open
priority: high
type: ops
created_at: 2026-05-18T21:18:45Z
updated_at: 2026-05-18T21:18:45Z
created_by: claude
assignee: null
depends_on:
  - task-e5m
  - task-ep4
claim:
  actor: null
  claimed_at: null
  expires_at: null
  heartbeat_at: null
tags:
  - sso
  - auth
---

## Description

Set AUTH_MODE=oidc plus the AUTH_OIDC_* and AUTH_SESSION_SECRET env vars on servdir.staging.swing.aws.myneva.cloud. Deploy. Smoke-test: hit a protected route in a clean browser, complete the Entra login, confirm redirect back lands on the original path with __servdir_session cookie set. Verify logout. Verify second user (different tenant member) can log in. Rotate the client secret that was leaked in chat on 2026-05-18.
