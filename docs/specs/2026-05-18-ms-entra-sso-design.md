# Microsoft Entra SSO — Design Spec

**Date:** 2026-05-18
**Status:** Approved (design); implementation pending
**Author:** Alexander
**Related ADRs:** ADR 007 (basic auth — partial supersede via ADR 012)

## Goal

Add app-level OIDC login against Microsoft Entra ID to servdir, so the
internal Swing staging deployment can authenticate real users instead of
relying on a shared basic-auth credential. Replace nothing existing —
basic auth stays available as a deployment mode for installs that don't
have an Entra tenant.

## Non-Goals

- Group / role-based authorization (any tenant member is allowed in v1).
- Refresh-token rotation or silent re-auth (re-login on cookie expiry is fine).
- Logged-in-as UI / user menu (cheap follow-up, not in v1).
- RP-initiated logout against Entra (local cookie clear only).
- Authenticating the static-export build (static mode stays unprotected at the app layer).
- Adding a database or persistent session store.

## Architecture

### Auth mode dispatch

The catalog supports three auth strategies, selected at startup via env:

| `AUTH_MODE` | Behavior                                       |
|-------------|------------------------------------------------|
| `none`      | All requests allowed (current default).        |
| `basic`     | Existing basic-auth shim (ADR 007).            |
| `oidc`      | Microsoft Entra OIDC, the new mode.            |

`src/lib/config.ts` exposes a discriminated union:

```ts
export type AuthConfig =
  | { mode: 'none' }
  | { mode: 'basic'; username: string; password: string }
  | {
      mode: 'oidc';
      tenantId: string;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      sessionSecret: string;
    };
```

`getConfig()` fails fast on startup if the selected mode is missing
required vars (returns a misconfigured-style error so the existing
`misconfiguredResponse()` path covers it).

`src/middleware.ts` becomes a thin switch on `config.auth.mode` and
delegates to:

- `src/lib/auth/basic.ts` (moved from `src/lib/auth.ts`, no logic change)
- `src/lib/auth/oidc.ts` (new)

Health endpoints (`/health/live`, `/health/ready`) bypass auth in all
modes, same as today. Static build mode (`isStaticBuildMode()`) still
short-circuits the middleware before any auth runs.

### OIDC flow

Standard OIDC Authorization Code + PKCE against Entra v2.0.

```
Browser              servdir                    Entra
   |  GET /private/x   |                          |
   |------------------>|                          |
   |  302 /auth/login?return_to=/private/x         |
   |<------------------|                          |
   |  GET /auth/login  |                          |
   |------------------>|                          |
   |                   | mint tx cookie (state,    |
   |                   |   nonce, pkce verifier,   |
   |                   |   return_to)              |
   |  302 to Entra authorize endpoint              |
   |<------------------|                          |
   |  GET authorize    |                          |
   |--------------------------------------------->|
   |  302 /auth/callback?code=...&state=...        |
   |<---------------------------------------------|
   |  GET /auth/callback                          |
   |------------------>|                          |
   |                   | validate state vs tx cookie
   |                   | exchange code for tokens |
   |                   |------------------------->|
   |                   |<-------------------------|
   |                   | verify ID token, tenant  |
   |                   | mint session cookie       |
   |                   | clear tx cookie           |
   |  302 return_to    |                          |
   |<------------------|                          |
```

Three new Astro server endpoints (all `prerender = false`):

- **`GET /auth/login`** — generates PKCE `code_verifier` (43–128 chars,
  base64url), `state` (random 32 bytes), `nonce` (random 16 bytes).
  Stores `{state, nonce, codeVerifier, returnTo}` in a signed transient
  cookie `__servdir_oidc_tx` (max-age 10 min, `HttpOnly`, `Secure`,
  `SameSite=Lax`). Redirects to the Entra `authorize` endpoint with
  `response_type=code`, `scope=openid profile email`,
  `code_challenge_method=S256`, `code_challenge`,
  `redirect_uri=<AUTH_OIDC_REDIRECT_URI>`.

- **`GET /auth/callback`** — reads + verifies `__servdir_oidc_tx`, fails
  with `400` on missing or invalid. Validates query `state` matches the
  tx cookie. Calls `openid-client.authorizationCodeGrant()` with the
  PKCE verifier. Verifies ID token (signature against JWKS, issuer ==
  `https://login.microsoftonline.com/<tenantId>/v2.0`, audience ==
  clientId, nonce matches, `exp` in future, `tid` claim ==
  configured tenantId — the tenant pin is the day-one authorization
  check). Extracts `{sub, email, name, oid}`. Mints session cookie.
  Clears tx cookie. Redirects to the validated `returnTo` (must be a
  same-origin relative path; defaults to `/`).

- **`POST /auth/logout`** — clears `__servdir_session`, redirects to
  `/`. Local logout only.

