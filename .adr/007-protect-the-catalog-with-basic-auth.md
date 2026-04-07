# 7. protect the catalog with basic auth

Status: Proposed
Status Date: 2026-04-07
Driver: Alexander
Contributors: AI

## Context
The service catalog should have a possbility to be shielded from public visibility. The first goal is simple access protection for internal use without introducing SSO or external auth infrastructure.

## Decision
Protect the application with HTTP Basic Auth.

For the first version:
- auth is enabled through config
- username and password come from environment variables
- all routes are protected
- the Basic Auth realm is fixed to `servdir`

## Consequences
- simple to operate in local, container, and k8s environments
- no login UI or session management is required
- only suitable behind HTTPS and for simple internal protection
- not a replacement for future SSO or role-based access control

## Options considered

### Option 1: app-level Basic Auth
Pros:
- simple
- fast to implement
- easy to deploy

Cons:
- coarse-grained access control
- not user-aware
- not ideal as a long-term enterprise auth solution


### Option 3: full app-level SSO
Pros:
- strongest long-term direction

Cons:
- too much complexity for the current stage

## Advices
* To myself: Keep this as a pragmatic first layer, not the final auth story.
* In production szenario use reverse proxy or ingress auth. Allways use https.

