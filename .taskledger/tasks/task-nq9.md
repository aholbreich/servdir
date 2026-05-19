---
id: task-nq9
title: Session JWT module + cookie helpers
status: done
priority: medium
type: feature
created_at: 2026-05-18T21:18:26Z
updated_at: 2026-05-19T11:03:23Z
created_by: claude
assignee: null
depends_on:
  - task-sbi
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

Create src/lib/auth/session.ts (sign + verify HS256 JWT using jose, payload {sub,email,name,exp}, 8h TTL, 60s clock skew tolerance) and src/lib/auth/cookies.ts (helpers for __servdir_session and __servdir_oidc_tx with HttpOnly, Secure, SameSite=Lax, Path=/). Unit tests for round-trip, expiry, tampering, short-secret rejection, cookie flag assertions.

## Notes

### 2026-05-19T11:00:14Z - claude

Architecture (advisor pass): use discriminated jose error classes (JWTExpired, JWSSignatureVerificationFailed, JWTInvalid) -> {reason} field for grep-friendly diagnostics. One structured log line per auth decision (mint/verify/parse). Keep session.ts session-specific — do NOT generalize to signToken/verifyToken (task-gwk will decide whether to extract for the tx cookie). Config knob added: AUTH_SESSION_TTL_HOURS (default 8) — only deviation from spec, will document in ADR 012. Operator gotcha to note in README: rotating AUTH_SESSION_SECRET invalidates all sessions instantly (expected behaviour, not a bug).
### 2026-05-19T11:03:22Z - claude

Done. jose 6.2.3 installed as direct dep (was transitive of openid-client; pnpm doesn't hoist transitives so direct usage requires direct dep). session.ts: HS256 sign/verify, 60s clock tolerance hardcoded, MIN_SECRET_BYTES=32 defense-in-depth. Discriminated verify reasons via jose error classes: 'expired' | 'invalid_signature' | 'malformed' | 'unknown' — emit as structured log field 'reason' for grep+jq. cookies.ts: __servdir_session and __servdir_oidc_tx, all hardened (HttpOnly+Secure+SameSite=Lax+Path=/), urlEncode/decode for special chars. Config knob added: AUTH_SESSION_TTL_HOURS (default 8, range 0 < x <= 168). DEBUG STORY for company-env: LOG_LEVEL=debug LOG_FORMAT=json gives full structured trail; failure paths log at WARN by default (always visible). Namespaces: auth-session, auth-cookies. OPERATOR GOTCHA: rotating AUTH_SESSION_SECRET invalidates all live sessions instantly — re-login wave is expected; document in ADR 012. 111/111 tests pass, builds green.
