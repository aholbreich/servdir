---
id: task-e5m
title: OIDC middleware branch + /auth/logout + locals.user typing
status: open
priority: medium
type: feature
created_at: 2026-05-18T21:18:38Z
updated_at: 2026-05-18T21:18:38Z
created_by: claude
assignee: null
depends_on:
  - task-vaq
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

Wire the oidc branch in src/middleware.ts: bypass /auth/* paths; if session cookie verifies, set context.locals.user={sub,email,name} and next(); else for GET text/html redirect 302 to /auth/login?return_to=<encoded path>; else 401 JSON {error:'unauthenticated'}. Add src/pages/auth/logout.ts handling POST: clear session cookie, redirect /. Declare App.Locals.user in src/env.d.ts. Integration tests for redirect/401/cookie-set flows via mocked openid-client.
