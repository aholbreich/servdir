---
id: task-gwk
title: OIDC client + /auth/login route
status: open
priority: medium
type: feature
created_at: 2026-05-18T21:18:30Z
updated_at: 2026-05-18T21:18:30Z
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
