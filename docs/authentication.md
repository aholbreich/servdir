# Authentication Guide

Servdir authentication is an app-level feature of the default Node server runtime. Static exports are always unauthenticated at the app layer; put static deployments behind your hosting provider's auth if needed.

## Modes

Select one mode with `AUTH_MODE`:

| Mode | Required settings | Use when |
|---|---|---|
| `none` | none | Local dev, trusted networks, or a separate proxy already handles auth. |
| `basic` | `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD` | Small installs without an identity provider. Shared credential only. |
| `oidc` | Entra app settings plus `AUTH_SESSION_SECRET` | Microsoft Entra ID login with real per-user identity. |

If `AUTH_MODE` is unset but legacy `BASIC_AUTH_ENABLED=true` is present, servdir infers `AUTH_MODE=basic` and logs a warning. New deployments should set `AUTH_MODE` explicitly.

## Basic auth

```env
AUTH_MODE=basic
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=replace-me
```

Legacy compatibility: if `AUTH_MODE` is unset but
`BASIC_AUTH_ENABLED=true` is present, the runtime infers
`AUTH_MODE=basic` and logs a one-line warning.

Use HTTPS in front of servdir. Store credentials in a Secret in production.

## Microsoft Entra OIDC

### Is `AUTH_SESSION_SECRET` mandatory?

Yes, but only when `AUTH_MODE=oidc` in the server runtime.

It is not an Entra value. It is a servdir-owned signing key used for:

- `__servdir_oidc_tx`, the short-lived login transaction cookie carrying OIDC `state`, `nonce`, the PKCE verifier, and `returnTo`.
- `__servdir_session`, the stateless session JWT cookie used after login.

Without a stable secret, servdir cannot verify that those cookies were minted by the app and were not tampered with. A random per-process fallback would also break callbacks after pod restarts and would not work across multiple replicas, so the runtime requires an explicit value.

Generate one with at least 32 random bytes:

```bash
openssl rand -base64 32
```

Use the same value for all replicas of the same deployment. Rotating it is safe but invalidates all active sessions and all in-progress login transactions immediately, so users must sign in again.

### Entra app registration checklist

In Microsoft Entra ID, create or use an App Registration:

1. Add a **Web** redirect URI that exactly matches servdir:
   `https://<your-host>/auth/callback`.
2. Copy the Application / Client ID into `AUTH_OIDC_CLIENT_ID`.
3. Copy the Directory / Tenant ID into `AUTH_OIDC_TENANT_ID`.
4. Create a client secret under **Certificates & secrets**.
5. Copy the client secret **Value** into `AUTH_OIDC_CLIENT_SECRET`.

Important: use the client secret **Value**, not the **Secret ID**. The Secret ID is only an Entra portal identifier and cannot be used for OAuth token exchange.

The app uses the standard OIDC scopes `openid profile email`.

### Runtime configuration

```env
AUTH_MODE=oidc
AUTH_OIDC_TENANT_ID=00000000-0000-0000-0000-000000000000
AUTH_OIDC_CLIENT_ID=00000000-0000-0000-0000-000000000000
AUTH_OIDC_CLIENT_SECRET=<entra-client-secret-value>
AUTH_OIDC_REDIRECT_URI=https://servdir.example.com/auth/callback
AUTH_SESSION_SECRET=<output-of-openssl-rand-base64-32>
# optional, default 8, range 1..168
AUTH_SESSION_TTL_HOURS=8
```

Any successfully authenticated user from the configured tenant is allowed in. The tenant ID claim (`tid`) is the v1 authorization check. Group- or role-based authorization is intentionally not part of the first OIDC implementation.

## Kubernetes and GitOps notes

Keep non-secret settings in a ConfigMap and secret values in Kubernetes Secrets:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: servdir-config
data:
  AUTH_MODE: oidc
  AUTH_OIDC_TENANT_ID: 00000000-0000-0000-0000-000000000000
  AUTH_OIDC_CLIENT_ID: 00000000-0000-0000-0000-000000000000
  AUTH_OIDC_REDIRECT_URI: https://servdir.example.com/auth/callback
---
apiVersion: v1
kind: Secret
metadata:
  name: servdir-secrets
