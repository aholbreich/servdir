# Kubernetes Deployment Guide

This guide describes how to run `servdir` in Kubernetes with:
- local catalog files
- managed Git catalog sources
- optional Basic Auth protection
- SSH Access Key based Git access

## Runtime model
`servdir` can load service definitions from two kinds of sources:

1. **Local catalog path** via `CATALOG_PATH`
2. **Managed Git sources** via `GIT_SOURCES`

At startup the app:
- scans local catalog files from `CATALOG_PATH`
- clones or pulls configured Git repositories
- scans configured subpaths in those checkouts
- merges and validates all discovered service definitions

If Basic Auth is enabled, all application routes are protected with HTTP Basic Auth.

## Requirements

For managed Git sources in Kubernetes, you need:
- a writable volume for checkout state
- `git` and `openssh-client` in the container image
- an SSH private key mounted from a Secret
- `known_hosts` mounted from a Secret or ConfigMap
- repository URLs in SSH form, for example:
  - `git@bitbucket.org:your-org/service-catalog.git`

## Configuration reference

### Core settings

#### `CATALOG_PATH`
Local filesystem catalog root.

Default:
```env
CATALOG_PATH=./catalog
```

Expected structure:
```text
<catalog-path>/services/<service-id>/service.md
```

#### `HOST`
HTTP bind host.

Default:
```env
HOST=0.0.0.0
```

#### `PORT`
HTTP listen port.

Default:
```env
PORT=4321
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

#### `GIT_SOURCES`
JSON array describing managed Git repositories.

Example:
```env
GIT_SOURCES=[{"name":"catalog-main","repoUrl":"git@bitbucket.org:your-org/service-catalog.git","branch":"main","checkoutPath":"/data/catalog-cache/catalog-main","scanPaths":["services"]}]
```

Each entry supports:

- `name`: human-readable source name
- `repoUrl`: Git clone URL
- `branch`: branch to checkout and pull
- `checkoutPath`: writable local checkout path inside the container
- `scanPaths`: array of relative paths to scan for `*/service.md`

Example with multiple repositories:

```env
GIT_SOURCES=[
  {
    "name":"catalog-main",
    "repoUrl":"git@bitbucket.org:your-org/service-catalog.git",
    "branch":"main",
    "checkoutPath":"/data/catalog-cache/catalog-main",
    "scanPaths":["services"]
  },
  {
    "name":"catalog-payments",
    "repoUrl":"git@bitbucket.org:your-org/service-catalog-payments.git",
    "branch":"main",
    "checkoutPath":"/data/catalog-cache/catalog-payments",
    "scanPaths":["services", "platform/services"]
  }
]
```

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

### 3. Configure Git SSH command
Use `GIT_SSH_COMMAND` so Git uses the mounted key and known_hosts file.

Example:

```env
GIT_SSH_COMMAND=ssh -i /etc/servdir/ssh/id_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/servdir/ssh/known_hosts
```

## Example ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: servdir-config
data:
  HOST: "0.0.0.0"
  PORT: "4321"
  CATALOG_PATH: "/data/catalog"
  GIT_SOURCES: >-
    [{"name":"catalog-main","repoUrl":"git@bitbucket.org:your-org/service-catalog.git","branch":"main","checkoutPath":"/data/catalog-cache/catalog-main","scanPaths":["services"]}]
  GIT_SSH_COMMAND: >-
    ssh -i /etc/servdir/ssh/id_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/servdir/ssh/known_hosts
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

## Example PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: servdir-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

## Example Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: servdir
spec:
  replicas: 1
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

### Writable storage is required
Managed Git sources need writable storage for checkout state.

Typical layout:
- local catalog path: `/data/catalog`
- managed git cache: `/data/catalog-cache/...`

### Local and Git sources can be mixed
You can use both:
- local mounted catalog files in `CATALOG_PATH`
- remote Git-backed catalog repositories in `GIT_SOURCES`

This is useful for:
- bootstrapping
- mixing static local content with shared remote catalog repositories
- gradual migration from local-only to managed Git sources

### Performance note
Current implementation pulls managed Git sources on startup/request path. This is fine for the first implementation, but it can slow page loads. If that becomes a problem, add a sync TTL or separate refresh loop later instead of pulling on every request.

### Security note
Prefer repository-scoped access keys over personal credentials when possible. Basic Auth should be used only behind HTTPS.

## Local testing with the same model
You can test the same configuration outside Kubernetes by setting:

```env
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=secret
GIT_SOURCES=[{"name":"catalog-main","repoUrl":"git@bitbucket.org:your-org/service-catalog.git","branch":"main","checkoutPath":"./.cache/catalog-main","scanPaths":["services"]}]
GIT_SSH_COMMAND=ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes
```

Then run:

```bash
pnpm dev
```