Discovery: at first request, lazily fetch the OpenID configuration
metadata from
`https://login.microsoftonline.com/<tenantId>/v2.0/.well-known/openid-configuration`
and cache the resulting `openid-client` `Configuration` for the process
lifetime. No periodic refresh in v1.

### Session cookie

Stateless signed JWT — no DB, no in-memory map. Works under multiple
replicas without coordination.

- Cookie name: `__servdir_session`
- Algorithm: HS256, signed with `AUTH_SESSION_SECRET` (≥ 32 bytes,
  validated at startup)
- Payload: `{ sub: string, email: string, name: string, exp: number }`
- TTL: 8 hours from issue
- Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`,
  `Max-Age` matching token `exp`
- Library: `jose` (transitive dep of `openid-client`, no extra package
  needed)

OIDC middleware decision tree:

1. If request is `/auth/*` → `next()` (the endpoint handles itself).
2. If `__servdir_session` cookie present and verifies → set
   `context.locals.user = {sub, email, name}`, call `next()`.
3. If invalid / missing and request accepts `text/html` → `302` to
   `/auth/login?return_to=<encoded original path>`.
4. Otherwise → `401 Unauthorized` with JSON `{error: "unauthenticated"}`.

`context.locals.user` type is declared in `src/env.d.ts` so all routes
get it typed.

### Static-mode behavior

Unchanged from today: middleware's first check is still
`if (isStaticBuildMode()) return next()`, regardless of `AUTH_MODE`.
Static exports remain unauthenticated at the app layer (host them
behind whatever auth the static host provides if needed).

### Local dev defaults

`AUTH_MODE` is not set in `.env.example` for dev, so `getConfig()`
resolves it to `none`. `pnpm dev` runs unauthenticated by default. No
localhost redirect URI is registered with Entra. A developer who wants
to test the live flow sets the env vars themselves against a tunneling
URL or an as-needed separate dev app registration.

## Configuration

### Environment variables

| Variable                  | Required when           | Notes                                                                 |
|---------------------------|-------------------------|-----------------------------------------------------------------------|
| `AUTH_MODE`               | always (default `none`) | `none` \| `basic` \| `oidc`. New variable.                            |
| `BASIC_AUTH_ENABLED`      | `AUTH_MODE=basic`       | Existing var, unchanged. Must be `true` when `AUTH_MODE=basic`.       |
| `BASIC_AUTH_USERNAME`     | `AUTH_MODE=basic`       | Existing var, unchanged.                                              |
| `BASIC_AUTH_PASSWORD`     | `AUTH_MODE=basic`       | Existing var, unchanged.                                              |
| `AUTH_OIDC_TENANT_ID`     | `AUTH_MODE=oidc`        | UUID. For staging: `0696ad1c-a986-4600-a72c-7e0a5502930c`.            |
| `AUTH_OIDC_CLIENT_ID`     | `AUTH_MODE=oidc`        | UUID. For staging: `fc2f3e48-7e37-4ad3-b222-0fadf2b6715a`.            |
| `AUTH_OIDC_CLIENT_SECRET` | `AUTH_MODE=oidc`        | Provided by IT, rotated independently. **Never logged.**              |
| `AUTH_OIDC_REDIRECT_URI`  | `AUTH_MODE=oidc`        | Must match the value registered in Entra. Staging: `https://servdir.staging.swing.aws.myneva.cloud/auth/callback`. |
| `AUTH_SESSION_SECRET`     | `AUTH_MODE=oidc`        | ≥ 32 bytes of entropy, base64 / hex. Generated with `openssl rand -base64 32`. |

`getConfig()` performs presence + length validation at startup. Missing
or short values cause a misconfigured response (same 500 path as
today). Existing `BASIC_AUTH_*` env vars are kept unchanged — no
rename — so deployments already running basic auth only need to add
`AUTH_MODE=basic` to opt into the new explicit mode model. For one
release we accept the legacy zero-config behavior: if `AUTH_MODE` is
unset and `BASIC_AUTH_ENABLED=true`, we infer `mode=basic` and log a
warning recommending the explicit setting.

### `.env.example`

Updated to show all three modes with comments explaining when each
applies. Default left empty (= `none`).

## File Layout

**New files:**

- `src/lib/auth/oidc.ts` — discovery cache, login URL builder, code
  exchange, ID token + tenant validation. Exposes
  `buildLoginRedirect()`, `handleCallback()`.
- `src/lib/auth/session.ts` — sign / verify the session JWT.
- `src/lib/auth/cookies.ts` — cookie helpers for tx + session
  (parse, mint, clear; centralizes flags).
- `src/lib/auth/oidc.test.ts`
- `src/lib/auth/session.test.ts`
- `src/lib/auth/cookies.test.ts`
- `src/pages/auth/login.ts`
- `src/pages/auth/callback.ts`
- `src/pages/auth/logout.ts`

**Moved / refactored:**

- `src/lib/auth.ts` → `src/lib/auth/basic.ts` (no logic change; just a
  move + import-path updates in middleware and the existing test).
- `src/lib/auth.test.ts` → `src/lib/auth/basic.test.ts`.
- `src/lib/config.ts` — replace `basicAuth` field with `auth`
  discriminated union; add fail-fast validators for the OIDC branch;
  existing `BASIC_AUTH_*` env vars unchanged; add the legacy
  `BASIC_AUTH_ENABLED=true` → `mode=basic` inference with a warning.
- `src/middleware.ts` — switch on `config.auth.mode`; keep static-mode
  + health-path short-circuits exactly as today.
- `src/env.d.ts` — declare `App.Locals.user`.

**Docs:**

- `.adr/012-app-level-oidc-login-with-microsoft-entra.md` — supersedes
  the auth-strategy portion of ADR 007. ADR 007 remains valid for the
  `AUTH_MODE=basic` deployment mode.
- `docs/working-notes.md` — short note on the three-mode auth model
  and the `BASIC_AUTH_ENABLED` legacy inference.
- `README.md` — update the auth section.

**New dependency:**

- `openid-client` (current major, ESM). Brings `jose` and
  `oauth4webapi` transitively — we use `jose` directly for session
  signing.

## Security Considerations

- **PKCE** is mandatory (S256) — Microsoft requires it for public-style
  flows and there's no reason to skip it for confidential clients
  either. Defends against authorization-code interception.
- **State** parameter binds the callback to the originating browser
  session. Stored in the signed tx cookie; mismatch → 400.
- **Nonce** binds the ID token to the auth request. Verified during ID
  token validation.
- **Tenant pin** — `tid` claim must equal the configured tenant ID.
  This is the v1 authorization check ("only myneva users"). Without
  this pin an attacker with any Microsoft account could log in.
- **`returnTo` validation** — must be a same-origin relative path
  starting with `/`. Reject scheme-relative (`//evil`) and absolute
  URLs to prevent open redirect.
- **Cookies** — all set with `HttpOnly`, `Secure`, `SameSite=Lax`,
  `Path=/`. `Secure` is unconditional; the app is HTTPS-only in any
  deployment that runs OIDC (Entra refuses non-HTTPS redirect URIs
  outside `http://localhost`).
- **Session secret** rejected at startup if shorter than 32 bytes
  after base64 decode.
- **Client secret** never logged. Validation errors mention only the
  variable name, never its value.
- **Clock skew** — allow ±60 s on ID token + session JWT verification
  to tolerate small drift between servdir and Entra.
- **CSRF** for `POST /auth/logout` — require the request to originate
  same-site (the `SameSite=Lax` session cookie suffices for a
  link-triggered logout; if we add a logout button submitted via fetch
  we'll add an explicit CSRF token).

## Testing Strategy

- **Unit tests:**
  - `session.test.ts` — round-trip sign/verify, expiry rejection,
    tampered-payload rejection, short-secret rejection.
  - `cookies.test.ts` — flag assertions, tx-cookie state round-trip.
  - `oidc.test.ts` — login URL contains required params; ID token
    validator rejects bad issuer / audience / tenant / nonce / expired
    tokens. Uses a locally-generated JWKS (jose) so the test is
    hermetic.
- **Integration tests** for the three routes — exercise the middleware
  via Astro's testing utilities (or by invoking the route handlers
  directly with mocked `openid-client`). Cover: unauth GET html →
  redirect to /auth/login; unauth GET non-html → 401; callback with
  good code → session cookie set + redirect to returnTo; callback with
  bad state → 400; cookie expired → redirect to /auth/login.
- **Existing basic-auth tests** continue to pass after the file move
  (regression check).
- **Verification baseline:** `pnpm test && pnpm build` plus
  `pnpm build:static` (touches middleware, must not regress static
  mode).

## Open Decisions Locked During Brainstorm

| Decision                  | Chosen                            |
|---------------------------|-----------------------------------|
| SSO ↔ basic auth          | Selectable per deployment         |
| OIDC library              | `openid-client` (handrolled routes) |
| Local dev default         | `AUTH_MODE=none`                  |
| Session storage           | Signed JWT cookie, no DB          |
| Authorization model (v1)  | Any user from the configured tenant |
| Login UX                  | Auto-redirect, no landing page    |
| Logout                    | Local-only cookie clear           |
| Token rotation            | None — re-login at 8 h expiry     |
| Static mode               | Auth bypassed, same as today      |

## Out-of-Scope / Follow-ups

- Production Entra app registration (separate from staging).
- Group-based authorization (require specific Entra group claim).
- `/me` endpoint + header dropdown showing the logged-in user.
- RP-initiated logout (`end_session_endpoint`) if other Entra-protected
  apps share a session in the same browser.
- Audit log for login events.
- Rotating the staging client secret that was leaked into a chat
  transcript on 2026-05-18.