type: Opaque
stringData:
  AUTH_OIDC_CLIENT_SECRET: <entra-client-secret-value>
  AUTH_SESSION_SECRET: <output-of-openssl-rand-base64-32>
```

Load both with `envFrom` in the Deployment. If you split secrets across multiple Kubernetes Secret objects, add each one to `envFrom`.

Secret updates do not change the environment of an already-running container. Roll the Deployment after changing `AUTH_OIDC_CLIENT_SECRET` or `AUTH_SESSION_SECRET`. Tools such as Reloader, Helm checksum annotations, or Flux image/config rollouts are fine.


## Health endpoints and unauthenticated behavior

`/health/live` and `/health/ready` bypass auth in every mode so Kubernetes probes and load balancer health checks keep working.

For OIDC-protected routes:

- Browser-style `GET` requests redirect to `/auth/login?return_to=<path>`.
- Non-browser/API requests receive `401 {"error":"unauthenticated"}`.
- `POST /auth/logout` clears only the servdir session cookie; it does not sign the user out of Entra globally.

## Troubleshooting

### Useful log filter

For first rollout or login debugging, use structured logs if possible:

```env
LOG_FORMAT=json
LOG_LEVEL=debug
```

Then filter auth events:

```bash
kubectl -n <namespace> logs deploy/servdir --since=30m \
  | jq 'select(.component | startswith("auth-"))'
```

With text logs, grep the same component names:

```bash
kubectl -n <namespace> logs deploy/servdir --since=30m \
  | grep -E 'auth-oidc|auth-login|auth-callback|auth-session|AADSTS|token exchange failed'
```

### Common failures

| Symptom / log | Likely cause | Fix |
|---|---|---|
| `Missing required OIDC config: AUTH_SESSION_SECRET` | `AUTH_MODE=oidc` but no session secret is present. | Generate `openssl rand -base64 32`, store it as `AUTH_SESSION_SECRET`, and roll the pod. |
| `AUTH_SESSION_SECRET must decode to at least 32 bytes` | The value is too short or not the generated base64 string. | Regenerate with `openssl rand -base64 32`. |
| `Encrypted secret placeholder detected in runtime env` | The pod received `ENC[...]` from a SOPS-encrypted manifest instead of decrypted values. | Check Flux/SOPS decryption on the applying `Kustomization`, reconcile, and roll the pod. |
| Browser shows `Login failed: token_exchange_failed` and logs show `AADSTS500112` | Redirect URI mismatch. Entra saw a callback URI different from the one used for authorization. | Ensure `AUTH_OIDC_REDIRECT_URI` exactly matches the Entra Web redirect URI and deploy a version that exchanges codes with the configured redirect URI. |
| `invalid_client` during token exchange | Wrong client ID/secret, expired secret, or the Entra Secret ID was used instead of Secret Value. | Put the client secret **Value** in `AUTH_OIDC_CLIENT_SECRET`; rotate if expired. |
| `callback rejected reason=tx_missing` | Callback URL opened without the short-lived transaction cookie. Common with stale copied callback URLs, expired login attempts, or blocked cookies. | Start a fresh login at `/auth/login`; do not reuse old callback URLs. Check HTTPS and cookie settings. |
| `callback rejected reason=state_mismatch` | Login transaction cookie and callback query came from different attempts. Multiple tabs or stale callbacks are common. | Start a fresh login flow. |
| `callback rejected reason=tenant_mismatch` | User authenticated from a different Entra tenant than configured. | Check `AUTH_OIDC_TENANT_ID` and the user/account selected in the Microsoft login prompt. |
| `401 {"error":"unauthenticated"}` from `curl /` | Expected for non-browser requests. | Use a browser, or send `Accept: text/html` to observe the redirect behavior. |

### Check what the pod sees without printing secrets

```bash
kubectl -n <namespace> exec deploy/servdir -- node -e '
for (const k of ["AUTH_OIDC_CLIENT_SECRET", "AUTH_SESSION_SECRET"]) {
  const v = process.env[k] || "";
  console.log(`${k} len=${v.length} startsEnc=${v.startsWith("ENC[")}`);
}
'
```

`startsEnc=true` means the runtime received encrypted placeholders, not usable secrets.
