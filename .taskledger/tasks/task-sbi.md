---
id: task-sbi
title: Add openid-client dependency + OIDC config validation
status: open
priority: medium
type: feature
created_at: 2026-05-18T21:18:18Z
updated_at: 2026-05-18T21:18:18Z
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
