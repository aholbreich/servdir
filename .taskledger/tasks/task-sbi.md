---
id: task-sbi
title: Add openid-client dependency + OIDC config validation
status: done
priority: medium
type: feature
created_at: 2026-05-18T21:18:18Z
updated_at: 2026-05-19T10:48:39Z
created_by: claude
assignee: null
depends_on:
  - task-gpv
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

pnpm add openid-client. Extend getConfig() so AUTH_MODE=oidc requires AUTH_OIDC_TENANT_ID, AUTH_OIDC_CLIENT_ID, AUTH_OIDC_CLIENT_SECRET, AUTH_OIDC_REDIRECT_URI, AUTH_SESSION_SECRET. Validate session secret length >= 32 bytes after base64 decode. Missing/invalid -> misconfiguredResponse path (existing 500 plumbing). No routes yet, no openid-client usage yet — just dep + validation + tests.

## Notes

### 2026-05-19T10:48:39Z - claude

Done. openid-client 6.8.4 installed (jose 6.2.3 + oauth4webapi 3.8.6 pulled transitively). AuthConfig OIDC variant tightened to required strings. Validation moved alongside in buildAuthConfig: combined-error 'Missing required OIDC config: ...' lists ALL missing fields at once for operator convenience; AUTH_OIDC_REDIRECT_URI URL parse; AUTH_SESSION_SECRET base64-decode >= 32 bytes with hint 'openssl rand -base64 32'; ENC[ placeholder check on secrets. Basic-auth validation moved alongside basic builder for symmetry. validateConfig is now only the catalog-source check. Updated middleware tests to set valid OIDC env where the config is reached; added 'health bypass even with missing oidc config' test pinning the operator lifeline. 91/91 tests pass, both builds green.
