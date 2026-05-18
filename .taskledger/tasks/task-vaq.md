---
id: task-vaq
title: /auth/callback route (code exchange + ID token + tenant validation)
status: open
priority: medium
type: feature
created_at: 2026-05-18T21:18:34Z
updated_at: 2026-05-18T21:18:34Z
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
