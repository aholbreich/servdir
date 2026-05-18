---
id: task-ep4
title: Write ADR 012 + update README, .env.example, working-notes
status: open
priority: medium
type: docs
created_at: 2026-05-18T21:18:41Z
updated_at: 2026-05-18T21:18:41Z
created_by: claude
assignee: null
depends_on:
  - task-e5m
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

Create .adr/012-app-level-oidc-login-with-microsoft-entra.md documenting the three-mode auth model, openid-client choice, session JWT cookie, tenant pin authz. Mark as superseding the auth-strategy portion of ADR 007 (007 stays valid for AUTH_MODE=basic). Update README auth section, add AUTH_MODE / AUTH_OIDC_* to .env.example with comments, add a short note to docs/working-notes.md on the new env vars and the BASIC_AUTH_ENABLED legacy inference.
