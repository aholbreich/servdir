# Kubernetes Deployment Guide

## Table of Contents
- [Runtime model](#runtime-model)
- [Recommended storage model](#recommended-storage-model)
- [Requirements](#requirements)
- [Default SSH behavior](#default-ssh-behavior)
- [Configuration reference](#configuration-reference)
  - [Core settings](#core-settings)
  - [Basic Auth settings](#basic-auth-settings)
  - [Managed Git settings](#managed-git-settings)
- [Service definition format](#service-definition-format)
- [Recommended repository layout](#recommended-repository-layout)
- [SSH Access Key setup](#ssh-access-key-setup)
- [Logging and failure behavior](#logging-and-failure-behavior)
- [Example ConfigMap](#example-configmap)
- [Example Secret](#example-secret)
- [Example Deployment with `emptyDir` (recommended)](#example-deployment-with-emptydir-recommended)
- [Optional PVC variant](#optional-pvc-variant)
- [Common mistakes](#common-mistakes)
- [Example Service](#example-service)
- [Operational notes](#operational-notes)
- [Advanced SSH override](#advanced-ssh-override)
- [Local testing with the same model](#local-testing-with-the-same-model)

This guide describes how to run `servdir` in Kubernetes with:
- local catalog files
- managed Git catalog sources
- optional Basic Auth protection
- SSH Access Key based Git access

## Runtime model
`servdir` can load service definitions from two kinds of sources:

1. **Local catalog path** via `LOCAL_CATALOG_PATH`
2. **Managed Git sources** via `GIT_SOURCE_<NAME>` variables

At startup the app:
- scans local catalog files from `LOCAL_CATALOG_PATH` when configured
- syncs configured Git repositories into local checkout paths
- scans configured subpaths in those checkouts
- merges and validates all discovered service definitions into an in-memory snapshot

After startup, managed Git sources are refreshed periodically by an in-process scheduler.
Requests read from the in-memory catalog snapshot and do not perform Git sync work.
If a refresh fails later, servdir keeps serving the last known good snapshot and marks the snapshot state as stale.

If Basic Auth is enabled, all application routes are protected with HTTP Basic Auth.

## Recommended storage model
For the first deployment, prefer **`emptyDir`** as the default.

Why:
- Git is the source of truth
- checkout data is rebuildable cache
- deployment is simpler
- no StorageClass dependency is required

Use a PersistentVolumeClaim only if you specifically want the git checkout cache to survive pod restarts.

## Requirements

For managed Git sources in Kubernetes, you need:
- writable storage for checkout state, usually `emptyDir`
- `git` and `openssh-client` in the container image
- an SSH private key mounted from a Secret
- `known_hosts` mounted from a Secret or ConfigMap
- repository URLs in SSH form, for example:
  - `git@bitbucket.org:your-org/service-catalog.git`

## Default SSH behavior
By default, `servdir` will make Git use these paths if they exist:

- private key: `/etc/servdir/ssh/id_ed25519`
- known_hosts: `/etc/servdir/ssh/known_hosts`

That means you usually do **not** need to set `GIT_SSH_COMMAND` yourself.

`servdir` points Git SSH at the mounted key path and `known_hosts` file if present, but does not force `IdentitiesOnly=yes`.

`GIT_SSH_COMMAND` is only needed as an advanced override when you want custom SSH behavior.

## Configuration reference

### Core settings

#### `CATALOG_TITLE`
Optional catalog title shown in the UI.

Default:
```env
CATALOG_TITLE=Service Catalog
```

#### `LOCAL_CATALOG_PATH`
Optional local filesystem catalog root.

Example:
```env
LOCAL_CATALOG_PATH=./catalog
```

Expected structure:
```text
<catalog-path>/services/<service-id>/service.md
```

### Basic Auth settings

#### `BASIC_AUTH_ENABLED`
Enable HTTP Basic Auth protection.

Example:
```env
BASIC_AUTH_ENABLED=true
```

#### `BASIC_AUTH_USERNAME`
Basic Auth username.

#### `BASIC_AUTH_PASSWORD`
Basic Auth password.

Notes:
- the Basic Auth realm is fixed to `servdir`
- use Kubernetes Secret values for credentials
- use HTTPS in front of the application

### Managed Git settings

#### `GIT_SYNC_INTERVAL`

Managed Git refresh interval. Accepts a duration string with `s`, `m`, or `h` suffix, or a plain number treated as seconds.

Default:
```env
GIT_SYNC_INTERVAL=1m
```

#### `GIT_SOURCE_<NAME>`
One variable per managed Git repository. The variable name suffix becomes the source name (`CATALOG_MAIN` → `catalog-main`).

Format: `repoUrl|branch[|scanPath1,scanPath2]`

- `repoUrl`: Git clone URL
- `branch`: branch to track
- `scanPaths`: comma-separated relative paths to scan for `*/service.md` — omit to scan the entire repo root

The checkout path is always derived automatically:

```text
./catalog-cache/<sanitized-source-name>-<n>
```

Example:
```env
GIT_SOURCE_CATALOG_MAIN=git@bitbucket.org:your-org/service-catalog.git|main|services
```

Example with multiple repositories:
```env
GIT_SOURCE_CATALOG_MAIN=git@bitbucket.org:your-org/service-catalog.git|main|services
GIT_SOURCE_CATALOG_PAYMENTS=git@bitbucket.org:your-org/service-catalog-payments.git|main|services,platform/services
GIT_SOURCE_MONOREPO=git@bitbucket.org:your-org/monorepo.git|main
```

#### `GIT_SSH_COMMAND`
Optional advanced override for Git SSH behavior.

In the common case, do not set this.

Use it only if you need custom SSH options or non-standard key locations.

## Service definition format
`service.md` is a Markdown file with YAML front matter plus a Markdown body.

For the full front matter field reference and discovery rules, see:
- `docs/service-definition.md`

## Recommended repository layout

For each scan path, `servdir` currently scans:

```text
<scanPath>/*/service.md
```

Example repository:

```text
services/
  billing-api/
    service.md
  auth-api/
    service.md
```

If you configure:

```json
"scanPaths": ["services"]
```

then matching files are:

```text
services/billing-api/service.md
services/auth-api/service.md
```

## SSH Access Key setup

### 1. Create a repository access key
In Bitbucket, create an **Access Key** for the repository you want the app to clone.

Use the private key in Kubernetes.

### 2. Create Kubernetes Secret for SSH key
Example:

```bash
kubectl create secret generic servdir-git-ssh \
  --from-file=id_ed25519=./id_ed25519 \
  --from-file=known_hosts=./known_hosts
```

`known_hosts` can be prepared with something like:

```bash
ssh-keyscan bitbucket.org > known_hosts
```

Review the fingerprint before using it.

### 3. Mount the SSH files at the default paths
Mount the Secret at:
- `/etc/servdir/ssh/id_ed25519`
- `/etc/servdir/ssh/known_hosts`

If you follow those paths, no extra SSH config is needed.

## Logging and failure behavior
Managed Git sync logs should now show:
- scheduler startup
- startup sync cycle start and finish
- interval sync cycle start and finish
- per-source sync start, success, or failure with duration
- scan counts for each source

If a source has no valid checkout yet, the app skips scanning that source until the scheduler has created one.

## Example ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: servdir-config
data:
  LOCAL_CATALOG_PATH: "/data/catalog"
  GIT_SOURCE_CATALOG_MAIN: "git@bitbucket.org:your-org/service-catalog.git|main|services"
```

## Example Secret

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

### Example SSH Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: servdir-git-ssh
stringData:
  id_ed25519: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    REPLACE_ME
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    bitbucket.org ssh-ed25519 AAAA...
```

For real deployments, generate these Secrets from files or secret tooling instead of storing credentials in Git.

## Example Deployment with `emptyDir` (recommended)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: servdir
spec:
  replicas: 1 # Adjust replicas to your liking
  progressDeadlineSeconds: 120 # Should be fine for this tiny service
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: servdir
  template:
    metadata:
      labels:
        app: servdir
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

## Optional PVC variant
Use a PVC only if you want the checkout cache to survive pod restarts.

## Common mistakes
- wrong repository slug in `repoUrl`
- SSH key attached to the wrong Bitbucket repository
- missing or invalid `known_hosts`
- read-only volume mounted at `checkoutPath`
- multiple replicas causing more Git traffic than expected
- setting the sync interval too low and hammering the remote Git host

Example PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: servdir-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp2
  resources:
    requests:
      storage: 100Mi
```

Then replace the `emptyDir` volume in the Deployment with:

```yaml
volumes:
  - name: servdir-data
    persistentVolumeClaim:
      claimName: servdir-data
  - name: git-ssh
    secret:
      secretName: servdir-git-ssh
      defaultMode: 0400
```

## Example Service

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

## Operational notes

### `emptyDir` vs PVC
Use `emptyDir` when:
- cache can be rebuilt on restart
- simpler deployment matters more than cache persistence
- you do not want to depend on StorageClass setup

Use a PVC when:
- you want checkout state to survive pod restarts
- you want to reduce re-cloning
- you accept storage provisioning complexity

### Local and Git sources can be mixed
You can use both:
- local mounted catalog files in `LOCAL_CATALOG_PATH`
- remote Git-backed catalog repositories via `GIT_SOURCE_<NAME>` variables

This is useful for:
- bootstrapping
- mixing static local content with shared remote catalog repositories
- gradual migration from local-only to managed Git sources

### Performance note
Current implementation keeps an in-memory catalog snapshot and refreshes it after managed Git sync cycles. Requests do not pull or rescan sources on every page render.
If later scale or observability needs grow, extend the explicit cache subsystem rather than pushing sync work back onto the request path.

### Security note
Prefer repository-scoped access keys over personal credentials when possible. Basic Auth should be used only behind HTTPS.

## Advanced SSH override
If you need non-standard SSH behavior, you can still set:

```env
GIT_SSH_COMMAND=ssh -i /custom/path/key -o IdentitiesOnly=yes -o UserKnownHostsFile=/custom/path/known_hosts
```

But this should be the exception, not the default.

## Local testing with the same model
You can test the same configuration outside Kubernetes by setting:

```env
LOCAL_CATALOG_PATH=./catalog
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=secret
GIT_SOURCE_CATALOG_MAIN=git@bitbucket.org:your-org/service-catalog.git|main|services
```

This will default the checkout cache to a local path such as:

```text
./catalog-cache/catalog-main-1
```

If you use the default key path on your machine instead, set a custom `GIT_SSH_COMMAND` explicitly.

Then run:

```bash
pnpm dev
```
