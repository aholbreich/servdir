---
id: task-gpv
title: Introduce AuthConfig discriminated union + mode dispatch in middleware
status: open
priority: medium
type: refactor
created_at: 2026-05-18T21:18:15Z
updated_at: 2026-05-18T21:18:15Z
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
