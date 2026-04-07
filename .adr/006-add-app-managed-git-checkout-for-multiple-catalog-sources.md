# 6. add app-managed git checkout for multiple catalog sources

Status: Proposed
Status Date: 2026-04-07
Driver: Alexander
Contributors: AI

## Context
Local catalog files are already supported and should stay supported.

The next step is to allow the app to load service definitions from several remote Git repositories without manual checkout steps. 
The source of truth remains Markdown service definitions in Git, but we would get more flexibility where it actualy live

## Decision
Add an app-managed Git checkout/pull source adapter.

- keep local filesystem sources working
- support several configured Git repositories
- clone missing repositories into a writable local cache path
- pull updates on startup
- scan configured subpaths in each checkout for service definitions
- prefer repository Access Key based checkout over provider API tokens

## Consequences
- The app can mix local and remote catalog sources.
- Bitbucket, GitHub, and GitLab can be supported through Git instead of provider-specific listing APIs. 
- Production now requires writable local storage for checkout state.
- Sync behavior stays separate from the catalog core.

## Options considered

### Option 1: app-managed git checkout/pull
Pros:
- provider-agnostic and robust
- avoids provider API auth complexity
- supports multiple repositories cleanly

Cons:
- requires writable storage
- introduces local runtime state
- requires Git credentials handling

### Option 2: manual checkout only
Pros:
- simplest implementation
- no sync logic in the app

Cons:
- not suitable for zero-touch k8s deployment
- operationally awkward

### Option 3: provider API scanning
Pros:
- no local Git checkout needed

Cons:
- provider-specific complexity
- auth is harder and less portable
- scales poorly across providers

## Advices
* To myself: Keep Git sync boring. Clone, pull, scan. Do not turn this into a generic integration platform.
