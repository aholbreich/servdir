---
id: task-gpv
title: Introduce AuthConfig discriminated union + mode dispatch in middleware
status: done
priority: medium
type: refactor
created_at: 2026-05-18T21:18:15Z
updated_at: 2026-05-19T10:40:08Z
created_by: claude
assignee: null
depends_on:
  - task-3dp
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

Replace basicAuth field on Config with auth: { mode: 'none' | 'basic' | 'oidc'; ... } discriminated union in src/lib/config.ts. AUTH_MODE env var selects the mode (default none). Keep BASIC_AUTH_* vars unchanged. Add legacy inference: if AUTH_MODE unset and BASIC_AUTH_ENABLED=true, infer mode=basic with a warning. Refactor src/middleware.ts to switch on config.auth.mode and delegate to basic handler (oidc branch can throw NotImplementedYet for now). Existing basic-auth tests stay green.

## Notes

### 2026-05-19T10:07:02Z - claude

Architecture review (with advisor): switch stays in middleware.ts per spec — no auth/index.ts extraction. health/ready keeps basicAuthEnabled for compat, adds authMode alongside. AuthConfig union introduces all variants now (OIDC fields optional, tightened in task-sbi). 501 (not 500) for the OIDC branch since it's a known gap, not a bug.
### 2026-05-19T10:35:39Z - claude

Done. config.ts: AuthConfig union (none|basic|oidc), AUTH_MODE env (default none), legacy inference BASIC_AUTH_ENABLED=true -> mode=basic with warn. Conflict (explicit AUTH_MODE + legacy true) logs an ignore-warning. middleware.ts: switch on auth.mode; oidc returns 501 (Not Implemented). health/ready: added authMode alongside basicAuthEnabled (kept for external API compat per advisor). CatalogStatusCard: prop renamed to authMode, rendered as 'Auth: disabled | basic | OIDC (Microsoft Entra)'. Verification: pnpm test 80/80 (was 73, +7 new auth tests), pnpm build, pnpm build:static all green. basic.ts itself untouched — its BasicAuthConfig {enabled,username,password} stays the lib contract; middleware adapts at call site.
### 2026-05-19T10:40:08Z - claude

Operator-convenience check (asked by user): /health/live and /health/ready are unauthenticated in all auth modes (middleware.ts:28-30 short-circuits BEFORE the auth switch and BEFORE config validation). k8s readiness/liveness probes work as expected. Gap: no automated test pins this guarantee — the ordering of two ifs in middleware.ts is the only thing protecting it. A small regression test would be worth adding (suggested follow-up ticket if not done inline).
