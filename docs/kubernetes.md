# Kubernetes Deployment Guide

## Table of Contents
- [Ops quick start](#ops-quick-start)
- [What this setup expects](#what-this-setup-expects)
- [Configuration reference](#configuration-reference)
- [Health checks](#health-checks)
- [Operational notes](#operational-notes)
- [Troubleshooting](#troubleshooting)

This guide is intentionally short and ops-first.
Start with the full example below, then adjust only the values you need.

## Ops quick start

This example shows the common first deployment shape:
- config in a `ConfigMap`
- credentials in a `Secret`
- SSH key mounted for Git access
- writable `/data` volume for checkout cache
- startup/readiness/liveness probes
- optional automatic rollout on Secret changes via Reloader annotation

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: servdir-config
data:
  CATALOG_TITLE: "Swing Service Catalog"
  GIT_SYNC_INTERVAL: "1m"

  GIT_SOURCE_CATALOG_MAIN: "git@bitbucket.org:myneva/servdir-catalog.git|main|services"
  GIT_SOURCE_FLUX_GITOPS: "git@bitbucket.org:myneva/flux-gitops.git|main"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: servdir-secrets
type: Opaque
stringData:
  BASIC_AUTH_USERNAME: admin
  BASIC_AUTH_PASSWORD: replace-me
```

### SSH Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: servdir-git-ssh
type: Opaque
stringData:
  id_ed25519: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    REPLACE_ME
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    bitbucket.org ssh-ed25519 AAAA...
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: servdir
spec:
  replicas: 1
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: servdir
  template:
    metadata:
      labels:
        app: servdir
      annotations:
        reloader.stakater.com/auto: "true"
    spec:
      containers:
        - name: servdir
          image: ghcr.io/aholbreich/servdir:main
          ports:
            - containerPort: 4321
          env:
            - name: BASIC_AUTH_ENABLED
              value: "true"
          envFrom:
            - configMapRef:
                name: servdir-config
            - secretRef:
                name: servdir-secrets
          startupProbe:
            httpGet:
              path: /health/ready
              port: 4321
            periodSeconds: 5
            failureThreshold: 24
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 4321
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health/live
              port: 4321
            periodSeconds: 30
            failureThreshold: 3
          volumeMounts:
            - name: servdir-data
              mountPath: /data
            - name: git-ssh
              mountPath: /etc/servdir/ssh
              readOnly: true
      volumes:
        - name: servdir-data
          emptyDir: {}
        - name: git-ssh
          secret:
            secretName: servdir-git-ssh
            defaultMode: 0400
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: servdir
spec:
  selector:
    app: servdir
  ports:
    - name: http
      port: 80
      targetPort: 4321
```

## What this setup expects

- `servdir` runs as the default Node server runtime
- catalog files can come from:
  - `LOCAL_CATALOG_PATH`
  - one or more `GIT_SOURCE_<NAME>` variables
- managed Git checkouts are stored in a local cache directory under `./catalog-cache/...`
- Git access is normally over SSH
- the common Kubernetes case uses `emptyDir` for checkout cache

Recommended default:
- keep `replicas: 1` unless you intentionally want multiple pods doing Git sync work

## Configuration reference

### Core settings

```env
CATALOG_TITLE=Service Catalog
LOCAL_CATALOG_PATH=/data/catalog
GIT_SYNC_INTERVAL=1m
```

`GIT_SYNC_INTERVAL` accepts:
- `30s`
- `5m`
- `1h`
- plain numbers, treated as seconds

### Managed Git sources

Preferred format:

```env
GIT_SOURCE_<NAME>=repoUrl|branch[|scanPath1,scanPath2]
```

Examples:

```env
GIT_SOURCE_CATALOG_MAIN=git@bitbucket.org:your-org/service-catalog.git|main|services
GIT_SOURCE_MONOREPO=git@bitbucket.org:your-org/monorepo.git|main
```

Rules:
- `<NAME>` becomes the source name, for example `CATALOG_MAIN` → `catalog-main`
- `branch` is required in the current format
- `scanPaths` are optional
- when `scanPaths` is omitted, servdir scans from the repo root
- checkout paths are derived automatically by the app

### Basic Auth

```env
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=secret
```

Notes:
- Basic Auth realm is fixed to `servdir`
- use HTTPS in front of the app
- store credentials in a Kubernetes `Secret`

### SSH defaults

If these files exist, servdir uses them automatically for Git SSH:
- `/etc/servdir/ssh/id_ed25519`
- `/etc/servdir/ssh/known_hosts`

That means the mounted secret path in the example is the normal happy path.

## Health checks

Servdir exposes two probe-friendly endpoints:
- `/health/live`
- `/health/ready`

These endpoints bypass Basic Auth.

Recommended usage:
- `startupProbe` → `/health/ready`
- `readinessProbe` → `/health/ready`
- `livenessProbe` → `/health/live`

Why:
- `startupProbe` gives the pod time to come up cleanly
- `readinessProbe` prevents traffic before config is valid
- `livenessProbe` restarts only truly unhealthy processes

Important Kubernetes note:
- if credentials are injected as env vars, running pods usually do not see later Secret updates automatically
- servdir now retries config resolution instead of caching a failure forever
- but env-var based setups still usually need a restart or rollout when Secret values change

That is why the example shows a restart-on-secret-change annotation:

```yaml
reloader.stakater.com/auto: "true"
```

Equivalent rollout mechanisms from Helm or Flux are also fine.

## Operational notes

### `emptyDir` vs PVC

Use `emptyDir` when:
- Git is the source of truth
- checkout cache can be rebuilt
- simpler operations matter more than cache persistence

Use a PVC when:
- you want checkout cache to survive pod restarts
- you want to reduce re-cloning after restarts

### Local and Git sources can be mixed

You can combine:
- `LOCAL_CATALOG_PATH`
- `GIT_SOURCE_<NAME>` variables

### Static build mode

Static export is a separate mode.
The Kubernetes example in this document is for the normal server runtime.

## Troubleshooting

### `Encrypted secret placeholder detected in runtime env`

This usually means the pod started before the final Secret value was available.

What to do:
1. confirm the Secret really contains decrypted values
2. make sure the workload rolls when the Secret changes
3. keep the probes configured so bad pods do not receive traffic

### Git source not loading

Check:
- SSH key is valid for the repository
- `known_hosts` is mounted correctly
- repo URL is correct
- scan path matches repo layout
- the pod has writable `/data` storage

### Too many restarts

Common causes:
- probe timings are too aggressive
- Secret rollout timing is slow
- Git SSH access is broken

If your environment is slow to converge, increase `startupProbe.failureThreshold` first.
