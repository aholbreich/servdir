---
id: task-vaq
title: /auth/callback route (code exchange + ID token + tenant validation)
status: done
priority: medium
type: feature
created_at: 2026-05-18T21:18:34Z
updated_at: 2026-05-19T11:24:37Z
created_by: claude
assignee: null
depends_on:
  - task-gwk
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

Add src/pages/auth/callback.ts (prerender=false). Read+verify __servdir_oidc_tx, validate state matches query state, exchange code via openid-client.authorizationCodeGrant() with the PKCE verifier, verify ID token (signature against JWKS, issuer=https://login.microsoftonline.com/<tenantId>/v2.0, audience=clientId, nonce, exp, tid==configured tenantId — tenant pin is the day-one authz check). Extract {sub,email,name,oid}, mint session cookie, clear tx cookie, redirect to validated returnTo (same-origin relative path; reject scheme-relative and absolute; default /). Tests cover good code, bad state, bad tenant, expired token.

## Notes

### 2026-05-19T11:21:38Z - claude

Approach: handleCallback(oidcRuntimeConfig, request) in oidc.ts mirrors buildLoginRedirect — pure-ish, takes config explicitly. Returns discriminated result: {ok: true, sessionToken, sessionCookie, txCookieClear, returnTo, user} | {ok: false, reason, status}. Failure reasons (operator-visible WARN logs): tx_missing | tx_invalid | state_missing | state_mismatch | token_exchange_failed | tenant_mismatch | missing_claims. Tenant pin: explicit check on claims.tid even though openid-client validates issuer (defense-in-depth, spec-mandated). callback.ts is thin HTTP shim using two Set-Cookie headers via Headers.append. Extending OidcRuntimeConfig with sessionTtlHours since session cookie needs it.
### 2026-05-19T11:24:37Z - claude

Done. handleCallback in oidc.ts: 10 new cases covering happy path + 6 named failure reasons + preferred_username fallback + hostile returnTo sanitization. callback.ts hands off to handleCallback and translates result to HTTP (302 with two Set-Cookie via Headers.append). callback-route.test.ts mocks handleCallback (hoisted) for handler-shape coverage. OidcRuntimeConfig extended with sessionTtlHours; login.ts updated. Tenant pin via claims.tid is belt-and-suspenders with openid-client's issuer validation (issuer URL contains tenantId so a wrong-tenant token fails issuer check first, but explicit tid check is spec-mandated and cheap). 145/145 tests pass, both builds green. Next ticket task-e5m wires this into middleware.
