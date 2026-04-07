# 8. add an in-process git sync scheduler

Status: Proposed
Status Date: 2026-04-07
Driver: Alexander
Contributors: AI

## Context
Managed Git catalog sources currently sync on the request path. This slows page loads, creates repeated Git traffic, and causes overlapping sync operations.

## Decision
Add a simple in-process scheduler for managed Git source refresh.

For the first version:
- sync configured Git sources on startup
- refresh them periodically in-process
- keep requests read-only against the local checkout state
- lock sync per source to avoid overlapping clone/pull operations
- keep sync state in memory

## Consequences
- request latency improves because page rendering no longer performs Git sync work
- Git traffic becomes more predictable
- sync remains simple and local to the application process
- multiple replicas will still sync independently

## Options considered

### Option 1: in-process scheduler
Pros:
- simple
- fits current architecture
- no external system required

Cons:
- each replica schedules its own syncs
- runtime sync state is in-memory only

### Option 2: sync on request path
Pros:
- easy first cut

Cons:
- slow requests
- race conditions
- poor operator experience

### Option 3: external worker or distributed scheduler
Pros:
- stronger long-term control

Cons:
- too much complexity for the current stage

## Advices
* To myself: Keep sync boring and predictable. Read requests should not pull Git.
