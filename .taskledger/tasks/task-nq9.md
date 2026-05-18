---
id: task-nq9
title: Session JWT module + cookie helpers
status: open
priority: medium
type: feature
created_at: 2026-05-18T21:18:26Z
updated_at: 2026-05-18T21:18:26Z
created_by: claude
assignee: null
depends_on:
  - task-sbi
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

Create src/lib/auth/session.ts (sign + verify HS256 JWT using jose, payload {sub,email,name,exp}, 8h TTL, 60s clock skew tolerance) and src/lib/auth/cookies.ts (helpers for __servdir_session and __servdir_oidc_tx with HttpOnly, Secure, SameSite=Lax, Path=/). Unit tests for round-trip, expiry, tampering, short-secret rejection, cookie flag assertions.
