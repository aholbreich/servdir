---
id: task-e5m
title: OIDC middleware branch + /auth/logout + locals.user typing
status: done
priority: medium
type: feature
created_at: 2026-05-18T21:18:38Z
updated_at: 2026-05-19T11:28:03Z
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

## Notes

### 2026-05-19T11:25:53Z - claude

Approach: middleware OIDC branch — bypass /auth/* paths first (login + callback + logout must run unauthenticated), then read+verify __servdir_session; on success set locals.user={sub,email,name} and next(); on failure check Accept: text/html and 302 to /auth/login?return_to=<original path+query> for browsers, else 401 JSON for API/curl. /auth/logout is POST-only (CSRF-safe via SameSite=Lax session cookie), clears session, 302 to /. App.Locals.user typed in env.d.ts. Also added AUTH_MODE and AUTH_OIDC_* + AUTH_SESSION_* to ImportMetaEnv for type safety.
### 2026-05-19T11:27:54Z - claude

Done. middleware OIDC branch: /auth/* bypassed (login/callback/logout run unauthenticated); session cookie verified via verifySession from session.ts; on success locals.user set, on failure dispatched by Accept header — 302 to /auth/login?return_to=<encoded path+query> for HTML, 401 JSON {error:'unauthenticated'} for API. Treat Accept-less GET as HTML (browser default). /auth/logout is POST-only (CSRF-protected by SameSite=Lax session cookie), clears session, 302 to /. App.Locals.user typed in env.d.ts; ImportMetaEnv extended with AUTH_MODE + AUTH_OIDC_* + AUTH_SESSION_* for type safety. 9 new tests (7 middleware oidc + 2 logout route), total 154 pass. Both builds green.
