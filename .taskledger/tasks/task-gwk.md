---
id: task-gwk
title: OIDC client + /auth/login route
status: done
priority: medium
type: feature
created_at: 2026-05-18T21:18:30Z
updated_at: 2026-05-19T11:19:14Z
created_by: claude
assignee: null
depends_on:
  - task-sbi
  - task-nq9
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

Create src/lib/auth/oidc.ts with lazy openid-client discovery cache against https://login.microsoftonline.com/<tenant>/v2.0/.well-known/openid-configuration. Implement buildLoginRedirect() generating PKCE verifier/challenge (S256), state, nonce; storing them plus returnTo in __servdir_oidc_tx (10min TTL). Add src/pages/auth/login.ts (prerender=false) that calls buildLoginRedirect and returns 302 to Entra authorize endpoint with response_type=code, scope='openid profile email'. Tests with hermetic JWKS.

## Notes

### 2026-05-19T11:13:16Z - claude

Approach: oidc.ts exposes pure-ish functions (buildLoginRedirect takes OidcRuntimeConfig as param, not from process.env) for testability. Exported pieces: signTxPayload/verifyTxPayload (used here and by task-vaq), validateReturnTo (security-critical, deserves direct tests), buildLoginRedirect (orchestration). Discovery cache is a module-level singleton with _resetDiscoveryCache for tests. openid-client mocked in tests for hermeticity. TX_TTL = 600s per spec. Scope hardcoded 'openid profile email'.
### 2026-05-19T11:19:14Z - claude

Done. oidc.ts with discovery cache (module-singleton, keyed by tenantId+clientId, exposes _resetDiscoveryCache for tests), signTxPayload/verifyTxPayload (same HS256/jose pattern as session.ts — not extracted to a shared helper yet, two clear users isn't worth the abstraction), validateReturnTo (security-critical, rejects scheme-relative '//evil.com' and absolute URLs), buildLoginRedirect (orchestration). login route at /auth/login with prerender=isStaticBuildMode() so the static build prerenders it as the 'OIDC not enabled' 404 stub instead of breaking with NoAdapterInstalled. STATIC-BUILD GOTCHA discovered: test files cannot live under src/pages/ — Astro picks them up as routes and tries to prerender them. Relocated login.test.ts -> src/lib/auth/login-route.test.ts. All future /auth/*.test.ts files follow this convention. 19 new tests (14 oidc + 5 login route), total 130 pass. pnpm build + build:static both green.
